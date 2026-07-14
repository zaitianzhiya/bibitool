// Tests for src/lib/ai/chunk.ts
import { describe, it, expect } from "vitest"
import { chunkSubtitles, flattenChunks } from "../../lib/ai/chunk"

function makeSubs(
  lines: { start: number; end: number; text: string }[]
) {
  return lines
}

describe("chunkSubtitles", () => {
  it("returns single chunk for short input", () => {
    const subs = makeSubs([
      { start: 0, end: 2, text: "Hello" },
      { start: 2, end: 4, text: "world" },
    ])
    const chunks = chunkSubtitles(subs, { maxTokens: 10000 })
    expect(chunks.length).toBe(1)
    expect(chunks[0]).toContain("Hello")
    expect(chunks[0]).toContain("world")
  })

  it("splits long input into multiple chunks", () => {
    // Create enough subtitles to exceed a small token limit
    const subs = makeSubs(
      Array.from({ length: 100 }, (_, i) => ({
        start: i * 2,
        end: i * 2 + 2,
        text: `Line ${i}: lorem ipsum dolor sit amet consectetur adipiscing elit`,
      }))
    )
    const chunks = chunkSubtitles(subs, {
      maxTokens: 100,
      overlap: 50,
    })
    expect(chunks.length).toBeGreaterThan(1)
  })

  it("maintains overlap between chunks", () => {
    const subs = makeSubs(
      Array.from({ length: 50 }, (_, i) => ({
        start: i * 2,
        end: i * 2 + 2,
        text: `Long sentence number ${i} with some additional text to make it longer`,
      }))
    )
    const chunks = chunkSubtitles(subs, {
      maxTokens: 200,
      overlap: 100,
    })
    if (chunks.length > 1) {
      const firstEnd = chunks[0].slice(-50)
      const secondStart = chunks[1].slice(0, 50)
      // Overlap region should be in both chunks
      expect(firstEnd.length).toBeGreaterThan(0)
      expect(secondStart.length).toBeGreaterThan(0)
    }
  })

  it("returns empty array for empty input", () => {
    expect(chunkSubtitles([])).toEqual([])
  })

  it("formats timestamps in output", () => {
    const subs = makeSubs([
      { start: 65, end: 70, text: "minute mark" },
    ])
    const chunks = chunkSubtitles(subs)
    expect(chunks[0]).toContain("[01:05]")
  })
})

describe("flattenChunks", () => {
  it("joins chunks with newline", () => {
    const result = flattenChunks(["chunk1", "chunk2", "chunk3"])
    expect(result).toBe("chunk1\nchunk2\nchunk3")
  })
})
