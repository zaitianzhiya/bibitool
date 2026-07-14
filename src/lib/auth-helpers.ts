// Lightweight auth helpers for middleware — NO Prisma runtime dependency
// Middleware runs on the Edge Runtime, which cannot load Node.js modules.
// This file uses ONLY jwt verification, no database access.
//
// For full auth (with DB), import from "@/lib/auth" in API routes / server components.

import { getToken } from "next-auth/jwt"

/**
 * Get the current session from the JWT token in middleware context.
 * Returns null if not authenticated, or { id, email, name } if logged in.
 */
export async function getSession(req: Request): Promise<{
  id: string
  email?: string | null
  name?: string | null
} | null> {
  try {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
    })

    if (!token || !token.sub) {
      return null
    }

    return {
      id: token.sub,
      email: token.email as string | null,
      name: token.name as string | null,
    }
  } catch {
    // getToken fails gracefully when AUTH_SECRET is not set
    return null
  }
}
