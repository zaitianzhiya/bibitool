// Tests for src/lib/ai/prompt.ts
import { describe, it, expect } from "vitest"
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildLocalSummaryPrompt,
  buildGlobalMergePrompt,
} from "../ai/prompt"

const SAMPLE_TEXT = "这是一段测试字幕内容。包含了一些中文文本。"

describe("buildSystemPrompt", () => {
  it("returns brief mode system prompt with constraints", () => {
    const prompt = buildSystemPrompt("brief")
    expect(prompt).toContain("视频内容总结助手")
    expect(prompt).toContain("不超过500字")
    expect(prompt).toContain("核心观点")
    expect(prompt).toContain("中文输出")
  })

  it("returns detailed mode system prompt with formatting", () => {
    const prompt = buildSystemPrompt("detailed")
    expect(prompt).toContain("章节式总结")
    expect(prompt).toContain("Markdown")
    expect(prompt).toContain("时间戳")
    expect(prompt).toContain("中文输出")
  })

  it("defaults to brief for unknown mode", () => {
    const prompt = buildSystemPrompt("unknown" as never)
    expect(prompt).toContain("视频内容总结助手")
    expect(prompt).not.toContain("章节式")
  })
})

describe("buildUserPrompt", () => {
  it("passes text through to brief prompt", () => {
    const result = buildUserPrompt(SAMPLE_TEXT, "brief")
    expect(result).toContain(SAMPLE_TEXT)
    expect(result).toContain("简洁的总结")
  })

  it("passes text through to detailed prompt", () => {
    const result = buildUserPrompt(SAMPLE_TEXT, "detailed")
    expect(result).toContain(SAMPLE_TEXT)
    expect(result).toContain("章节式总结")
  })

  it("defaults to brief for unknown mode", () => {
    const result = buildUserPrompt(SAMPLE_TEXT, "unknown" as never)
    expect(result).not.toContain("章节式")
  })
})

describe("buildLocalSummaryPrompt", () => {
  it("asks for 2-3 sentence summary", () => {
    const result = buildLocalSummaryPrompt(SAMPLE_TEXT)
    expect(result).toContain("2-3 句话")
    expect(result).toContain("中文")
    expect(result).toContain(SAMPLE_TEXT)
  })
})

describe("buildGlobalMergePrompt", () => {
  it("numbers each local summary and asks for global merge", () => {
    const result = buildGlobalMergePrompt(["第一段summary", "第二段summary"], "brief")
    expect(result).toContain("第1段")
    expect(result).toContain("第2段")
    expect(result).toContain("关键要点")
    expect(result).toContain("整体总结")
  })

  it("adapts format based on detailed mode", () => {
    const result = buildGlobalMergePrompt(["summary"], "detailed")
    expect(result).toContain("章节式总结")
    expect(result).toContain("Markdown")
    expect(result).toContain("章节时间标注")
  })

  it("handles empty summaries array", () => {
    const result = buildGlobalMergePrompt([], "brief")
    expect(result).toBeDefined()
    expect(result.length).toBeGreaterThan(0)
  })
})
