// History API — list user's saved summaries
// GET /api/history?search=&platform=&page=1&pageSize=20

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search") || ""
  const platform = searchParams.get("platform") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("pageSize") || "20"))
  )

  // Build filter
  const where: Record<string, unknown> = {
    userId: session.user.id,
    status: "done",
  }

  if (search) {
    where.title = { contains: search }
  }

  if (platform && platform !== "all") {
    where.platform = platform
  }

  try {
    const [summaries, total] = await Promise.all([
      prisma.summary.findMany({
        where,
        select: {
          id: true,
          title: true,
          url: true,
          platform: true,
          coverUrl: true,
          duration: true,
          mode: true,
          model: true,
          status: true,
          createdAt: true,
          summary: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.summary.count({ where }),
    ])

    return NextResponse.json({
      data: summaries,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    console.error("History fetch error:", err)
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "获取历史记录失败，请稍后重试",
        },
      },
      { status: 500 }
    )
  }
}
