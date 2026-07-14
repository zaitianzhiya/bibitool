// Local file processing module
// Placeholder — Phase 3+ will implement FFmpeg extraction + Whisper transcription

import { SubtitleItem } from "@/types"

/**
 * Extract audio from local video/audio file and transcribe
 *
 * TODO: Phase 3/4 — Full local file pipeline:
 *   1. FFmpeg: extract audio track from video
 *   2. FFmpeg: convert to Whisper-compatible format (16kHz mono WAV)
 *   3. Split large files (>25MB) into chunks
 *   4. Call Whisper API (or self-hosted faster-whisper)
 *   5. Merge transcription chunks with proper timestamps
 */
export async function processLocalFile(
  filePath: string
): Promise<{
  title: string
  duration: number
  subtitles: SubtitleItem[]
}> {
  // Extract filename from path for title
  const fileName = filePath.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "")

  throw new Error(
    "Local file processing is not yet implemented. " +
    "This feature requires FFmpeg and Whisper integration (planned for Phase 3-4). " +
    `File: ${fileName}`
  )
}
