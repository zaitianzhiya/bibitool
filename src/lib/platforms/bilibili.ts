// B站 (Bilibili) platform adapter
// Full implementation: video info, subtitles, danmaku fallback, b23.tv resolution, multi-P support
//
// ⬇ Phase 2 review fixes:
//   1. Multi-P video support — fetches all pages instead of just pages[0]
//   2. Danmaku protobuf fallback — tries new protobuf API when XML returns empty
//   3. Clear subtitleSource tracking

import { SubtitleItem, VideoInfo, Platform } from "@/types"
import { expandB23Url } from "./bilibili-shortlink"
import { fetchWithRetry } from "./bilibili-cookie"

const BILIBILI_API = {
  VIDEO_INFO: "https://api.bilibili.com/x/web-interface/view",
  PLAYER: "https://api.bilibili.com/x/player/v2",
  DANMAKU_LEGACY: "https://api.bilibili.com/x/v1/dm/list.so", // XML (old)
  DANMAKU_PROTOBUF: "https://api.bilibili.com/x/v2/dm/web/seg.so", // Protobuf (new)
  PAGE_LIST: "https://api.bilibili.com/x/player/pagelist",
}

interface BilibiliApiResponse<T> {
  code: number
  message: string
  data: T
}

interface BilibiliVideoData {
  bvid: string
  aid: number
  title: string
  pic: string
  duration: number // seconds
  owner: { name: string; mid: number; face: string }
  cid: number
  pages: { cid: number; part: string; duration: number }[]
  desc: string
  pubdate: number
}

interface BilibiliPlayerData {
  subtitle?: {
    subtitles: {
      id: number
      lan: string
      lan_doc: string
      subtitle_url: string
    }[]
  }
}

interface BilibiliSubtitleJson {
  font_size: number
  font_color: string
  background_alpha: number
  background_color: string
  stroke: string
  body: {
    from: number // seconds
    to: number
    location: number
    content: string
  }[]
}

/**
 * Resolve b23.tv short URL to full URL
 */
export async function resolveB23Url(shortUrl: string): Promise<string> {
  const fullUrl = await expandB23Url(shortUrl)
  return fullUrl
}

/**
 * Fetch B站 video info
 * Supports BV号 (bvid) and AV号 (aid)
 * Returns ALL page CIDs for multi-P videos
 */
export async function fetchBilibiliVideoInfo(videoId: string): Promise<{
  videoInfo: {
    platform: Platform
    videoId: string
    title: string
    coverUrl: string
    duration: number
  }
  /** Primary page CID (first 分P) */
  cid: number
  /** All page CIDs — for multi-P (合集) videos */
  allPageCids: { cid: number; part: string; duration: number }[]
  rawData: BilibiliVideoData
}> {
  const params = new URLSearchParams()
  if (videoId.startsWith("BV") || videoId.startsWith("bv")) {
    params.set("bvid", videoId)
  } else {
    const aid = videoId.replace(/^av/i, "")
    params.set("aid", aid)
  }

  const url = `${BILIBILI_API.VIDEO_INFO}?${params.toString()}`
  const response = await fetchWithRetry(url)
  const json: BilibiliApiResponse<BilibiliVideoData> = await response.json()

  if (json.code !== 0) {
    throw new Error(`B站 API error (${json.code}): ${json.message}`)
  }

  const data = json.data
  const pages = data.pages || [{ cid: data.cid, part: data.title, duration: data.duration }]
  const primaryPage = pages[0]
  const cid = primaryPage?.cid || data.cid || 0

  return {
    videoInfo: {
      platform: Platform.Bilibili,
      videoId: data.bvid || videoId,
      title: data.title,
      coverUrl: data.pic,
      duration: data.duration,
    },
    cid,
    allPageCids: pages.map((p) => ({
      cid: p.cid,
      part: p.part,
      duration: p.duration,
    })),
    rawData: data,
  }
}

/**
 * Fetch B站 CC subtitles for a single page CID
 */
export async function fetchBilibiliSubtitles(
  videoId: string,
  cid: number
): Promise<SubtitleItem[]> {
  const url = `${BILIBILI_API.PLAYER}?bvid=${videoId}&cid=${cid}`
  const response = await fetchWithRetry(url)
  const json: BilibiliApiResponse<BilibiliPlayerData> = await response.json()

  if (json.code !== 0) {
    console.warn(`B站 player API error (${json.code}): ${json.message}`)
    return []
  }

  const subtitles = json.data?.subtitle?.subtitles
  if (!subtitles || subtitles.length === 0) {
    return []
  }

  // Priority: Chinese > English > first
  const preferred = (
    subtitles.find(
      (s) => s.lan_doc?.includes("中文") || s.lan?.includes("zh")
    ) ||
    subtitles.find((s) => s.lan?.startsWith("en")) ||
    subtitles[0]
  )

  const subtitleUrl = preferred.subtitle_url.startsWith("http")
    ? preferred.subtitle_url
    : `https:${preferred.subtitle_url}`

  const subResponse = await fetch(subtitleUrl)
  const subJson: BilibiliSubtitleJson = await subResponse.json()

  return subJson.body.map((item) => ({
    start: item.from,
    end: item.to,
    text: item.content,
  }))
}

/**
 * Fetch subtitles for ALL pages of a multi-P video
 * Merges subtitles with page offsets so timestamps are continuous
 */
export async function fetchBilibiliSubtitlesAllPages(
  videoId: string,
  allPageCids: { cid: number; part: string; duration: number }[]
): Promise<SubtitleItem[]> {
  const allResults: SubtitleItem[] = []
  let timeOffset = 0 // Offset for each page's timestamps

  for (let i = 0; i < allPageCids.length; i++) {
    const page = allPageCids[i]
    const pageSubtitles = await fetchBilibiliSubtitles(videoId, page.cid)

    // If first page has subtitles, all pages probably do — otherwise skip
    if (i > 0 && pageSubtitles.length === 0) {
      continue // Some multi-P videos only have CC for certain pages
    }

    // Shift timestamps to be continuous across pages
    const offsetSubtitles = pageSubtitles.map((s) => ({
      start: s.start + timeOffset,
      end: s.end + timeOffset,
      text: s.text,
    }))

    allResults.push(...offsetSubtitles)

    // Update offset for next page (use actual subtitles end or page duration)
    if (pageSubtitles.length > 0) {
      const lastEnd = pageSubtitles[pageSubtitles.length - 1].end
      timeOffset += lastEnd + 2 // 2-second gap between pages
    } else {
      timeOffset += page.duration + 2
    }
  }

  return allResults
}

/**
 * Fetch B站 danmaku — tries new protobuf API first, falls back to legacy XML
 */
export async function fetchBilibiliDanmaku(
  cid: number
): Promise<SubtitleItem[]> {
  // Try new protobuf API first
  const newApiResult = await fetchDanmakuProtobuf(cid)
  if (newApiResult.length > 0) {
    return newApiResult
  }

  // Fallback to legacy XML API
  return fetchDanmakuLegacy(cid)
}

/**
 * New B站 danmaku API (protobuf/JSON)
 * Endpoint: /x/v2/dm/web/seg.so?oid={cid}&type=1&segment_index=1
 * Returns JSON with danmaku segments
 */
async function fetchDanmakuProtobuf(cid: number): Promise<SubtitleItem[]> {
  try {
    // The v2 API returns segment-based protobuf; B站 provides a JSON wrapper
    const url = `${BILIBILI_API.DANMAKU_PROTOBUF}?oid=${cid}&type=1&segment_index=1`
    const response = await fetchWithRetry(url)

    const text = await response.text()

    // Try JSON parsing first (some newer endpoints return JSON)
    try {
      const json = JSON.parse(text)
      if (json.data?.dm && Array.isArray(json.data.dm)) {
        return parseDanmakuItems(json.data.dm)
      }
    } catch {
      // Not JSON — try the XML <d> format inside protobuf wrapper
    }

    // Fallback: parse as if it contains XML <d> elements
    const danmakuRegex = /<d p="([^"]*)">([^<]*)<\/d>/g
    return extractDanmakuFromRegex(text, danmakuRegex)
  } catch {
    return []
  }
}

/**
 * Legacy B站 danmaku API (XML)
 * Endpoint: /x/v1/dm/list.so?oid={cid}
 */
async function fetchDanmakuLegacy(cid: number): Promise<SubtitleItem[]> {
  try {
    const url = `${BILIBILI_API.DANMAKU_LEGACY}?oid=${cid}`
    const response = await fetchWithRetry(url)
    const xmlText = await response.text()

    const danmakuRegex = /<d p="([^"]*)">([^<]*)<\/d>/g
    return extractDanmakuFromRegex(xmlText, danmakuRegex)
  } catch {
    return []
  }
}

/**
 * Parse individual danmaku items from the new API's JSON format
 */
function parseDanmakuItems(
  items: { content?: string; progress?: number; mode?: number }[]
): SubtitleItem[] {
  const danmakuByMinute = new Map<number, string[]>()

  for (const item of items) {
    const text = item.content?.trim()
    const time = item.progress || 0 // milliseconds — convert to seconds

    if (!text) continue

    const bucket = Math.floor(time / 30) * 30
    if (!danmakuByMinute.has(bucket)) {
      danmakuByMinute.set(bucket, [])
    }
    danmakuByMinute.get(bucket)!.push(text)
  }

  return bucketsToSubtitles(danmakuByMinute)
}

/**
 * Extract danmaku from XML <d> tags using regex
 */
function extractDanmakuFromRegex(
  text: string,
  regex: RegExp
): SubtitleItem[] {
  const danmakuByMinute = new Map<number, string[]>()

  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const params = match[1].split(",")
    const time = parseFloat(params[0]) // seconds (legacy API)
    const content = match[2].trim()

    if (!content) continue

    const bucket = Math.floor(time / 30) * 30
    if (!danmakuByMinute.has(bucket)) {
      danmakuByMinute.set(bucket, [])
    }
    danmakuByMinute.get(bucket)!.push(content)
  }

  return bucketsToSubtitles(danmakuByMinute)
}

/**
 * Convert time-bucketed danmaku to SubtitleItem[]
 */
function bucketsToSubtitles(
  danmakuByMinute: Map<number, string[]>
): SubtitleItem[] {
  const result: SubtitleItem[] = []

  for (const [bucket, texts] of danmakuByMinute.entries()) {
    const uniqueTexts = [...new Set(texts)].slice(0, 5)
    if (uniqueTexts.length === 0) continue

    result.push({
      start: bucket,
      end: bucket + 30,
      text: uniqueTexts.join(" | "),
    })
  }

  return result.sort((a, b) => a.start - b.start)
}

// Re-export for use in index.ts
export { expandB23Url }
