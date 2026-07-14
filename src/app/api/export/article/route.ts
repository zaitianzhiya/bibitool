// Article rewrite API route
// POST /api/export/article
// Body: { url: string }
// Response: { article: string }

import { NextRequest, NextResponse } from "next/server"
import { resolveVideo } from "@/lib/platforms"
import { rewriteAsArticle } from "@/lib/ai/rewrite"
import { anyApiKeyAvailable } from "@/lib/api-keys"
import { auth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()
    const { url, summary = "" } = body

    if (!url) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "请提供视频 URL" } },
        { status: 400 }
      )
    }

    const hasKey = await anyApiKeyAvailable(session?.user?.id)
    if (!hasKey) {
      return NextResponse.json(
        {
          error: {
            code: "NO_API_KEY",
            message: "未配置 AI API Key。请在用户面板中配置。",
          },
        },
        { status: 402 }
      )
    }

    // Get subtitles from Phase 2 pipeline
    const videoInfo = await resolveVideo(url)

    if (!videoInfo.subtitles || videoInfo.subtitles.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "NO_SUBTITLES",
            message: "该视频没有可用的字幕",
          },
        },
        { status: 400 }
      )
    }

    // Build subtitle text
    const subtitleText = videoInfo.subtitles
      .map((s) => s.text)
      .join("\n")

    const article = await rewriteAsArticle(subtitleText, summary)

    return NextResponse.json({ article })
  } catch (err) {
    console.error("Article rewrite error:", err)
    return NextResponse.json(
      {
        error: {
          code: "REWRITE_FAILED",
          message: err instanceof Error ? err.message : "文章生成失败",
        },
      },
      { status: 500 }
    )
  }
}
