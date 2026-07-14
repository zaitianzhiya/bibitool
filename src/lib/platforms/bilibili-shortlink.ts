// B站 b23.tv short link resolver
// Follows HTTP redirects to get the full bilibili.com URL

import { fetchWithRetry } from "./bilibili-cookie"

/**
 * Expand a b23.tv short link to the full bilibili.com URL
 * Handles both HTTP 301/302 redirects and meta-refresh redirects
 */
export async function expandB23Url(shortUrl: string): Promise<string> {
  // Validate that it's a b23.tv URL
  if (!shortUrl.includes("b23.tv")) {
    return shortUrl // Not a short link, return as-is
  }

  try {
    const response = await fetchWithRetry(shortUrl, { redirect: "manual" })

    // Check for HTTP redirect
    const location = response.headers.get("location")
    if (location) {
      return location
    }

    // Check for meta-refresh / JS redirect in HTML body
    if (response.status === 200) {
      const html = await response.text()

      // Meta refresh: <meta http-equiv="refresh" content="0;url=...">
      const metaMatch = html.match(
        /content="\d+;\s*url=([^"]+)"/i
      )
      if (metaMatch) return metaMatch[1]

      // JS redirect: window.location.href = "..."
      const jsMatch = html.match(
        /window\.location\s*[.=]\s*["']([^"']+)["']/
      )
      if (jsMatch) return jsMatch[1]
    }

    // If we couldn't resolve, return the original URL
    // The caller will need to handle b23.tv in extractVideoId
    return shortUrl
  } catch (err) {
    console.warn("Failed to expand b23.tv URL:", err)
    return shortUrl
  }
}
