// Audio download and Whisper transcription for video platforms
// Downloads audio stream from B站 and transcribes via OpenAI Whisper API

import { SubtitleItem } from "@/types"
import { transcribeAudio } from "./transcribe"
import { fetchWithRetry } from "./platforms/bilibili-cookie"
import { buildBilibiliHeaders } from "./platforms/bilibili-cookie"

const BILIBILI_PLAYURL = "https://api.bilibili.com/x/player/playurl"

interface BilibiliPlayurlResponse {
  code: number
  message: string
  data?: {
    dash?: {
      audio: {
        id: number
        baseUrl: string
        backupUrl?: string[]
        mimeType: string
        bandwidth: number
        codecid: number
      }[]
    }
  }
}

/**
 * Fetch B站 audio stream URL for a given video and CID
 */
export async function getBilibiliAudioUrl(
  bvid: string,
  cid: number
): Promise<string> {
  const url = `${BILIBILI_PLAYURL}?bvid=${bvid}&cid=${cid}&fnver=0&fnval=4048&fourk=1`

  const response = await fetchWithRetry(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: "https://www.bilibili.com",
    },
  })

  const json: BilibiliPlayurlResponse = await response.json()
  if (json.code !== 0) {
    throw new Error(`B站 playurl API error (${json.code}): ${json.message}`)
  }

  const audio = json.data?.dash?.audio
  if (!audio || audio.length === 0) {
    throw new Error("B站 video has no DASH audio stream available")
  }

  // Pick the lowest bandwidth audio stream for smallest file size
  audio.sort((a, b) => a.bandwidth - b.bandwidth)
  const audioUrl = audio[0].baseUrl || audio[0].backupUrl?.[0]
  if (!audioUrl) {
    throw new Error("B站 audio stream has no playable URL")
  }

  return audioUrl
}

/**
 * Download audio from a URL as ArrayBuffer (with size limit check)
 */
export async function downloadAudio(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    headers: { ...buildBilibiliHeaders(), Referer: "https://www.bilibili.com" },
  })

  if (!response.ok) {
    throw new Error(`Audio download failed (HTTP ${response.status})`)
  }

  return response.arrayBuffer()
}

/**
 * Transcribe a B站 video using Whisper API.
 * Full pipeline: get audio URL -> download -> transcribe with timestamps
 */
export async function transcribeBilibiliVideo(
  bvid: string,
  cid: number,
  language?: string
): Promise<SubtitleItem[]> {
  const audioUrl = await getBilibiliAudioUrl(bvid, cid)
  const audioBuffer = await downloadAudio(audioUrl)
  const subtitles = await transcribeAudio(audioBuffer, {
    language: language || "zh",
  })
  return subtitles
}

/**
 * Transcribe a YouTube video using Whisper API.
 * NOTE: YouTube audio download requires yt-dlp or youtubei.js — not yet implemented.
 * Falls back to a descriptive error.
 */
export async function transcribeYouTubeVideo(
  _videoId: string,
  _language?: string
): Promise<SubtitleItem[]> {
  throw new Error(
    "YouTube audio transcription not yet available. " +
    "Please use videos with subtitles or try a B站 video."
  )
}
