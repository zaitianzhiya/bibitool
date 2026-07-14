// YouTube platform adapter
// Uses youtube-transcript for subtitles and noembed/oembed for metadata
// ⬇ Phase 2 review fix: fallback duration extraction via noembed.com (returns duration field)

import { SubtitleItem, Platform } from "@/types"
import { YoutubeTranscript } from "youtube-transcript"

/**
 * Fetch YouTube video info via oembed + noembed APIs
 * Free, no API key required.
 *
 * oembed (youtube.com/oembed) — fast, but no duration field
 * noembed (noembed.com) — slower, but includes duration
 *
 * We try oembed first for speed, then noembed if duration is needed.
 */
export async function fetchYouTubeVideoInfo(videoId: string): Promise<{
  videoInfo: {
    platform: Platform
    videoId: string
    title: string
    coverUrl?: string
    duration: number
  }
}> {
  let title = ""
  let coverUrl: string | undefined
  let duration = 0

  // Primary: oembed (fast, official, no API key needed)
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const response = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      const data = await response.json()
      title = data.title || ""
      coverUrl = data.thumbnail_url || undefined
      // duration not in oembed response body, comes from noembed
    }
  } catch {
    // oembed failed, will try noembed below
  }

  // Secondary: noembed.com (returns duration, title, thumbnail)
  // noembed is a free third-party service that embeds rich metadata
  try {
    const noembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
    const response = await fetch(noembedUrl, {
      signal: AbortSignal.timeout(8000),
    })

    if (response.ok) {
      const data = await response.json()
      if (!title) title = data.title || ""
      if (!coverUrl) coverUrl = data.thumbnail_url || undefined
      // noembed returns duration in seconds (integer)
      if (data.duration && duration === 0) {
        duration = data.duration
      }
    }
  } catch {
    // noembed also failed — title from oembed should still be available
  }

  if (!title) {
    // Neither API worked — try a minimal HTML title scrape
    try {
      const pageUrl = `https://www.youtube.com/watch?v=${videoId}`
      const response = await fetch(pageUrl, {
        signal: AbortSignal.timeout(10000),
      })
      const html = await response.text()
      const titleMatch = html.match(/<title>([^<]*)<\/title>/)
      if (titleMatch) {
        title = titleMatch[1].replace(" - YouTube", "").trim()
      }
    } catch {
      title = `YouTube Video (${videoId})`
    }
  }

  return {
    videoInfo: {
      platform: Platform.YouTube,
      videoId,
      title,
      coverUrl,
      duration,
    },
  }
}

/**
 * Fetch YouTube subtitles/transcript
 * Uses youtube-transcript which scrapes the YT page for captions
 * No API key required
 */
export async function fetchYouTubeSubtitles(
  videoId: string
): Promise<SubtitleItem[]> {
  try {
    // Try Chinese first, fallback to English, then any available
    let transcript: Awaited<
      ReturnType<typeof YoutubeTranscript.fetchTranscript>
    >

    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: "zh-Hans",
      })
    } catch {
      try {
        transcript = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: "en",
        })
      } catch {
        // Get whatever is available
        transcript = await YoutubeTranscript.fetchTranscript(videoId)
      }
    }

    return transcript.map((item) => ({
      start: item.offset / 1000, // ms → seconds
      end: (item.offset + item.duration) / 1000,
      text: item.text,
    }))
  } catch (err) {
    console.warn("YouTube transcript fetch failed:", err)
    return []
  }
}
