// Prisma client singleton — lazily initialized
//
// Prisma v7+ requires either `adapter` or `accelerateUrl` in its constructor.
// For Phase 1, we use a lazy proxy so the client is only created at runtime
// when the first database call is made, not at module import / build time.

import { PrismaClient } from "@/generated/prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let cached: PrismaClient | undefined

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma

  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL or POSTGRES_URL_NON_POOLING is not set."
    )
  }

  // Supabase requires SSL/TLS, but its cert chain has self-signed CAs.
  // Replace sslmode=require with no-verify to reject unauthorized errors.
  const fixedUrl = databaseUrl.includes("sslmode=")
    ? databaseUrl.replace(/sslmode=require/, "sslmode=no-verify")
    : databaseUrl + (databaseUrl.includes("localhost") ? "" : "?sslmode=no-verify")

  const pool = new pg.Pool({ connectionString: fixedUrl })
  const adapter = new PrismaPg(pool)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = new (PrismaClient as any)({ adapter, errorFormat: "colorless" })

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client
  }
  cached = client
  return client
}

// Builder-friendly proxy: defers PrismaClient instantiation until first use
function buildProxy(): PrismaClient {
  if (cached) return cached

  const proxy = new Proxy(
    {},
    {
      get(_, prop: string | symbol) {
        // Special case: client doesn't exist yet — return a noop so the
        // Next.js build can still collect page data without hitting the DB.
        if (typeof process !== "undefined" && process.env.NEXT_PHASE === "phase-production-build") {
          if (prop === "then") return undefined
          return () => undefined
        }
        const client = getClient()
        const value = (client as unknown as Record<string | symbol, unknown>)[prop]
        if (typeof value === "function") {
          return value.bind(client)
        }
        return value
      },
    }
  ) as unknown as PrismaClient

  cached = proxy as unknown as PrismaClient
  return cached as unknown as PrismaClient
}

export const prisma: PrismaClient = buildProxy()
