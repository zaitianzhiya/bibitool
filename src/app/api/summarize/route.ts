// Summarize API route — SSE streaming endpoint
// POST /api/summarize
// Body: { url: string, mode: "brief" | "detailed" }
// Response: text/event-stream (ReadableStream SSE)
//
// Pipeline: URL → resolveVideo → check cache → summarizeStream → SSE → cache result

import { NextRequest, NextResponse } from "next/server"
import { resolveVideo } from "@/lib/platforms"
import { summarizeStream } from "@/lib/ai/summarize"
import { cache } from "@/lib/cache"
import { routeModel } from "@/lib/ai/router"
import { anyApiKeyAvailable } from "@/lib/api-keys"
import { auth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
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

    // Resolve video (fetch info + subtitles — cached by Phase 2)
    const videoInfo = await resolveVideo(url)

    if (!videoInfo.subtitles || videoInfo.subtitles.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "NO_SUBTITLES",
            message:
              "该视频没有可用的字幕，无法生成总结。建议使用弹幕模式或等待 Phase 3 Whisper 集成。",
          },
        },
        { status: 400 }
      )
    }

    // Determine model
    const { model } = routeModel(mode as "brief" | "detailed")

    // Check summary cache
    const cachedSummary = await cache.getSummary(
      videoInfo.platform,
      videoInfo.videoId,
      mode,
      model
    )

    if (cachedSummary) {
      // Return cached summary as SSE stream (single chunk)
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
            model,
          })) {
            fullText += chunk
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
          }

          // Send completion signal
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))

          // Cache the full summary for future requests
          cache
            .setSummary(
              videoInfo.platform,
              videoInfo.videoId,
              mode,
              model,
              fullText
            )
            .catch((err) => console.warn("Failed to cache summary:", err))

          controller.close()
        } catch (err) {
          console.error("Summary generation error:", err)
          const msg =
            err instanceof Error ? err.message : "AI 总结生成失败"
          controller.enqueue(
            encoder.encode(
              `data: {"error":"${msg.replace(/"/g, '\\"')}"}\n\n`
            )
          )
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
    const message =
      err instanceof Error ? err.message : "AI 总结生成失败，请稍后重试"

    return NextResponse.json(
      { error: { code: "SUMMARIZE_FAILED", message } },
      { status: 500 }
    )
  }
}
