// Integration tests for src/lib/transcribe.ts
// Mocks global fetch to test Whisper API integration

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mockFetch = vi.fn()

import { transcribeAudio } from "../transcribe"

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch)
  vi.clearAllMocks()
  process.env.OPENAI_API_KEY = "sk-test-openai-key"
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.OPENAI_API_KEY
})

const makeAudioBuffer = (size = 1000): ArrayBuffer => {
  return new ArrayBuffer(size)
}

describe("transcribeAudio", () => {
  it("successfully transcribes audio with segments", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        segments: [
          { start: 0, end: 2.5, text: "Hello world" },
          { start: 2.5, end: 5.0, text: "This is a test transcription." },
        ],
      }),
    })

    const result = await transcribeAudio(makeAudioBuffer())

    expect(result.length).toBe(2)
    expect(result[0].text).toBe("Hello world")
    expect(result[0].start).toBe(0)
    expect(result[0].end).toBe(2.5)
    expect(result[1].text).toBe("This is a test transcription.")
  })

  it("handles plain text response (no segments)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        text: "This is a plain transcription without timestamps.",
      }),
    })

    const result = await transcribeAudio(makeAudioBuffer())

    expect(result.length).toBe(1)
    expect(result[0].text).toBe("This is a plain transcription without timestamps.")
    expect(result[0].start).toBe(0)
    expect(result[0].end).toBe(0)
  })

  it("sends correct request to Whisper API", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ segments: [{ start: 0, end: 1, text: "test" }] }),
    })

    await transcribeAudio(makeAudioBuffer(5000), { language: "zh" })

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/audio/transcriptions",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer sk-test-openai-key" },
      })
    )

    // Verify FormData contains correct fields
    const callOptions = mockFetch.mock.calls[0][1]
    expect(callOptions.body).toBeInstanceOf(FormData)
  })

  it("throws when OPENAI_API_KEY is not configured", async () => {
    delete process.env.OPENAI_API_KEY

    await expect(transcribeAudio(makeAudioBuffer())).rejects.toThrow(
      "OPENAI_API_KEY is not configured"
    )
  })

  it("throws when file exceeds 25MB limit", async () => {
    const largeBuffer = new ArrayBuffer(26 * 1024 * 1024) // 26MB

    await expect(transcribeAudio(largeBuffer)).rejects.toThrow(
      "Whisper API limit is 25MB"
    )
  })

  it("throws on API error responses", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue("Invalid API key"),
    })

    await expect(transcribeAudio(makeAudioBuffer())).rejects.toThrow(
      "Whisper API error (401)"
    )
  })

  it("passes language option to API", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ segments: [{ start: 0, end: 1, text: "test" }] }),
    })

    await transcribeAudio(makeAudioBuffer(), { language: "ja" })

    // Verify FormData contained language field
    const formData = mockFetch.mock.calls[0][1].body
    expect(formData.has("language")).toBe(true)
  })
})
