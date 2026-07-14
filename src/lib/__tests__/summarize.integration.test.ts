// Integration tests for src/lib/ai/summarize.ts
// Uses vi.hoisted() for shared mock variable initialization

import { describe, it, expect, vi, beforeEach } from "vitest"
import { SubtitleItem } from "@/types"

async function* makeTextStream(chunks: string[]) {
  for (const c of chunks) yield c
}

const mockStreamText = vi.hoisted(() => vi.fn())
const mockGenerateText = vi.hoisted(() => vi.fn())

vi.mock("ai", () => ({
  streamText: mockStreamText,
  generateText: mockGenerateText,
}))

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => ({ _tag: "mocked-model" })),
}))

vi.mock("@ai-sdk/deepseek", () => ({
  deepseek: vi.fn(() => ({ _tag: "mocked-model" })),
}))

import { summarizeStream } from "../ai/summarize"

beforeEach(() => { vi.clearAllMocks() })

const singleSub: SubtitleItem[] = [
  { start: 0, end: 5, text: "Hello and welcome." },
]

const manySubs: SubtitleItem[] = Array.from({ length: 500 }, (_, i) => ({
  start: i * 2, end: i * 2 + 2,
  text: `Line ${i}: sample subtitle text for chunking tests.`,
}))

describe("short video path", () => {
  it("yields streamed content", async () => {
    mockStreamText.mockReturnValue({ textStream: makeTextStream(["streamed ", "summary."]) })
    const r: string[] = []
    for await (const c of summarizeStream({ subtitles: singleSub, mode: "brief" })) r.push(c)
    expect(r.join("")).toBe("streamed summary.")
    expect(mockStreamText).toHaveBeenCalledTimes(1)
  })

  it("passes detailed mode options", async () => {
    mockStreamText.mockReturnValue({ textStream: makeTextStream(["x"]) })
    for await (const _ of summarizeStream({ subtitles: singleSub, mode: "detailed" })) {}
    expect(mockStreamText.mock.calls[0][0].temperature).toBe(0.5)
  })

  it("handles empty subtitles", async () => {
    const r: string[] = []
    for await (const c of summarizeStream({ subtitles: [], mode: "brief" })) r.push(c)
    expect(r.join("")).toContain("[no-subtitles]")
    expect(mockStreamText).not.toHaveBeenCalled()
  })
})

describe("long video path (map-reduce)", () => {
  it("calls generateText + streamText", async () => {
    mockGenerateText.mockResolvedValue({ text: "local" })
    mockStreamText.mockReturnValue({ textStream: makeTextStream(["merged."]) })
    const r: string[] = []
    for await (const c of summarizeStream({ subtitles: manySubs, mode: "detailed" })) r.push(c)
    expect(r.join("")).toContain("merged.")
    expect(mockGenerateText).toHaveBeenCalled()
  })

  it("handles partial failures", async () => {
    mockGenerateText.mockResolvedValueOnce({ text: "ok" }).mockRejectedValueOnce(new Error("fail"))
    mockStreamText.mockReturnValue({ textStream: makeTextStream(["merged."]) })
    const r: string[] = []
    for await (const c of summarizeStream({ subtitles: manySubs, mode: "brief" })) r.push(c)
    expect(r.join("")).toContain("merged.")
  })

  it("yields error when all fail", async () => {
    mockGenerateText.mockRejectedValue(new Error("LLM down"))
    const r: string[] = []
    for await (const c of summarizeStream({ subtitles: manySubs, mode: "brief" })) r.push(c)
    expect(r.join("")).toContain("[all-failed]")
  })
})

describe("error fallback chain", () => {
  it("falls back to next model", async () => {
    mockStreamText
      .mockImplementationOnce(() => { throw new Error("Primary error") })
      .mockReturnValueOnce({ textStream: makeTextStream(["fallback."]) })
    const r: string[] = []
    for await (const c of summarizeStream({ subtitles: singleSub, mode: "brief" })) r.push(c)
    expect(r.join("")).toContain("fallback.")
    expect(mockStreamText).toHaveBeenCalledTimes(2)
  })
})