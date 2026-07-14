"use client"

// App-level error page
// Next.js catches unhandled errors in nested layouts/pages and renders this

import { useEffect } from "react"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("App error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-6">😵</div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
          出了点问题
        </h1>
        <p className="text-sm text-zinc-500 mb-2">
          {error.message || "页面加载时发生了意外错误"}
        </p>
        {error.digest && (
          <p className="text-xs text-zinc-400 font-mono mb-6">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
        >
          再试一次
        </button>
      </div>
    </div>
  )
}
