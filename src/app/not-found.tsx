// Custom 404 page
import Link from "next/link"

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">
          页面未找到
        </h1>
        <p className="text-sm text-zinc-500 mb-8">
          你访问的页面不存在或已被移除。可能是链接地址有误，或页面已过期。
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
          >
            返回首页
          </Link>
          <Link
            href="/summarize"
            className="rounded-xl border border-zinc-200 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
          >
            开始总结
          </Link>
        </div>
      </div>
    </div>
  )
}
