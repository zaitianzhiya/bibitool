// Rate limiting — two-tier: per-user (authenticated) + per-IP (fallback)
// Uses @upstash/ratelimit with sliding window

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_URL
  const token = process.env.UPSTASH_REDIS_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

const redis = getRedis()

// Per-user: 20 requests per minute
const userLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      analytics: true,
    })
  : null

// Per-IP: 5 requests per minute (for unauthenticated / shared IP)
const ipLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
    })
  : null

/**
 * Check rate limit for a request.
 * Prefers per-user limiting when userId is available, falls back to IP.
 *
 * @returns null if allowed, or { retryAfter: seconds } if limited
 */
export async function checkRateLimit(
  userId?: string | null,
  ip?: string
): Promise<{ retryAfter: number } | null> {
  // No Redis configured — allow all requests
  if (!redis) return null

  // Try per-user first
  if (userId && userLimiter) {
    const result = await userLimiter.limit(userId)
    if (!result.success) {
      return { retryAfter: Math.ceil(result.reset / 1000) }
    }
    return null
  }

  // Fall back to per-IP
  if (ip && ipLimiter) {
    const clientIp = ip.startsWith("::ffff:") ? ip.slice(7) : ip
    const result = await ipLimiter.limit(clientIp)
    if (!result.success) {
      return { retryAfter: Math.ceil(result.reset / 1000) }
    }
  }

  return null
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp
  return "0.0.0.0"
}
