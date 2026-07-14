// OG Image generation API route
// GET /api/og?title=...&platform=...&duration=...
// Returns a 1200×630 PNG share card image

import { NextRequest } from "next/server"
import { ImageResponse } from "next/og"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get("title") || "BibiTool AI Video Summary"
  const platform = searchParams.get("platform") || ""
  const duration = searchParams.get("duration") || ""

  const platformLabel =
    platform === "bilibili"
      ? "B站"
      : platform === "youtube"
        ? "YouTube"
        : platform

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
          padding: 80,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top row: logo + platform badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <span style={{ fontSize: 40 }}>🎬</span>
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            BibiTool
          </span>
          {platformLabel && (
            <span
              style={{
                fontSize: 22,
                color: "#a1a1aa",
                border: "2px solid #3f3f46",
                borderRadius: 12,
                padding: "4px 16px",
              }}
            >
              {platformLabel}
            </span>
          )}
        </div>

        {/* Center: title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 20,
              color: "#71717a",
              fontWeight: 500,
            }}
          >
            AI 视频内容总结
          </span>
          <span
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.2,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 1100,
            }}
          >
            {title}
          </span>
          {duration && (
            <span
              style={{
                fontSize: 18,
                color: "#a1a1aa",
                marginTop: 8,
              }}
            >
              ⏱ {duration}
            </span>
          )}
        </div>

        {/* Bottom: gradient decoration */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <span style={{ fontSize: 18, color: "#52525b" }}>
            bibitool.vercel.app
          </span>
          <div
            style={{
              width: 120,
              height: 6,
              borderRadius: 3,
              backgroundImage:
                "linear-gradient(90deg, #2563eb, #9333ea)",
            }}
          />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
