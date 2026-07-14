// Upstash Redis cache wrapper
// Lazy-initialized to avoid build-time errors when env vars are not set
// Implements subtitle + summary caching with TTL management

import { Redis } from "@upstash/redis"

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_URL
  const token = process.env.UPSTASH_REDIS_TOKEN

  if (!url || !token) return null

  return new Redis({ url, token })
}

// Detect if we're in a build/static generation context
function isBuildTime(): boolean {
  return (
    typeof process !== "undefined" &&
    (process.env.NEXT_PHASE === "phase-production-build" ||
     process.env.NEXT_PHASE === "phase-development-build")
  )
}

async function withRedis<T>(
  fn: (redis: Redis) => Promise<T>,
  fallback: T
): Promise<T> {
  if (isBuildTime()) return fallback
  const redis = getRedis()
  if (!redis) return fallback
  try {
    return await fn(redis)
  } catch {
    return fallback
  }
}

export const cache = {
  /**
   * Get cached subtitle data
   */
  async getSubtitle(
    platform: string,
    videoId: string
  ): Promise<string | null> {
    return withRedis(
      (redis) => redis.get<string>(`subtitle:${platform}:${videoId}`),
      null
    )
  },

  /**
   * Set cached subtitle data with dynamic TTL
   */
  async setSubtitle(
    platform: string,
    videoId: string,
    data: unknown
  ): Promise<void> {
    await withRedis(async (redis) => {
      let ttl = 86400 // 24 hours base TTL
      // Check if hot video (accessed frequently)
      const accessCount = await redis.incr(`hot:${platform}:${videoId}`)
      await redis.expire(`hot:${platform}:${videoId}`, 86400)
      if (accessCount > 10) {
        ttl = 604800 // Extend to 7 days for hot videos
      }
      await redis.setex(
        `subtitle:${platform}:${videoId}`,
        ttl,
        JSON.stringify(data)
      )
    }, undefined)
  },

  /**
   * Get cached summary
   */
  async getSummary(
    platform: string,
    videoId: string,
    mode: string,
    model: string
  ): Promise<string | null> {
    return withRedis(
      (redis) =>
        redis.get<string>(
          `summary:${platform}:${videoId}:${mode}:${model}`
        ),
      null
    )
  },

  /**
   * Set cached summary (7 day TTL)
   */
  async setSummary(
    platform: string,
    videoId: string,
    mode: string,
    model: string,
    data: unknown
  ): Promise<void> {
    await withRedis(async (redis) => {
      await redis.setex(
        `summary:${platform}:${videoId}:${mode}:${model}`,
        604800, // 7 days
        JSON.stringify(data)
      )
    }, undefined)
  },

  /**
   * Delete cached entries for a video
   */
  async invalidateVideo(
    platform: string,
    videoId: string
  ): Promise<void> {
    await withRedis(async (redis) => {
      const keys = await redis.keys(`*:${platform}:${videoId}*`)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    }, undefined)
  },

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return getRedis() !== null
  },
}
