// Footer component
import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span>🎬 BibiTool</span>
            <span>— AI 视频内容总结工具</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <Link
              href="/summarize"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              开始总结
            </Link>
            <Link
              href="/history"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              历史记录
            </Link>
          </div>
        </div>
        <div className="mt-6 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} BibiTool. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
