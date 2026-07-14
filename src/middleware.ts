// Auth middleware — protects routes that require authentication
//
// This middleware runs on the Edge Runtime, so it CANNOT import Prisma or any
// Node.js module. It uses JWT token verification only (via getToken).
//
// Protected routes:
//   /dashboard, /history, /api/summarize
//
// Unauthenticated users are redirected to /login for pages,
// or receive a 401 JSON response for API routes.

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protected route definitions
  const protectedPages = ["/dashboard", "/history"]
  const protectedApis = ["/api/summarize", "/api/history", "/api/user/stats", "/api/keys"]

  const isProtectedPage = protectedPages.some((p) =>
    pathname.startsWith(p)
  )
  const isProtectedApi = protectedApis.some((p) =>
    pathname.startsWith(p)
  )

  // Not a protected route — pass through
  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next()
  }

  // Verify JWT token (Edge-compatible, no DB access)
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  })

  // Not authenticated
  if (!token) {
    if (isProtectedApi) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      )
    }
    // Redirect page requests to login
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated — proceed
  return NextResponse.next()
}

// Only run middleware on protected paths
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/history/:path*",
    "/api/summarize/:path*",
    "/api/history/:path*",
    "/api/user/:path*",
    "/api/keys/:path*",
  ],
}
