// Prisma client singleton — lazily initialized
//
// Prisma v7+ requires either `adapter` or `accelerateUrl` in its constructor.
// We use @prisma/adapter-pg to connect directly to Supabase PostgreSQL.

import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let cached: PrismaClient | undefined

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and configure your database."
    )
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
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
