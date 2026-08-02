// Subtitle extraction API route
// POST /api/subtitle
// Body: { url: string }
// Response: VideoInfo with subtitles

import { NextRequest, NextResponse } from "next/server"
import { resolveVideo } from "@/lib/platforms"
import { auth } from "@/lib/auth"
import { resolveApiKey } from "@/lib/api-keys"
import { getSubtitleStats } from "@/lib/subtitle-normalizer"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const session = await auth()
    const ip = getClientIp(request)
    const rateLimit = await checkRateLimit(session?.user?.id, ip)
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
    const { url } = body

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Please provide a video URL." } },
        { status: 400 }
      )
    }

    // Basic URL validation
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_URL",
            message: "Please enter a valid URL (e.g., https://www.bilibili.com/video/BV1xx411c7mD).",
          },
        },
        { status: 400 }
      )
    }

    // Resolve video (platform detection, subtitle extraction, cache)
    // If user has stored OpenAI API key, make it available for Whisper
    const storedKey = await resolveApiKey(session?.user?.id, "openai")
    if (storedKey) process.env.OPENAI_API_KEY = storedKey

    const videoInfo = await resolveVideo(parsed.href)

    const stats = videoInfo.subtitles
      ? getSubtitleStats(videoInfo.subtitles)
      : { lineCount: 0, totalDuration: 0, language: "unknown" }

    return NextResponse.json({
      videoInfo,
      stats,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred"

    // Determine status code based on error type
    let status = 500
    if (message.includes("Unsupported URL") || message.includes("Could not extract")) {
      status = 400
    } else if (message.includes("not yet supported")) {
      status = 501
    }

    console.error("Subtitle API error:", message)

    return NextResponse.json(
      {
        error: {
          code: "EXTRACTION_FAILED",
          message,
        },
      },
      { status }
    )
  }
}
