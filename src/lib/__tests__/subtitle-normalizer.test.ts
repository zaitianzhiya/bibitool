// Tests for src/lib/subtitle-normalizer.ts
import { describe, it, expect } from "vitest"
import {
  normalizeSubtitles,
  detectSubtitleLanguage,
  getSubtitleStats,
} from "../subtitle-normalizer"

describe("normalizeSubtitles", () => {
  it("returns empty array for empty input", () => {
    expect(normalizeSubtitles([])).toEqual([])
  })

  it("sorts by start time", () => {
    const input = [
      { start: 10, end: 15, text: "second" },
      { start: 0, end: 5, text: "first" },
    ]
    const result = normalizeSubtitles(input)
    expect(result[0].text).toBe("first")
    expect(result[1].text).toBe("second")
  })

  it("removes HTML tags", () => {
    const input = [
      {
        start: 0,
        end: 5,
        text: "<b>Hello</b> <i>world</i>",
      },
    ]
    const result = normalizeSubtitles(input)
    expect(result[0].text).toBe("Hello world")
  })

  it("decodes HTML entities", () => {
    const input = [
      {
        start: 0,
        end: 5,
        text: "A &amp; B &lt; C &gt; D",
      },
    ]
    const result = normalizeSubtitles(input)
    expect(result[0].text).toBe("A & B < C > D")
  })

  it("merges adjacent lines", () => {
    const input = [
      { start: 0, end: 2, text: "Hello" },
      { start: 1.9, end: 4, text: "world" },
    ]
    const result = normalizeSubtitles(input)
    expect(result.length).toBe(1)
    expect(result[0].text).toBe("Hello world")
  })

  it("filters empty text items", () => {
    const input = [
      { start: 0, end: 2, text: "" },
      { start: 2, end: 4, text: "  " },
      { start: 4, end: 6, text: "real" },
    ]
    const result = normalizeSubtitles(input)
    expect(result.length).toBe(1)
    expect(result[0].text).toBe("real")
  })

  it("clamps negative start times to 0", () => {
    const input = [{ start: -5, end: 5, text: "test" }]
    const result = normalizeSubtitles(input)
    expect(result[0].start).toBe(0)
  })

  it("ensures end > start (min 0.1s gap)", () => {
    const input = [{ start: 5, end: 5, text: "test" }]
    const result = normalizeSubtitles(input)
    expect(result[0].end).toBe(5.1)
  })
})

describe("detectSubtitleLanguage", () => {
  it("returns zh for Chinese-dominant text", () => {
    const items = [
      { start: 0, end: 2, text: "这是一段中文测试文本" },
      { start: 2, end: 4, text: "你好世界" },
    ]
    expect(detectSubtitleLanguage(items)).toBe("zh")
  })

  it("returns en for English-dominant text", () => {
    const items = [
      { start: 0, end: 2, text: "This is an English test sentence" },
      { start: 2, end: 4, text: "Hello world" },
    ]
    expect(detectSubtitleLanguage(items)).toBe("en")
  })

  it("returns unknown for empty subtitles", () => {
    expect(detectSubtitleLanguage([])).toBe("unknown")
  })
})

describe("getSubtitleStats", () => {
  it("computes line count and total duration", () => {
    const items = [
      { start: 0, end: 5, text: "a" },
      { start: 5, end: 10, text: "b" },
      { start: 10, end: 15, text: "c" },
    ]
    const stats = getSubtitleStats(items)
    expect(stats.lineCount).toBe(3)
    expect(stats.totalDuration).toBe(15)
    expect(stats.language).toBeDefined()
  })

  it("returns 0 duration for empty input", () => {
    const stats = getSubtitleStats([])
    expect(stats.lineCount).toBe(0)
    expect(stats.totalDuration).toBe(0)
  })
})
