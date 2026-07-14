// B站 cookie management
// Rotates cookies and User-Agents to avoid rate limiting

const DEFAULT_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
]

const COMMON_HEADERS = {
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Referer": "https://www.bilibili.com",
}

// Parse cookies from env var
function getCookies(): string[] {
  try {
    const raw = process.env.BILIBILI_COOKIES
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [raw]
  } catch {
    // Single cookie string
    const raw = process.env.BILIBILI_COOKIES || ""
    return raw ? [raw] : []
  }
}

let cookieIndex = 0
let uaIndex = 0

/**
 * Get next cookie in rotation
 */
export function getNextCookie(): string | null {
  const cookies = getCookies()
  if (cookies.length === 0) return null
  const cookie = cookies[cookieIndex % cookies.length]
  cookieIndex++
  return cookie
}

/**
 * Get next User-Agent in rotation
 */
export function getNextUserAgent(): string {
  const ua = DEFAULT_USER_AGENTS[uaIndex % DEFAULT_USER_AGENTS.length]
  uaIndex++
  return ua
}

/**
 * Build request headers with optional cookie
 */
export function buildBilibiliHeaders(cookie?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    ...COMMON_HEADERS,
    "User-Agent": getNextUserAgent(),
  }
  if (cookie) {
    headers["Cookie"] = cookie
  }
  return headers
}

/**
 * Retry a fetch with exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const cookie = getNextCookie()
      const headers = buildBilibiliHeaders(cookie)

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...((options.headers as Record<string, string>) || {}),
        },
      })

      // If rate limited, wait and retry
      if (response.status === 412 || response.status === 429) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000
        await new Promise((r) => setTimeout(r, delay))
        continue
      }

      return response
    } catch (err) {
      lastError = err as Error
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} retries`)
}
