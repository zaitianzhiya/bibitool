// Quota management — per-minute billing based on video duration
// Free tier: 120 minutes lifetime credits, deduct on each summary

import { prisma } from "@/lib/db"

const FREE_CREDITS = 120 * 60 // 120 minutes in seconds
const MIN_DEDUCTION = 30       // Minimum 30 seconds per summary

/**
 * Check if user has enough credits for a summary
 */
export async function checkQuota(userId: string): Promise<{
  allowed: boolean
  remaining: number // seconds
  credits: number
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  })

  const credits = user?.credits ?? 0
  return {
    allowed: credits > 0,
    remaining: credits,
    credits,
  }
}

/**
 * Deduct credits after summary completion
 * @param durationSeconds — actual video duration in seconds
 */
export async function consumeQuota(
  userId: string,
  durationSeconds: number
): Promise<{ remaining: number }> {
  const deduction = Math.max(
    MIN_DEDUCTION,
    Math.ceil(durationSeconds)
  )

  // Deduct credits
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      credits: { decrement: deduction },
    },
    select: { credits: true },
  })

  // Log usage record
  await prisma.apiUsage.create({
    data: {
      userId,
      duration: deduction,
      tokens: 0, // Token tracking added later
    },
  })

  return {
    remaining: Math.max(0, updated.credits),
  }
}

/**
 * Get daily usage stats for dashboard
 */
export async function getDailyUsage(userId: string): Promise<{
  usedToday: number
  totalSummaries: number
  remaining: number
}> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [usedToday, totalSummaries, user] = await Promise.all([
    prisma.apiUsage.aggregate({
      where: { userId, date: { gte: today } },
      _sum: { duration: true },
    }),
    prisma.summary.count({
      where: { userId },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    }),
  ])

  return {
    usedToday: usedToday._sum.duration || 0,
    totalSummaries,
    remaining: user?.credits ?? 0,
  }
}

/**
 * Initialize free credits for new users
 */
export async function initializeCredits(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { credits: FREE_CREDITS },
  })
}
