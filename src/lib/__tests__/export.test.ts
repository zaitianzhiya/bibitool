// Tests for src/lib/export.ts
import { describe, it, expect } from "vitest"
import { subtitlesToSrt, markdownToPlainText } from "../export"

describe("subtitlesToSrt", () => {
  it("formats a single subtitle correctly", () => {
    const result = subtitlesToSrt([
      { start: 1.5, end: 5.0, text: "Hello world" },
    ])
    expect(result).toContain("1")
    expect(result).toContain("00:00:01,500")
    expect(result).toContain("00:00:05,000")
    expect(result).toContain("Hello world")
  })

  it("formats multiple subtitles with sequential numbering", () => {
    const result = subtitlesToSrt([
      { start: 0, end: 2, text: "First" },
      { start: 2, end: 4, text: "Second" },
    ])
    expect(result).toContain("1\n")
    expect(result).toContain("2\n")
    expect(result).toContain("First")
    expect(result).toContain("Second")
  })

  it("handles hours in timestamps", () => {
    const result = subtitlesToSrt([
      { start: 3661, end: 7200, text: "Long video" },
    ])
    expect(result).toContain("01:01:01,000")
    expect(result).toContain("02:00:00,000")
  })

  it("returns empty string for empty input", () => {
    expect(subtitlesToSrt([])).toBe("")
  })
})

describe("markdownToPlainText", () => {
  it("removes heading markers", () => {
    expect(markdownToPlainText("## Chapter Title")).toBe(
      "Chapter Title"
    )
    expect(markdownToPlainText("# Main Title")).toBe("Main Title")
  })

  it("removes bold and italic", () => {
    expect(markdownToPlainText("**bold** and *italic* text")).toBe(
      "bold and italic text"
    )
  })

  it("removes links keeping text", () => {
    expect(
      markdownToPlainText("[click here](https://example.com)")
    ).toBe("click here")
  })

  it("removes list markers", () => {
    expect(markdownToPlainText("- item 1\n- item 2")).toBe(
      "item 1\nitem 2"
    )
  })

  it("removes inline code", () => {
    expect(markdownToPlainText("Use `const` keyword")).toBe(
      "Use const keyword"
    )
  })

  it("trims whitespace", () => {
    expect(markdownToPlainText("  \n  text  \n  ")).toBe("text")
  })
})
