// Root layout
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "BibiTool — AI 视频内容总结工具",
    template: "%s | BibiTool",
  },
  description:
    "粘贴 B站、YouTube 视频链接，AI 一键生成结构化总结、思维导图和章节导航。",
  keywords: ["B站总结", "YouTube总结", "AI视频总结", "视频摘要", "BibiGPT"],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://bibitool.vercel.app"
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "BibiTool — AI 视频内容总结工具",
    description:
      "粘贴 B站、YouTube 视频链接，AI 一键生成结构化总结、思维导图和章节导航。",
    url: "/",
    siteName: "BibiTool",
    locale: "zh_CN",
    type: "website",
    images: [
      {
        url: "/api/og?title=BibiTool+-+AI+Video+Summary",
        width: 1200,
        height: 630,
        alt: "BibiTool Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BibiTool — AI 视频内容总结工具",
    description:
      "粘贴 B站、YouTube 视频链接，AI 一键生成结构化总结、思维导图和章节导航。",
    images: ["/api/og?title=BibiTool+-+AI+Video+Summary"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <SpeedInsights />
      </body>
    </html>
  )
}
