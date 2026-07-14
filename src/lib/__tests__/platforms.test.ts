// Tests for platform detection and video ID extraction
import { describe, it, expect } from "vitest"
import { detectPlatform, extractVideoId } from "../platforms"

describe("detectPlatform", () => {
  it("detects B站 URLs", () => {
    expect(
      detectPlatform("https://www.bilibili.com/video/BV1234567890")
    ).toBe("bilibili")
    expect(
      detectPlatform("https://b23.tv/abc123")
    ).toBe("bilibili")
    expect(
      detectPlatform("https://space.bilibili.com/123/video")
    ).toBe("bilibili")
  })

  it("detects YouTube URLs", () => {
    expect(
      detectPlatform(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      )
    ).toBe("youtube")
    expect(
      detectPlatform("https://youtu.be/dQw4w9WgXcQ")
    ).toBe("youtube")
  })

  it("detects local file paths", () => {
    expect(detectPlatform("C:\\Users\\test\\video.mp4")).toBe(
      "local"
    )
    expect(detectPlatform("file:///tmp/video.mp4")).toBe("local")
  })

  it("returns null for unsupported URLs", () => {
    expect(detectPlatform("https://example.com")).toBeNull()
    expect(detectPlatform("")).toBeNull()
    expect(detectPlatform("not-a-url")).toBeNull()
  })
})

describe("extractVideoId", () => {
  it("extracts B站 BV号", () => {
    const id = extractVideoId(
      "https://www.bilibili.com/video/BV1GJ411x7h7",
      "bilibili"
    )
    expect(id).toBe("BV1GJ411x7h7")
  })

  it("extracts B站 AV号", () => {
    const id = extractVideoId(
      "https://www.bilibili.com/video/av123456",
      "bilibili"
    )
    expect(id).toBe("av123456")
  })

  it("extracts YouTube ID", () => {
    const id = extractVideoId(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "youtube"
    )
    expect(id).toBe("dQw4w9WgXcQ")
  })

  it("returns path for local files", () => {
    const id = extractVideoId("/tmp/video.mp4", "local")
    expect(id).toBe("/tmp/video.mp4")
  })

  it("returns null for unknown platform", () => {
    expect(
      extractVideoId("https://example.com", "unknown" as never)
    ).toBeNull()
  })
})
