# BibiGPT 复刻开发计划

> 制定日期：2026-07-13  
> 项目代号：BibiTool（B站视频总结工具）  
> 复刻对象：BibiGPT.co — AI 音视频内容一键总结平台  
> 参考文档：`BibiGPT技术分析与开发任务书.md`、`BibiGPT核心功能全面调研报告.md`

---

## 一、项目定位

构建一个以 **B站** 为核心、逐步扩展至 YouTube 等平台的 AI 视频内容总结工具，覆盖"链接输入 → 字幕提取 → AI 总结 → 结构化输出"完整链路。

### MVP 范围（v1.0）

| 维度 | 范围 |
|------|------|
| 平台 | B站 + YouTube + 本地音视频 |
| 核心功能 | URL粘贴 → 字幕提取 → AI 总结 → 章节拆分 → 思维导图 |
| 输出 | Markdown 总结 + 可点击时间戳 + 思维导图 |
| 用户系统 | 注册/登录 + 用量配额 |
| 部署 | 单体 Web 应用（Vercel） |

### 目标不包含（v2.0+）

浏览器扩展、桌面端/移动端、微信助理、开放 API、MCP Server、支付/订阅等先不做。

---

## 二、总体架构

```
用户输入链接
    │
    ▼
┌─────────────────┐
│  平台路由层       │ ← 识别 B站 / YouTube / 本地文件
└────────┬────────┘
         ▼
┌─────────────────┐
│  字幕/音频提取    │ ← B站CC字幕 / YouTube 字幕 / Whisper 转录
└────────┬────────┘
         ▼
┌─────────────────┐
│  文本标准化       │ ← 统一格式 {start, end, text}[]
└────────┬────────┘
         ▼
┌─────────────────┐
│  AI 总结引擎      │ ← 分块 → 局部摘要 → 全局整合（流式输出）
└────────┬────────┘
         ▼
┌─────────────────┐
│  结构化输出       │ ← Markdown / 章节 / 思维导图 / 高光笔记
└─────────────────┘
```

---

## 三、技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 前端框架 | Next.js 16 (App Router) | SSR/SSG，与 Vercel 深度集成 |
| UI | Tailwind CSS + shadcn/ui | 快速构建现代化 UI |
| 后端 | Next.js API Routes / Edge Functions | 免运维 Serverless |
| AI SDK | Vercel AI SDK | 统一多模型接口，流式原生支持 |
| LLM | GPT-4o-mini（主力）+ DeepSeek（降级） | 成本控制 |
| 语音识别 | OpenAI Whisper API（主力）+ faster-whisper（自部署降级） | 双引擎 |
| 数据库 | Supabase (PostgreSQL) | 免费额度高，有实时订阅 |
| 缓存 | Upstash Redis | Serverless Redis，与 Vercel 原生集成 |
| 认证 | NextAuth.js v5 (Auth.js) | 开源免费 |
| 对象存储 | Supabase Storage / Vercel Blob | 本地文件暂存 |
| 支付 | v2.0 再加 | MVP 不做 |

---

## 四、开发阶段

### 阶段一：基础架构（第 1-2 周）

**目标**：项目能跑、能部署、能登录。

| 编号 | 任务 | 说明 |
|------|------|------|
| 1.1 | Next.js 项目初始化 | App Router + TypeScript + Tailwind + shadcn/ui |
| 1.2 | 目录结构搭建 | 骨架搭建，路由规划 |
| 1.3 | 数据库设计 (Prisma + Supabase) | User / Summary / ApiUsage 三张核心表 |
| 1.4 | 认证系统 | NextAuth.js v5，邮箱 + GitHub OAuth |
| 1.5 | 基础布局与路由 | 首页 / 总结页 / 历史记录 / 用户面板 |
| 1.6 | Vercel 部署 | 生产环境 + 预览环境，自定义域名 |
| 1.7 | 缓存层搭建 | Upstash Redis 集成 |

**交付物**：可部署的 Next.js 应用，含登录系统和空页面骨架。

---

### 阶段二：平台适配——字幕提取（第 2-4 周）

**目标**：粘贴 B站/YouTube 链接，能拿到字幕。

| 编号 | 任务 | 说明 |
|------|------|------|
| 2.1 | 平台 URL 识别 | 正则匹配 B站 (b23.tv, bv/av号) / YouTube / 本地 |
| 2.2 | **B站字幕提取** | 核心难点 |
| 2.2a | ┗ B站 API 对接 | 获取视频元信息（标题/封面/cid） |
| 2.2b | ┗ CC 字幕下载解析 | B站 AI 字幕 + UP 主上传字幕 |
| 2.2c | ┗ Cookie 管理 | Cookie 池轮换 + User-Agent 轮换 + 自适应重试 |
| 2.2d | ┗ 降级：弹幕提取 | 无字幕时兜底方案 |
| 2.3 | **YouTube 字幕提取** | youtubei.js / youtube-transcript 库 |
| 2.4 | **音频转文字** | Whisper API 集成 + 音频预处理（FFmpeg） |
| 2.5 | 字幕格式标准化 | 各平台字幕统一为 `{start, end, text}[]` |
| 2.6 | 字幕缓存 | Redis 缓存 24h，热门延长至 7d |
| 2.7 | 视频信息展示组件 | 标题/封面/时长识别后预览 |

**交付物**：输入链接 → 自动识别平台 → 提取字幕 → 前端展示字幕文本。

---

### 阶段三：AI 总结引擎（第 4-6 周）

**目标**：有字幕 → AI 总结 → 流式展示。

| 编号 | 任务 | 说明 |
|------|------|------|
| 3.1 | 文本智能分块 | 按语义断点分块，每块 ~3000 字符，块间 300 字符重叠 |
| 3.2 | 局部摘要生成 | 并行调用 LLM 对各块生成摘要 |
| 3.3 | 全局整合总结 | 合并局部摘要 → LLM 生成结构化总结（流式输出） |
| 3.4 | Prompt 工程 | 省流模式 / 详细模式 / 自定义模式 |
| 3.5 | 多模型路由 | GPT-4o-mini 主力 → DeepSeek 降级 → 失败自动切换 |
| 3.6 | 流式响应实现 | Edge Function ReadableStream → 前端打字机效果 |
| 3.7 | 总结缓存 | 同视频+同模式 7 天缓存 |
| 3.8 | 总结展示组件 | Markdown 渲染 + 时间戳可点击 + 章节导航 |

**交付物**：粘贴链接 → 等几秒 → 流式看到 AI 总结生成 → 可交互的总结页。

---

### 阶段四：内容输出（第 5-7 周）

**目标**：不只是总结文字，还要多种形式输出。

| 编号 | 任务 | 说明 |
|------|------|------|
| 4.1 | 章节智能拆分 | AI 自动分段，每章时间戳 + 摘要 |
| 4.2 | 思维导图 | markmap 或 ReactFlow 渲染，从总结 Markdown 提取层级 |
| 4.3 | 高光笔记 | 重点内容高亮 + 一键收藏 |
| 4.4 | AI 改写（视频转文章） | 可选：总结 → 叙事化文章 |
| 4.5 | 多格式导出 | 复制 Markdown / 导出 PDF / 导出 SRT 字幕 |
| 4.6 | 分享卡片 | OG Image 自动生成 |

**交付物**：总结页具备章节导航、思维导图切换、高光标记、导出功能。

---

### 阶段五：用户系统完善（第 6-8 周）

**目标**：用户管理、配额、历史记录。

| 编号 | 任务 | 说明 |
|------|------|------|
| 5.1 | 用量配额系统 | 免费用户每日 N 次，按视频时长计费分钟数 |
| 5.2 | 历史记录 | 搜索 / 筛选 / 排序，可重新打开查看 |
| 5.3 | 用户面板 | 用量统计、API Key 管理（预留）、设置 |
| 5.4 | 限流系统 | Upstash Rate Limiting，按用户 + 按 IP 双层 |
| 5.5 | 错误处理完善 | Error Boundary + 重试 + 友好错误提示 |

**交付物**：完整的用户体系，配额管理和历史记录。

---

### 阶段六：测试与上线（第 8-10 周）

**目标**：稳定可靠，正式发布。

| 编号 | 任务 | 说明 |
|------|------|------|
| 6.1 | 单元测试 (Vitest) | 平台解析 / 字幕格式化 / 分块算法 |
| 6.2 | E2E 测试 (Playwright) | 完整用户流程 |
| 6.3 | 性能优化 | Lighthouse >= 90，API P99 < 3s |
| 6.4 | SEO | 元标签 / Sitemap / 结构化数据 |
| 6.5 | CI/CD | GitHub Actions 自动部署 |
| 6.6 | 监控 | Sentry 错误追踪 + 用量监控 |
| 6.7 | 上线 | 正式域名 + 公告 |

**交付物**：生产就绪的 MVP，正式上线。

---

## 五、目录结构

```
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx             # 根布局
│   ├── page.tsx               # 首页（Landing）
│   ├── (auth)/                # 登录/注册
│   ├── summarize/             # 总结页
│   ├── dashboard/             # 用户面板
│   ├── history/               # 历史记录
│   └── api/                   # API Routes
│       ├── summarize/         # 总结接口（Edge）
│       ├── subtitle/          # 字幕提取接口
│       ├── auth/              # NextAuth 回调
│       └── export/            # 导出接口
├── components/
│   ├── ui/                    # shadcn/ui 组件
│   ├── video/                 # VideoInput / PlayerCard
│   ├── summary/               # SummaryView / ChapterNav / MindMapView
│   ├── export/                # ShareCard / ExportButtons
│   └── layout/                # Header / Footer / Sidebar
├── lib/
│   ├── platforms/             # 平台适配
│   │   ├── bilibili.ts        # B站：API、字幕、Cookie
│   │   ├── youtube.ts         # YouTube：字幕提取
│   │   ├── local.ts           # 本地文件处理
│   │   └── index.ts           # 路由：detectPlatform() / resolveVideo()
│   ├── ai/
│   │   ├── chunk.ts           # 文本分块
│   │   ├── summarize.ts       # 多级摘要管道 + 流式
│   │   ├── chapter.ts         # 章节拆分
│   │   ├── prompt.ts          # Prompt 模板库
│   │   └── router.ts          # 多模型路由
│   ├── cache.ts               # Redis 缓存策略
│   ├── db.ts                  # Prisma 客户端
│   ├── auth.ts                # NextAuth 配置
│   └── utils.ts               # 工具函数
├── hooks/                     # React Hooks
├── types/                     # TypeScript 类型
└── styles/                    # 全局样式
```

---

## 六、关键风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| B站 API 变更/封Cookie | 核心功能不可用 | Cookie 池轮换；降级到弹幕/Whisper；参考 B站 API 非官方文档持续跟进 |
| AI API 成本超预期 | 利润率下降 | 强力缓存（目标命中率 > 60%）；GPT-4o-mini 主力；支持 DeepSeek 降价 |
| Vercel Edge Function 超时 | 长视频处理失败 | 分片处理 + 流式返回 + 轮询模式 |
| 视频版权合规 | 法律风险 | 仅处理字幕不下载视频；遵守 robots.txt；用户协议声明 |

---

## 七、成本估算（MVP）

| 项目 | 月费 |
|------|:--:|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| Upstash Redis | $10 |
| OpenAI API (GPT-4o-mini) | $100-200 |
| Whisper API | $20-50 |
| 域名 | ~$1 |
| **合计** | **~$180-300/月** |

---

## 八、后续规划（v2.0+）

- 浏览器扩展（Chrome/Edge/Firefox）
- 更多平台（抖音/小红书/播客/TED）
- 订阅付费（Stripe + 支付宝/微信支付）
- 开放 API + MCP Server
- 笔记工具同步（Notion/Obsidian/飞书）
- 移动端适配 / PWA
- AI 视频对话（Chat with Video）
- 多语言支持（中/英/日/韩）
- SVB 信息图生成
- 播客式生成
