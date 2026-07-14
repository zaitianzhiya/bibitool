// Registration API route
// POST /api/auth/register
// Body: { name: string, email: string, password: string }
// Response: { success: true } | { error: { code, message } }

import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "邮箱和密码为必填项" } },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "密码至少 8 位字符" } },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await prisma.user.findFirst({
      where: { email: email as string },
    })

    if (existing) {
      return NextResponse.json(
        { error: { code: "EMAIL_EXISTS", message: "该邮箱已被注册" } },
        { status: 409 }
      )
    }

    // Hash password and create user
    const hashedPassword = await hash(password as string, 12)
    const user = await prisma.user.create({
      data: {
        name: (name as string) || email!.split("@")[0],
        email: email as string,
        password: hashedPassword,
        credits: 120, // Free trial
      },
    })

    console.log(`New user registered: ${user.email} (${user.id})`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Registration error:", err)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "注册失败，请稍后重试" } },
      { status: 500 }
    )
  }
}
