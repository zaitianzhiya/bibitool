"use client"

// Error Boundary — catches render errors, shows fallback with retry

import { Component, ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 dark:border-red-900 dark:bg-red-950">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              页面出现错误
            </h2>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              {this.state.error?.message || "组件渲染失败"}
            </p>
            <button
              onClick={this.handleRetry}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
