"use client"

// Header with session-aware navigation
import Link from "next/link"
import { useSession } from "next-auth/react"

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-white">
            <span style={{fontSize:"1.5rem"}}>*</span>
            <span>BibiTool</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/summarize" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">Summarize</Link>
            <Link href="/history" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">History</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <Link href="/dashboard" className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors">
              {session.user?.name || session.user?.email || "Dashboard"}
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors">Login</Link>
              <Link href="/register" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors">Register</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}