"use client"

// Dashboard — real user stats from API + AI key management
// Phase 6: credits, usage, history count, API key configuration with connectivity test

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

interface UserStats {
  usedToday: number
  totalSummaries: number
  remaining: number
}

interface ProviderKey {
  provider: string
  configured: boolean
  preview?: string
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  deepseek: "DeepSeek",
  anthropic: "Anthropic (Claude)",
}

const PROVIDER_PLACEHOLDERS: Record<string, string> = {
  openai: "sk-proj-...",
  deepseek: "sk-...",
  anthropic: "sk-ant-...",
}

function formatMinutes(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m >= 60) {
    const h = Math.floor(m / 60)
    return `${h}小时${m % 60}分钟`
  }
  if (s > 0 && m === 0) return `${s}秒`
  return `${m}分钟`
}

export default function DashboardPage() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [keys, setKeys] = useState<ProviderKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ---- Key management state ----
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({})
  const [savingProvider, setSavingProvider] = useState<string | null>(null)
  const [testingProvider, setTestingProvider] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<
    Record<string, { ok: boolean; message: string } | null>
  >({})
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Load stats + keys
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, keysRes] = await Promise.all([
        fetch("/api/user/stats"),
        fetch("/api/keys"),
      ])
      const statsData = await statsRes.json()
      const keysData = await keysRes.json()

      if (!statsRes.ok) throw new Error(statsData.error?.message || "Failed")
      if (!keysRes.ok) throw new Error(keysData.error?.message || "Failed")

      setStats(statsData)
      setKeys(keysData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save a key for a provider
  const handleSaveKey = useCallback(
    async (provider: string) => {
      const keyValue = keyInputs[provider]?.trim()
      if (!keyValue) return

      setSavingProvider(provider)
      try {
        const res = await fetch("/api/keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, key: keyValue }),
        })
        const data = await res.json()
        if (!data.ok) throw new Error(data.error?.message || "Failed")
        setKeyInputs((prev) => ({ ...prev, [provider]: "" }))
        await loadData()
      } catch (e) {
        setError(e instanceof Error ? e.message : "保存失败")
      } finally {
        setSavingProvider(null)
      }
    },
    [keyInputs, loadData]
  )

  // Test connectivity
  const handleTest = useCallback(async (provider: string) => {
    setTestingProvider(provider)
    setTestResults((prev) => ({ ...prev, [provider]: null }))
    try {
      const res = await fetch("/api/keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      })
      const data = await res.json()
      setTestResults((prev) => ({ ...prev, [provider]: data }))
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [provider]: { ok: false, message: "请求失败" },
      }))
    } finally {
      setTestingProvider(null)
    }
  }, [])

  // Delete a key
  const handleDeleteKey = useCallback(
    async (provider: string) => {
      setDeleteConfirm(null)
      try {
        const res = await fetch(`/api/keys?provider=${provider}`, {
          method: "DELETE",
        })
        const data = await res.json()
        if (!data.ok) throw new Error(data.error?.message || "Failed")
        setTestResults((prev) => ({ ...prev, [provider]: null }))
        await loadData()
      } catch (e) {
        setError(e instanceof Error ? e.message : "删除失败")
      }
    },
    [loadData]
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
        用户面板
      </h1>
      <p className="mt-2 text-zinc-500">
        管理你的账户、配额和 AI API Key
      </p>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
          <button onClick={loadData} className="ml-3 underline font-medium">
            重试
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-2xl">⏱️</div>
          <h2 className="mt-3 text-sm font-medium text-zinc-500">剩余额度</h2>
          {loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
              {stats ? formatMinutes(stats.remaining) : "—"}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-2xl">📊</div>
          <h2 className="mt-3 text-sm font-medium text-zinc-500">今日用量</h2>
          {loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
              {stats ? formatMinutes(stats.usedToday) : "—"}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-2xl">📝</div>
          <h2 className="mt-3 text-sm font-medium text-zinc-500">总结次数</h2>
          {loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
              {stats?.totalSummaries ?? "—"}
            </p>
          )}
        </div>
      </div>

      {/* AI API Key Management */}
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-white">
            🤖 AI API Key 配置
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            配置至少一个 AI 服务商的 API Key 即可使用总结功能。你的 Key
            将被加密存储，支持 OpenAI / DeepSeek / Anthropic。
          </p>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {keys.map((k) => {
            const isSaving = savingProvider === k.provider
            const isTesting = testingProvider === k.provider
            const testR = testResults[k.provider]
            const showDelete = deleteConfirm === k.provider

            return (
              <div key={k.provider} className="px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Provider label + status */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        {PROVIDER_LABELS[k.provider] || k.provider}
                      </span>
                      {k.configured ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                          ✅ 已配置 {k.preview}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          ⚪ 未配置
                        </span>
                      )}
                    </div>

                    {/* Test result */}
                    {testR && (
                      <p
                        className={`mt-1 text-xs ${testR.ok ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
                      >
                        {testR.ok ? "✅" : "❌"} {testR.message}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {k.configured ? (
                      <>
                        <button
                          onClick={() => handleTest(k.provider)}
                          disabled={isTesting}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
                        >
                          {isTesting ? "测试中..." : "测通"}
                        </button>
                        {showDelete ? (
                          <>
                            <button
                              onClick={() => handleDeleteKey(k.provider)}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                            >
                              确认删除
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
                            >
                              取消
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(k.provider)}
                            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors"
                          >
                            删除
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          value={keyInputs[k.provider] || ""}
                          onChange={(e) =>
                            setKeyInputs((prev) => ({
                              ...prev,
                              [k.provider]: e.target.value,
                            }))
                          }
                          placeholder={PROVIDER_PLACEHOLDERS[k.provider]}
                          className="w-56 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-600"
                        />
                        <button
                          onClick={() => handleSaveKey(k.provider)}
                          disabled={
                            isSaving || !keyInputs[k.provider]?.trim()
                          }
                          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
                        >
                          {isSaving ? "保存中..." : "保存"}
                        </button>
                        <button
                          onClick={async () => {
                            // test with the key currently being input (before saving)
                            const raw = keyInputs[k.provider]?.trim()
                            setTestingProvider(k.provider)
                            setTestResults((prev) => ({
                              ...prev,
                              [k.provider]: null,
                            }))
                            try {
                              const res = await fetch("/api/keys/test", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  provider: k.provider,
                                  key: raw || undefined,
                                }),
                              })
                              const data = await res.json()
                              setTestResults((prev) => ({
                                ...prev,
                                [k.provider]: data,
                              }))
                            } catch {
                              setTestResults((prev) => ({
                                ...prev,
                                [k.provider]: {
                                  ok: false,
                                  message: "请求失败",
                                },
                              }))
                            } finally {
                              setTestingProvider(null)
                            }
                          }}
                          disabled={
                            isTesting || !keyInputs[k.provider]?.trim()
                          }
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
                        >
                          {isTesting ? "..." : "测通"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8 flex items-center gap-4">
        <Link
          href="/summarize"
          className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
        >
          开始总结
        </Link>
        <Link
          href="/history"
          className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
        >
          查看历史
        </Link>
      </div>
    </div>
  )
}
