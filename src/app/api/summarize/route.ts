// Summarize API route — SSE streaming endpoint
// POST /api/summarize
// Body: { url: string, mode: "brief" | "detailed" }
// Response: text/event-stream (ReadableStream SSE)
//
// Pipeline: URL → rate limit → quota → resolveVideo → check cache → summarizeStream → SSE → cache result

import { NextRequest, NextResponse } from "next/server"
import { resolveVideo } from "@/lib/platforms"
import { summarizeStream } from "@/lib/ai/summarize"
import { cache } from "@/lib/cache"
import { anyApiKeyAvailable, resolveApiKey } from "@/lib/api-keys"
import { auth } from "@/lib/auth"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { checkQuota, consumeQuota } from "@/lib/quota"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    // Rate limiting — per-user if authenticated, per-IP otherwise
    const rateLimit = await checkRateLimit(session?.user?.id, getClientIp(request))
    if (rateLimit) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `请求过于频繁，请 ${rateLimit.retryAfter} 秒后重试`,
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfter) },
        }
      )
    }

    const body = await request.json()
    const { url, mode = "brief" } = body

    // Validate inputs
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "请提供视频 URL" } },
        { status: 400 }
      )
    }

    if (!["brief", "detailed"].includes(mode)) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_MODE",
            message: "总结模式必须是 'brief' 或 'detailed'",
          },
        },
        { status: 400 }
      )
    }

    // Quota check for authenticated users
    if (session?.user?.id) {
      const quota = await checkQuota(session.user.id)
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: {
              code: "QUOTA_EXCEEDED",
              message: "额度已用完，请等待下月重置或升级套餐",
            },
          },
          { status: 402 }
        )
      }
    }

    // Check for AI API key (user key or env var) — any provider counts
    const hasKey = await anyApiKeyAvailable(session?.user?.id)
    if (!hasKey) {
      return NextResponse.json(
        {
          error: {
            code: "NO_API_KEY",
            message:
              "未配置 AI API Key。请在用户面板中配置 OpenAI 或 DeepSeek 或 Anthropic API Key。",
          },
        },
        { status: 402 }
      )
    }

    // Inject user's stored keys and determine active provider
    let activeProvider: "openai" | "deepseek" = "openai"
    if (session?.user?.id) {
      const providers = ["openai", "deepseek", "anthropic"] as const
      const envMap = { openai: "OPENAI_API_KEY", deepseek: "DEEPSEEK_API_KEY", anthropic: "ANTHROPIC_API_KEY" }
      for (const p of providers) {
        const key = await resolveApiKey(session.user.id, p)
        if (key) {
          process.env[envMap[p]] = key
          if (p === "deepseek") activeProvider = "deepseek"
          else if (p === "openai" && activeProvider !== "deepseek") activeProvider = "openai"
        }
      }
    }

    const model = activeProvider === "deepseek" ? "deepseek-chat" : "gpt-4o-mini"

    // Build model descriptor for summarizeStream (provider + model ID)
    const modelDescriptor = activeProvider === "deepseek"
      ? { provider: "deepseek" as const, modelId: "deepseek-chat" }
      : { provider: "openai" as const, modelId: "gpt-4o-mini" }

    // Resolve video (fetch info + subtitles — cached by Phase 2)
    const videoInfo = await resolveVideo(url)

    if (!videoInfo.subtitles || videoInfo.subtitles.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "NO_SUBTITLES",
            message: "该视频没有可用的字幕，无法生成总结。",
          },
        },
        { status: 400 }
      )
    }

    // Check summary cache
    const cachedSummary = await cache.getSummary(
      videoInfo.platform, videoInfo.videoId, mode, modelDescriptor.modelId
    )

    if (cachedSummary) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${cachedSummary}\n\n`))
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        },
      })
      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Subtitle-Source": "cache",
        },
      })
    }

    // Generate streaming summary
    const encoder = new TextEncoder()
    let fullText = ""

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of summarizeStream({
            subtitles: videoInfo.subtitles!,
            mode: mode as "brief" | "detailed",
            provider: modelDescriptor.provider,
            model: modelDescriptor.modelId,
          })) {
            fullText += chunk
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))

          // Cache the full summary
          cache
            .setSummary(videoInfo.platform, videoInfo.videoId, mode, modelDescriptor.modelId, fullText)
            .catch((err) => console.warn("Failed to cache summary:", err))

          // Deduct quota after successful generation
          if (session?.user?.id) {
            consumeQuota(session.user.id, videoInfo.duration)
              .catch((err) => console.warn("Failed to deduct quota:", err))
          }

          controller.close()
        } catch (err) {
          console.error("Summary generation error:", err)
          const msg = err instanceof Error ? err.message : "AI 总结生成失败"
          controller.enqueue(encoder.encode(`data: {"error":"${msg.replace(/"/g, '\\"')}"}\n\n`))
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Subtitle-Source": "generated",
      },
    })
  } catch (err) {
    console.error("Summarize API error:", err)
    const message = err instanceof Error ? err.message : "AI 总结生成失败，请稍后重试"
    return NextResponse.json(
      { error: { code: "SUMMARIZE_FAILED", message } },
      { status: 500 }
    )
  }
}
