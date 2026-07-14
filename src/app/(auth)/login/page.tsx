"use client"

import { useState, useCallback, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get("registered")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setLoading(true)

      try {
        const result = await signIn("credentials", {
          email: email.trim(),
          password,
          redirect: false,
        })

        if (result?.error) {
          setError(result.error)
          return
        }

        router.push("/dashboard")
        router.refresh()
      } catch {
        setError("登录失败，请稍后重试")
      } finally {
        setLoading(false)
      }
    },
    [email, password, router]
  )

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            登录 BibiTool
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            欢迎回来，继续你的 AI 视频总结之旅
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {registered === "true" && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
              注册成功！请使用你的邮箱和密码登录。
            </div>
          )}
          <div className="space-y-4">
            <Link
              href="/api/auth/signin/github"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub 账号登录
            </Link>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-950">
                  或使用邮箱登录
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">邮箱</label>
                <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-600" placeholder="your@email.com" />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">密码</label>
                <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-600" placeholder="••••••••" />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors">
                {loading ? "登录中..." : "登录"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-sm text-zinc-500">
          还没有账号？{" "}
          <Link href="/register" className="font-medium text-zinc-900 hover:underline dark:text-white">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100vh-8rem)] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
