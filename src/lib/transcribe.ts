// Audio transcription — OpenAI Whisper API (paid) + Hugging Face Inference API (free fallback)
// Falls back gracefully when OpenAI API key is not configured

import { SubtitleItem } from "@/types"

interface TranscribeOptions {
  language?: string // ISO 639-1 code (zh, en, ja, etc.)
  responseFormat?: "verbose_json" | "srt" | "vtt" | "text"
}

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB — Whisper API limit

/**
 * Transcribe audio buffer to subtitle items using Whisper API
 *
 * @param audioBuffer - Raw audio data (mp3, mp4, mpeg, mpga, m4a, wav, webm)
 * @param options - Transcription options
 * @returns Normalized subtitle items with timestamps
 */
export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  options: TranscribeOptions = {}
): Promise<SubtitleItem[]> {

  // Try OpenAI Whisper API first (requires OPENAI_API_KEY)
  if (process.env.OPENAI_API_KEY) {
    try {
      return await transcribeWithOpenAI(audioBuffer, options)
    } catch (err) {
      console.warn("OpenAI Whisper failed, trying free fallback:", err instanceof Error ? err.message : err)
    }
  }

  // Fall back to Hugging Face Inference API (free, rate-limited)
  return transcribeWithHuggingFace(audioBuffer, options.language)
}

/**
 * Transcribe using OpenAI Whisper API (requires OPENAI_API_KEY env var)
 */
async function transcribeWithOpenAI(
  audioBuffer: ArrayBuffer,
  options: TranscribeOptions = {}
): Promise<SubtitleItem[]> {
  const apiKey = process.env.OPENAI_API_KEY!

  if (audioBuffer.byteLength > MAX_FILE_SIZE) {
    throw new Error(
      `Audio file too large (${(audioBuffer.byteLength / 1024 / 1024).toFixed(1)}MB). ` +
      `Whisper API limit is 25MB. File splitting will be supported in a future update.`
    )
  }

  const formData = new FormData()

  // Determine file extension from magic bytes or default to mp3
  const blob = new Blob([audioBuffer], { type: "audio/mpeg" })
  formData.append("file", blob, "audio.mp3")
  formData.append("model", "whisper-1")
  formData.append("response_format", options.responseFormat || "verbose_json")

  if (options.language) {
    formData.append("language", options.language)
  }

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Whisper API error (${response.status}): ${error}`)
  }

  const data = await response.json()

  // Parse verbose_json response with segments
  if (data.segments && Array.isArray(data.segments)) {
    return data.segments.map(
      (seg: { start: number; end: number; text: string }) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text.trim(),
      })
    )
  }

  // If we somehow got plain text (no timestamps), return as single block
  if (typeof data.text === "string") {
    return [
      {
        start: 0,
        end: 0,
        text: data.text.trim(),
      },
    ]
  }

  throw new Error("Unexpected OpenAI Whisper API response format")
}

/**
 * Transcribe using Hugging Face Inference API (FREE, rate-limited).
 * Uses whisper-large-v3 model with timestamp support.
 * Works without an API key (rate-limited) or with a free HF_TOKEN.
 *
 * Sign up: https://huggingface.co/join
 * Get token: https://huggingface.co/settings/tokens
 */
async function transcribeWithHuggingFace(
  audioBuffer: ArrayBuffer,
  language?: string
): Promise<SubtitleItem[]> {
  const hfToken = process.env.HF_TOKEN || ""
  const modelUrl = language === "zh"
    ? "https://api-inference.huggingface.co/models/openai/whisper-large-v3?language=zh"
    : language
      ? `https://api-inference.huggingface.co/models/openai/whisper-large-v3?language=${language}`
      : "https://api-inference.huggingface.co/models/openai/whisper-large-v3"

  // Append return_timestamps for chunk-level output
  const url = `${modelUrl}&return_timestamps=true`

  const headers: Record<string, string> = {
    "Content-Type": "audio/mpeg",
  }
  if (hfToken) {
    headers["Authorization"] = `Bearer ${hfToken}`
  }

  // Account for the 1MB recommended limit on HF free tier
  if (audioBuffer.byteLength > 1 * 1024 * 1024) {
    console.warn(
      `Audio is ${(audioBuffer.byteLength / 1024 / 1024).toFixed(1)}MB. ` +
      `Hugging Face free tier works best with <1MB audio. Quality may be reduced.`
    )
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: audioBuffer,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(
      `Hugging Face API error (${response.status}): ${text.substring(0, 200)}`
    )
  }

  const data = await response.json()

  // Parse with timestamps: { text, chunks: [{ text, timestamp: [start, end] }] }
  if (data.chunks && Array.isArray(data.chunks)) {
    return data.chunks.map(
      (chunk: { text: string; timestamp: [number, number] }) => ({
        start: chunk.timestamp[0] || 0,
        end: chunk.timestamp[1] || chunk.timestamp[0] || 0,
        text: (chunk.text || "").trim(),
      })
    ).filter((item: SubtitleItem) => item.text.length > 0)
  }

  // Fall back to single text blob
  if (typeof data.text === "string") {
    return [{ start: 0, end: 0, text: data.text.trim() }]
  }

  throw new Error(
    "Hugging Face response format not recognized. " +
    (hfToken ? "" : "Try setting HF_TOKEN for better results.")
  )
}

/**
 * Placeholder: transcribe from file path
 * Phase 3-4 will integrate FFmpeg for audio extraction before transcription
 */
export async function transcribeFile(
  _filePath: string,
  _options?: TranscribeOptions
): Promise<SubtitleItem[]> {
  throw new Error(
    "File transcription requires FFmpeg integration (planned for Phase 3-4). " +
    "Use transcribeAudio() with a pre-extracted audio buffer."
  )
}
