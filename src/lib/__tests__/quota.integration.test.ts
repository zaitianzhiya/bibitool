// Integration tests for src/lib/quota.ts
// Mocks prisma to test quota business logic

import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock prisma client — vi.hoisted() ensures mock value is initialized before module load
const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  apiUsage: { create: vi.fn(), aggregate: vi.fn() },
  summary: { count: vi.fn() },
}))

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}))

import { checkQuota, consumeQuota, getDailyUsage, initializeCredits } from "../quota"

const USER_ID = "test-user-1"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("checkQuota", () => {
  it("returns allowed=true when user has credits", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ credits: 600 })
    const result = await checkQuota(USER_ID)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(600)
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      select: { credits: true },
    })
  })

  it("returns allowed=false when user has zero credits", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ credits: 0 })
    const result = await checkQuota(USER_ID)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("handles missing user gracefully", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const result = await checkQuota(USER_ID)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })
})

describe("consumeQuota", () => {
  it("deducts by video duration in seconds", async () => {
    mockPrisma.user.update.mockResolvedValue({ credits: 540 })
    mockPrisma.apiUsage.create.mockResolvedValue({ id: "usage-1" })

    const result = await consumeQuota(USER_ID, 60)
    expect(result.remaining).toBe(540)
    expect(mockPrisma.user.update).toHaveBeenCalled()
    // Verify decrement value
    const updateCall = mockPrisma.user.update.mock.calls[0][0]
    expect(updateCall.data.credits.decrement).toBe(60)
  })

  it("enforces minimum deduction of 30 seconds", async () => {
    mockPrisma.user.update.mockResolvedValue({ credits: 7000 })
    mockPrisma.apiUsage.create.mockResolvedValue({ id: "usage-2" })

    const result = await consumeQuota(USER_ID, 5)
    expect(result.remaining).toBe(7000)
    const updateCall = mockPrisma.user.update.mock.calls[0][0]
    expect(updateCall.data.credits.decrement).toBe(30)
  })

  it("logs usage record to ApiUsage table", async () => {
    mockPrisma.user.update.mockResolvedValue({ credits: 500 })
    mockPrisma.apiUsage.create.mockResolvedValue({ id: "usage-3" })

    await consumeQuota(USER_ID, 120)
    expect(mockPrisma.apiUsage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        duration: 120,
      }),
    })
  })
})

describe("getDailyUsage", () => {
  it("returns aggregated stats from all three queries", async () => {
    mockPrisma.apiUsage.aggregate.mockResolvedValue({ _sum: { duration: 300 } })
    mockPrisma.summary.count.mockResolvedValue(15)
    mockPrisma.user.findUnique.mockResolvedValue({ credits: 7200 })

    const result = await getDailyUsage(USER_ID)
    expect(result.usedToday).toBe(300)
    expect(result.totalSummaries).toBe(15)
    expect(result.remaining).toBe(7200)
  })

  it("handles zero usage", async () => {
    mockPrisma.apiUsage.aggregate.mockResolvedValue({ _sum: { duration: null } })
    mockPrisma.summary.count.mockResolvedValue(0)
    mockPrisma.user.findUnique.mockResolvedValue({ credits: 7200 })

    const result = await getDailyUsage(USER_ID)
    expect(result.usedToday).toBe(0)
    expect(result.totalSummaries).toBe(0)
  })
})

describe("initializeCredits", () => {
  it("sets 120 minutes (7200 seconds) of credits", async () => {
    mockPrisma.user.update.mockResolvedValue({ credits: 7200 })

    await initializeCredits(USER_ID)
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { credits: 7200 },
    })
  })
})

