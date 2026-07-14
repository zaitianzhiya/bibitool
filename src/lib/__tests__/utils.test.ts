// Tests for src/lib/utils.ts
import { describe, it, expect } from "vitest"
import {
  formatTime,
  estimateTokens,
  extractBilibiliVideoId,
  extractYouTubeVideoId,
  sleep,
} from "../utils"

describe("formatTime", () => {
  it("formats seconds as MM:SS", () => {
    expect(formatTime(0)).toBe("00:00")
    expect(formatTime(65)).toBe("01:05")
    expect(formatTime(599)).toBe("09:59")
  })

  it("formats hours when >= 3600s", () => {
    expect(formatTime(3600)).toBe("01:00:00")
    expect(formatTime(3661)).toBe("01:01:01")
    expect(formatTime(7200 + 120 + 5)).toBe("02:02:05")
  })
})

describe("estimateTokens", () => {
  it("estimates English text at 4 chars per token", () => {
    const tokens = estimateTokens("Hello world")
    expect(tokens).toBeGreaterThan(0)
    expect(tokens).toBeLessThanOrEqual(6)
  })

  it("estimates Chinese text at 2 chars per token", () => {
    const tokens = estimateTokens("你好世界测试")
    // 5 Chinese chars → 5/2 = 2.5 → ceil = 3
    expect(tokens).toBe(3)
  })

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0)
  })
})

describe("extractBilibiliVideoId", () => {
  it("extracts BV号 from standard URL", () => {
    expect(
      extractBilibiliVideoId(
        "https://www.bilibili.com/video/BV1GJ411x7h7"
      )
    ).toBe("BV1GJ411x7h7")
  })

  it("extracts AV号", () => {
    expect(
      extractBilibiliVideoId(
        "https://www.bilibili.com/video/av50555234"
      )
    ).toBe("av50555234")
  })

  it("returns null for b23.tv short links (needs resolution)", () => {
    expect(
      extractBilibiliVideoId("https://b23.tv/abc123")
    ).toBeNull()
  })

  it("returns null for non-B站 URLs", () => {
    expect(
      extractBilibiliVideoId("https://youtube.com/watch?v=abc")
    ).toBeNull()
  })
})

describe("extractYouTubeVideoId", () => {
  it("extracts from standard watch URL", () => {
    expect(
      extractYouTubeVideoId(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      )
    ).toBe("dQw4w9WgXcQ")
  })

  it("extracts from short URL", () => {
    expect(
      extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")
    ).toBe("dQw4w9WgXcQ")
  })

  it("extracts from embed URL", () => {
    expect(
      extractYouTubeVideoId(
        "https://www.youtube.com/embed/dQw4w9WgXcQ"
      )
    ).toBe("dQw4w9WgXcQ")
  })

  it("returns null for invalid URLs", () => {
    expect(
      extractYouTubeVideoId("https://example.com")
    ).toBeNull()
  })

  it("handles additional query params", () => {
    expect(
      extractYouTubeVideoId(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30"
      )
    ).toBe("dQw4w9WgXcQ")
  })
})

describe("sleep", () => {
  it("resolves after the given time", async () => {
    const start = Date.now()
    await sleep(50)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(40)
  })
})
