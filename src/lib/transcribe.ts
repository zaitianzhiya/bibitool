// Audio transcription via OpenAI Whisper API
// Falls back gracefully when API key is not configured

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
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Set it in .env.local to use Whisper transcription."
    )
  }

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

  throw new Error("Unexpected Whisper API response format")
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
