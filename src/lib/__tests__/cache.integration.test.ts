// Integration tests for src/lib/cache.ts
// Mocks @upstash/redis to test cache wrapper logic

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mockRedisClient = vi.hoisted(() => ({
  get: vi.fn(),
  setex: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  keys: vi.fn(),
  del: vi.fn(),
}))

vi.mock("@upstash/redis", () => ({
  Redis: function() { return mockRedisClient },
}))

import { cache } from "../cache"

beforeEach(() => {
  vi.clearAllMocks()
  process.env.UPSTASH_REDIS_URL = "https://test.upstash.io"
  process.env.UPSTASH_REDIS_TOKEN = "test-token"
  process.env.NEXT_PHASE = ""
})

afterEach(() => {
  delete process.env.UPSTASH_REDIS_URL
  delete process.env.UPSTASH_REDIS_TOKEN
})

describe("cache.getSubtitle / setSubtitle", () => {
  it("stores and retrieves subtitle data", async () => {
    const data = { title: "Test Video", subtitles: [{ start: 0, end: 5, text: "hello" }] }
    mockRedisClient.get.mockResolvedValue(null)
    const miss = await cache.getSubtitle("bilibili", "BV123")
    expect(miss).toBeNull()
    await cache.setSubtitle("bilibili", "BV123", data)
    expect(mockRedisClient.setex).toHaveBeenCalled()
    const setCall = mockRedisClient.setex.mock.calls[0]
    expect(setCall[0]).toBe("subtitle:bilibili:BV123")
    expect(setCall[1]).toBe(86400)
    expect(JSON.parse(setCall[2])).toEqual(data)
  })

  it("extends TTL for hot videos (accessed >10 times)", async () => {
    mockRedisClient.incr.mockResolvedValue(11)
    mockRedisClient.expire.mockResolvedValue(1)
    mockRedisClient.setex.mockResolvedValue("OK")
    await cache.setSubtitle("youtube", "abc123", { text: "test" })
    const setCall = mockRedisClient.setex.mock.calls[0]
    expect(setCall[1]).toBe(604800)
  })

  it("uses 24h TTL for first-time access", async () => {
    mockRedisClient.incr.mockResolvedValue(1)
    mockRedisClient.expire.mockResolvedValue(1)
    mockRedisClient.setex.mockResolvedValue("OK")
    await cache.setSubtitle("youtube", "new123", { text: "first access" })
    const setCall = mockRedisClient.setex.mock.calls[0]
    expect(setCall[1]).toBe(86400)
  })
})

describe("cache.getSummary / setSummary", () => {
  it("uses platform:videoId:mode:model as key", async () => {
    mockRedisClient.get.mockResolvedValue(null)
    await cache.getSummary("bilibili", "BV123", "detailed", "gpt-4o")
    expect(mockRedisClient.get).toHaveBeenCalledWith("summary:bilibili:BV123:detailed:gpt-4o")
  })

  it("stores summaries with 7-day TTL", async () => {
    mockRedisClient.setex.mockResolvedValue("OK")
    await cache.setSummary("youtube", "abc123", "brief", "gpt-4o-mini", { text: "summary" })
    const setCall = mockRedisClient.setex.mock.calls[0]
    expect(setCall[0]).toBe("summary:youtube:abc123:brief:gpt-4o-mini")
    expect(setCall[1]).toBe(604800)
  })
})

describe("cache.invalidateVideo", () => {
  it("deletes all cache entries for a video", async () => {
    mockRedisClient.keys.mockResolvedValue(["sub:bilibili:BV123", "sum:bilibili:BV123:b:gpt4o"])
    mockRedisClient.del.mockResolvedValue(2)
    await cache.invalidateVideo("bilibili", "BV123")
    expect(mockRedisClient.keys).toHaveBeenCalledWith("*:bilibili:BV123*")
    expect(mockRedisClient.del).toHaveBeenCalled()
  })

  it("does nothing when no keys match", async () => {
    mockRedisClient.keys.mockResolvedValue([])
    await cache.invalidateVideo("youtube", "nonexistent")
    expect(mockRedisClient.del).not.toHaveBeenCalled()
  })
})

describe("cache without Redis", () => {
  it("gracefully returns null when Redis is not configured", async () => {
    delete process.env.UPSTASH_REDIS_URL
    delete process.env.UPSTASH_REDIS_TOKEN
    expect(await cache.getSubtitle("bilibili", "BV123")).toBeNull()
    expect(await cache.getSummary("bilibili", "BV123", "brief", "gpt-4o")).toBeNull()
  })
})
