// Landing page
import Link from "next/link"

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-20 pt-20 sm:px-6 sm:pt-28">
        <div className="max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
            视频内容，
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI 一键总结
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-500 sm:text-xl">
            粘贴 B站 / YouTube 视频链接，自动提取字幕，AI
            生成结构化总结、章节导航和思维导图。
          </p>
        </div>

        {/* URL Input */}
        <div className="mt-12 w-full max-w-2xl">
          <div className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <input
              type="url"
              placeholder="粘贴 B站 / YouTube 视频链接..."
              className="flex-1 border-0 bg-transparent px-4 py-3 text-sm placeholder:text-zinc-400 focus:outline-none"
            />
            <Link
              href="/summarize"
              className="flex items-center rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
            >
              开始总结
            </Link>
          </div>
          <p className="mt-3 text-center text-xs text-zinc-400">
            支持 B站 (bilibili.com) · YouTube (youtube.com) · 本地音视频文件
          </p>
        </div>

        {/* Stats / Social Proof */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-zinc-400">
          <span>🎯 多平台支持</span>
          <span className="hidden sm:inline">·</span>
          <span>🤖 多模型 AI 引擎</span>
          <span className="hidden sm:inline">·</span>
          <span>⚡ 流式实时生成</span>
          <span className="hidden sm:inline">·</span>
          <span>💰 注册送 120 分钟</span>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-zinc-100 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
            核心功能
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-3xl">🔗</div>
              <h3 className="mt-4 font-semibold text-zinc-900 dark:text-white">
                多平台支持
              </h3>
              <p className="mt-2 text-sm text-zinc-500">
                支持 B站、YouTube 等主流视频平台，自动识别链接来源
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-3xl">🎯</div>
              <h3 className="mt-4 font-semibold text-zinc-900 dark:text-white">
                精准字幕提取
              </h3>
              <p className="mt-2 text-sm text-zinc-500">
                自动提取平台字幕，支持无字幕视频 Whisper AI 语音转文字
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-3xl">🧠</div>
              <h3 className="mt-4 font-semibold text-zinc-900 dark:text-white">
                AI 智能总结
              </h3>
              <p className="mt-2 text-sm text-zinc-500">
                多模型 AI 引擎生成结构化总结，支持省流/详细多种模式
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-3xl">🗺️</div>
              <h3 className="mt-4 font-semibold text-zinc-900 dark:text-white">
                思维导图 & 导出
              </h3>
              <p className="mt-2 text-sm text-zinc-500">
                自动生成思维导图，支持导出 Markdown/PDF，同步笔记工具
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-3xl bg-zinc-900 p-12 text-center dark:bg-zinc-100">
          <h2 className="text-2xl font-bold text-white dark:text-zinc-900 sm:text-3xl">
            准备好了吗？
          </h2>
          <p className="mt-3 text-zinc-400 dark:text-zinc-600">
            注册即送 120 分钟免费额度，开始你的 AI 视频总结之旅
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-xl bg-white px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 transition-colors"
            >
              免费注册
            </Link>
            <Link
              href="/summarize"
              className="rounded-xl border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white dark:border-zinc-300 dark:text-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-900 transition-colors"
            >
              直接体验
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
