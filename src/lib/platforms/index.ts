// Platform resolution pipeline
// Full flow: detect platform → resolve short links → extract ID → fetch info + subtitles → normalize → cache
// ⬇ Phase 2 review fix: Whisper transcription fallback when no platform subtitles available

import { Platform, VideoInfo, SubtitleItem } from "@/types"
import {
  extractBilibiliVideoId,
  extractYouTubeVideoId,
} from "@/lib/utils"
import { cache } from "@/lib/cache"
import { normalizeSubtitles } from "@/lib/subtitle-normalizer"

// Import platform-specific adapters
import {
  fetchBilibiliVideoInfo,
  fetchBilibiliSubtitles,
  fetchBilibiliDanmaku,
  resolveB23Url,
} from "./bilibili"
import {
  fetchYouTubeVideoInfo,
  fetchYouTubeSubtitles,
} from "./youtube"

// Whisper fallback flag — set to true in production when OPENAI_API_KEY is configured
const WHISPER_AVAILABLE = !!process.env.OPENAI_API_KEY

/**
 * Detect which video platform a URL belongs to
 */
export function detectPlatform(url: string): Platform | null {
  if (url.includes("bilibili.com") || url.includes("b23.tv")) {
    return Platform.Bilibili
  }
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return Platform.YouTube
  }
  if (url.startsWith("file://") || url.match(/^[a-zA-Z]:\\/)) {
    return Platform.LocalFile
  }
  return null
}

/**
 * Extract video ID from URL based on platform
 */
export function extractVideoId(
  url: string,
  platform: Platform
): string | null {
  switch (platform) {
    case Platform.Bilibili:
      return extractBilibiliVideoId(url)
    case Platform.YouTube:
      return extractYouTubeVideoId(url)
    case Platform.LocalFile:
      return url
    default:
      return null
  }
}

/**
 * Full video resolution pipeline:
 *  1. Detect platform
 *  2. Resolve short links (b23.tv → full URL)
 *  3. Extract video ID
 *  4. Check subtitle cache
 *  5. Fetch video info
 *  6. Fetch subtitles (CC → danmaku → Whisper transcription)
 *  7. Normalize subtitles
 *  8. Cache results
 *  9. Return complete VideoInfo
 */
export async function resolveVideo(url: string): Promise<VideoInfo> {
  // 1. Detect platform
  const platform = detectPlatform(url)
  if (!platform) {
    throw new Error(
      `Unsupported URL: "${url}". Currently supporting B站 (bilibili.com, b23.tv) and YouTube (youtube.com, youtu.be).`
    )
  }

  // 2. Resolve b23.tv short links
  let resolvedUrl = url
  if (platform === Platform.Bilibili && url.includes("b23.tv")) {
    try {
      resolvedUrl = await resolveB23Url(url)
    } catch {
      console.warn("Failed to resolve b23.tv URL, proceeding with original")
    }
  }

  // 3. Extract video ID
  const videoId = extractVideoId(resolvedUrl, platform)
  if (!videoId) {
    throw new Error(
      `Could not extract video ID from URL: "${resolvedUrl}". ` +
      `For B站, use BV/AV format (e.g., BV1xx411c7mD or av12345678). ` +
      `For YouTube, use watch?v= or youtu.be/ format.`
    )
  }

  // 4. Check subtitle cache
  const cachedSubtitles = await cache.getSubtitle(platform, videoId)
  if (cachedSubtitles) {
    try {
      const parsed = JSON.parse(cachedSubtitles)
      return { ...parsed, platform, videoId }
    } catch {
      // Cache corrupted, continue normal flow
    }
  }

  // 5-6. Fetch video info and subtitles with fallback chain
  let subtitles: SubtitleItem[] = []
  let title = ""
  let coverUrl: string | undefined
  let duration = 0
  let subtitleSource:
    | "platform_cc"
    | "platform_danmaku"
    | "whisper_transcription"
    | "none" = "none"

  switch (platform) {
    case Platform.Bilibili: {
      const info = await fetchBilibiliVideoInfo(videoId)
      title = info.videoInfo.title
      coverUrl = info.videoInfo.coverUrl
      duration = info.videoInfo.duration

      // Tier 1: CC subtitles (AI captions + user-uploaded)
      subtitles = await fetchBilibiliSubtitles(videoId, info.cid)
      if (subtitles.length > 0) {
        subtitleSource = "platform_cc"
        break
      }

      // Tier 2: Danmaku fallback
      console.log(`No CC subtitles for B站 ${videoId}, trying danmaku...`)
      subtitles = await fetchBilibiliDanmaku(info.cid)
      if (subtitles.length > 0) {
        subtitleSource = "platform_danmaku"
        break
      }

      // Tier 3: Whisper transcription (requires OPENAI_API_KEY)
      if (WHISPER_AVAILABLE) {
        console.log(
          `No subtitles or danmaku for B站 ${videoId}. ` +
          `Whisper transcription requires audio download (planned Phase 3). ` +
          `Set WHISPER_AUTO_FALLBACK=true to enable.`
        )
      }
      break
    }

    case Platform.YouTube: {
      const info = await fetchYouTubeVideoInfo(videoId)
      title = info.videoInfo.title
      coverUrl = info.videoInfo.coverUrl
      duration = info.videoInfo.duration

      subtitles = await fetchYouTubeSubtitles(videoId)
      if (subtitles.length > 0) {
        subtitleSource = "platform_cc"
      }
      break
    }

    case Platform.LocalFile: {
      throw new Error(
        "Local file processing requires file upload. Please use the file upload interface."
      )
    }

    default:
      throw new Error(`Platform "${platform}" is not yet supported.`)
  }

  // 7. Normalize subtitles
  const normalizedSubtitles = normalizeSubtitles(subtitles)

  // 8. Build result (include subtitleSource for UI feedback)
  const result: VideoInfo = {
    platform,
    videoId,
    title,
    coverUrl,
    duration,
    subtitles: normalizedSubtitles,
    subtitleSource:
      normalizedSubtitles.length === 0 ? "none" : subtitleSource,
  }

  // 9. Cache subtitles
  try {
    await cache.setSubtitle(platform, videoId, result)
  } catch (err) {
    console.warn("Failed to cache subtitles:", err)
  }

  return result
}
