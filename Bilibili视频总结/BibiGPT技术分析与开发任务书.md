# BibiGPT 技术栈深度分析与同类网站开发任务书

> 研究日期：2026年6月7日  
> 分析对象：BibiGPT.co（原 BiliGPT）—— AI 驱动的多平台视频内容一键总结工具

---

## 第一部分：BibiGPT 底层技术分析

### 一、整体架构

BibiGPT 采用 **四阶流水线处理架构**，将原始视频链接转化为结构化知识：

```
用户输入视频链接 → 链接解析系统 → 字幕/音频提取 → AI总结引擎 → 结构化输出
```

核心处理流程对应四大阶段：

| 阶段 | 功能 | 关键技术 |
|------|------|----------|
| ① 链接解析 | 识别平台来源、提取视频ID | 正则匹配多平台URL（30+平台） |
| ② 字幕/音频提取 | 获取语音内容转文字 | Whisper ASR / SenseVoice 双引擎 |
| ③ AI总结 | 将文字稿提炼为结构化摘要 | 多模型路由（GPT/Claude/Qwen等） |
| ④ 缓存与输出 | 加速响应、多种格式导出 | Upstash Redis + Markdown/SRT/思维导图 |

### 二、全栈技术栈一览

| 层级 | 技术选型 | 用途 |
|------|----------|------|
| **Web前端框架** | Next.js (React) | SSR/SSG Web应用 |
| **桌面端** | Tauri 2.x（Rust + Web前端） | macOS/Windows 原生应用 |
| **移动端** | Expo (React Native) | iOS/Android 应用 |
| **后端运行时** | Vercel Edge Functions（Serverless） | API路由处理、流式响应 |
| **AI SDK** | Vercel AI SDK / 多模型路由 | 统一接口调用各AI模型 |
| **AI模型（语音识别）** | OpenAI Whisper / 阿里 SenseVoice | 音频转文字 |
| **AI模型（总结生成）** | GPT-4o / Claude / Qwen3 / Gemini 等 | 内容总结、结构化输出 |
| **缓存层** | Upstash Redis | 字幕缓存、摘要结果缓存 |
| **限流** | Upstash Rate Limiting | 防止API滥用 |
| **向量检索** | Embedding + 向量数据库 | RAG知识库增强 |
| **浏览器端AI** | Whisper via WebGPU | 本地运行语音转文字（隐私优先） |
| **浏览器扩展** | Chrome/Firefox/Edge Extension API | 浏览器内一键总结 |
| **网络请求** | axios + 自定义拦截器 | 平台数据抓取、反爬处理 |
| **Agent集成** | MCP Server / OpenAPI | 供AI Agent调用 |

### 三、核心技术细节

#### 3.1 平台适配层（字幕提取）

BibiGPT 的核心竞争力之一是 **30+ 平台适配模块**。对于B站，其处理流程为：

1. **URL解析**：从视频链接提取 BV号/AV号
2. **获取视频信息**：调用B站API获取 `cid`（视频分P标识）、标题、封面等
3. **字幕获取**：通过B站字幕接口获取CC字幕（JSON格式），支持的格式包括：
   - B站官方CC字幕（AI生成字幕 + UP主上传字幕）
   - 若无字幕，则下载音频后通过Whisper转录
4. **Cookie池轮换**：维护动态Cookie池，配合自适应重试机制突破平台限制
5. **字幕标准化**：将不同平台的字幕统一为标准化格式（带时间戳的SRT/JSON）

平台路由核心逻辑示意：

```typescript
export async function fetchSubtitle(videoConfig) {
  const { service, videoId } = videoConfig
  if (service === VideoService.Youtube) {
    return await fetchYoutubeSubtitle(videoId)
  }
  if (service === VideoService.Bilibili) {
    return await fetchBilibiliSubtitle(videoId)
  }
  // ... 其他30+平台适配
}
```

#### 3.2 AI总结引擎

音频转为文字稿后，真正的技术挑战在于理解内容逻辑并生成高质量摘要：

```
文字稿
  → 内容分块（按语义断点，每块≈3000字符）
  → 并行调用LLM对各块生成局部摘要
  → 整合所有局部摘要 → 最终结构化输出
```

关键技术方案：

| 技术点 | 实现方式 |
|--------|----------|
| **多模型路由** | 不绑定单一模型，根据内容类型、用户语言、成本预算动态选择最优模型 |
| **长文本处理** | 动态分块算法——按语义断点而非固定字数分块，保持上下文完整性 |
| **摘要策略** | 多级摘要：先局部摘要→再全局整合，解决长文本超出token限制的问题 |
| **提示词工程** | Prompt Engineering + RAG检索增强生成 |
| **摘要粒度** | 支持"省流模式"（关键要点）和"详细模式"（完整章节摘要） |
| **结构化输出** | generateObject + Zod Schema 强制模型输出合法JSON结构 |

#### 3.3 语音转文字方案

BibiGPT 采用双模式架构：

**模式一：浏览器本地运行（免费工具）**
- 基于 WebGPU 在浏览器中直接加载运行 Whisper 模型
- 数据完全不出设备，100%本地处理，零隐私风险
- 支持99+种语言自动检测

**模式二：服务端处理（主产品）**
- 基于 OpenAI Whisper API 或其自部署变体
- 辅助集成阿里 SenseVoice 引擎
- 多语言和嘈杂环境下鲁棒性表现优秀

**成本分析对照（Whisper API vs 自部署）**：

| 月用量 | Whisper API 成本 | 自部署成本 | 推荐 |
|--------|:--:|:--:|------|
| < 500小时 | ~$36-180 | ~$861 | API更优 |
| 500-2,000小时 | ~$180-720 | ~$861 | API或混合 |
| 2,400+小时 | ~$864+ | ~$861 | 自部署开始有优势 |
| > 3,000小时 | ~$1,080+ | ~$861 | 自部署更优 |

#### 3.4 缓存与成本优化策略

- **字幕缓存**：24小时过期，热门视频自动延长过期时间
- **摘要缓存**：避免昂贵的AI重复生成
- **Redis 分片**：按平台和内容类型分别存储
- **多级缓存**：内存缓存（高频热点）→ Redis（中频数据）→ 数据库（低频数据）
- **用户自带API Key**：支持用户使用自己的OpenAI Key，降低服务端成本

#### 3.5 流式响应（Streaming）

基于 Vercel Edge Functions 的流式响应能力：

1. 前端发起请求 → Edge Function 接收
2. Edge Function 调用 OpenAI API（`stream: true`）
3. 将 Stream 逐块转发给前端（ReadableStream）
4. 前端使用 `useChat` Hook 或 EventSource 实时渲染
5. 用户看到逐字/逐句生成的总结内容

### 四、API 设计

BibiGPT 提供完整的 RESTful API（Beta阶段），认证方式为 Bearer Token：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/summarize` | GET | 视频/音频一键总结 |
| `/api/v1/summarizeWithConfig` | POST | 自定义prompt的总结 |
| `/api/v1/getSubtitle` | GET | 仅获取字幕（不总结） |
| `/api/v1/express` | GET | AI改写为结构化文章 |
| `/api/v1/getPolishedText` | GET | AI字幕润色分段 |
| `/api/open/[apiToken]/chat` | - | AI问答（将下线） |

提供 OpenAPI Schema（`api.bibigpt.co/api/openapi.json`），支持 Agent 集成（MCP Server / OpenAPI / Anthropic Skill）。

### 五、商业模式与付费方案

| 方案 | 价格（美元） | 核心权益 |
|------|:--:|------|
| Plus 会员 | $19.80/月 | 无限次数、月限6000分钟本地文件、高级模型、笔记同步 |
| Pro 会员 | $34.80/月 | 含Plus + 无限本地视频、视觉分析、AI封面/短视频生成 |
| 会员合伙人 | $888买断 | 永久有效、全功能解锁、33%推广分成 |
| 按需时长包 | $4.9起 | 600~3600分钟弹性购买 |

支付支持支付宝、微信支付、PayPal。注册即送120分钟免费试用。

### 六、部署架构

```
                             ┌─────────────────────────┐
                             │     Vercel (Serverless)   │
                             │  ┌───────────────────┐   │
        用户浏览器            │  │  Next.js 前端      │   │
    ┌──────────────┐         │  │  (SSR/SSG/CSR)    │   │
    │ React SPA    │◄────────┤  └───────────────────┘   │
    │ + useChat    │ 流式响应 │  ┌───────────────────┐   │
    └──────────────┘         │  │  Edge Functions    │   │
                             │  │  (API路由/流式)    │   │
    ┌──────────────┐         │  └───────┬───────────┘   │
    │ 浏览器扩展   │         └──────────┼───────────────┘
    └──────────────┘                    │
    ┌──────────────┐         ┌──────────┼───────────┐
    │ 桌面端Tauri  │         │          ▼           │
    └──────────────┘         │  ┌───────────────┐   │
    ┌──────────────┐         │  │ Upstash Redis  │   │
    │ 移动端Expo   │         │  │ (缓存 + 限流)  │   │
    └──────────────┘         │  └───────────────┘   │
                             │          │           │
                             │          ▼           │
                             │  ┌───────────────┐   │
                             │  │ 多模型AI路由   │   │
                             │  │ GPT/Claude/   │   │
                             │  │ Qwen/Gemini    │   │
                             │  └───────────────┘   │
                             └──────────────────────┘
```

### 七、开源竞品技术栈对比

| 项目 | 前端 | 后端 | 语音识别 | AI总结 | 部署 |
|------|------|------|----------|--------|------|
| **BibiGPT** | Next.js + Tauri | Vercel Edge | Whisper/SenseVoice | 多模型路由 | Vercel |
| **BiliSum** | Electron+React | FastAPI | FunASR/Whisper | Claude/本地LLM | Docker |
| **video-quick-eval** | CLI | Python | faster-whisper | OpenAI/本地 | 本地 |
| **gurrt** | CLI | Python | faster-whisper | Ollama/Groq | 本地 |
| **BibiGPT同类** | React+Vite | Hono/Cloudflare | Whisper API | GPT-4o | Cloudflare |

---

## 第二部分：同类网站开发任务书

基于以上技术分析，以下是开发一个类似 BibiGPT 的视频AI总结网站的完整任务分解。

### 项目概览

- **项目代号**：VideoAI-Summarizer
- **目标**：构建支持多平台（B站/YouTube优先）的视频内容AI总结Web应用
- **技术栈**：Next.js 16 + Vercel + AI SDK + Redis + PostgreSQL
- **开发周期估算**：12-16周（单人全职）或 6-8周（2-3人团队）

### 阶段一：基础架构搭建（第1-2周）

#### 任务1.1：项目初始化与技术选型确认

- [ ] 1.1.1 创建 Next.js 16 项目（App Router），配置 TypeScript
  ```bash
  npx create-next-app@latest video-ai-summarizer --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
  ```
- [ ] 1.1.2 安装核心依赖
  ```bash
  npm install ai @ai-sdk/openai @ai-sdk/anthropic zod axios
  npm install @upstash/redis @upstash/ratelimit
  npm install next-auth@beta prisma @prisma/client
  ```
- [ ] 1.1.3 配置 Tailwind CSS、shadcn/ui 组件库
- [ ] 1.1.4 配置 ESLint + Prettier + Husky（pre-commit hooks）
- [ ] 1.1.5 搭建项目目录结构（参考下文建议结构）

**建议目录结构**：
```
src/
├── app/                    # Next.js App Router 页面
│   ├── api/                # API 路由 (Edge Functions)
│   │   ├── summarize/      # 总结接口
│   │   ├── subtitle/       # 字幕提取接口
│   │   └── auth/           # 认证接口
│   ├── (auth)/             # 登录/注册页面
│   ├── dashboard/          # 用户面板
│   └── layout.tsx
├── components/             # UI 组件
│   ├── ui/                 # shadcn/ui 基础组件
│   ├── video/              # 视频输入组件
│   ├── summary/            # 总结展示组件
│   └── layout/             # 布局组件
├── lib/                    # 核心逻辑
│   ├── platforms/          # 平台适配模块
│   │   ├── bilibili.ts     # B站字幕提取
│   │   ├── youtube.ts      # YouTube字幕提取
│   │   └── index.ts        # 平台路由
│   ├── ai/                 # AI 处理模块
│   │   ├── summarize.ts    # 总结引擎
│   │   ├── chunk.ts        # 文本分块
│   │   └── prompt.ts       # Prompt工程
│   ├── cache.ts            # 缓存策略
│   ├── auth.ts             # 认证配置
│   ├── db.ts               # 数据库客户端
│   └── utils.ts            # 工具函数
├── hooks/                  # React Hooks
├── types/                  # TypeScript 类型定义
└── styles/                 # 全局样式
```

#### 任务1.2：数据库设计

- [ ] 1.2.1 设计 PostgreSQL 数据模型（Prisma Schema）

```prisma
model User {
  id            String    @id @default(cuid())
  email         String?   @unique
  name          String?
  avatarUrl     String?
  apiKey        String?   @unique  // 用户自带API Key
  credits       Int       @default(120)  // 剩余分钟数
  createdAt     DateTime  @default(now())
  summaries     Summary[]
  subscriptions Subscription[]
}

model Summary {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  url         String             // 原始视频URL
  platform    String             // bilibili / youtube / ...
  videoId     String             // 平台视频ID
  title       String?            // 视频标题
  coverUrl    String?            // 封面图
  duration    Int?               // 视频时长（秒）
  subtitle    String?            // 字幕原文（JSON）
  summary     String?            // AI总结（Markdown）
  mode        String   @default("brief")  // brief / detailed
  model       String?            // 使用的AI模型
  status      String   @default("pending")  // pending/processing/done/error
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, createdAt])
  @@index([platform, videoId])
}

model Subscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  plan      String             // free / plus / pro
  status    String   @default("active")
  startAt   DateTime @default(now())
  expireAt  DateTime?
}

model ApiUsage {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime @default(now())
  duration  Int                // 使用分钟数
  tokens    Int?               // 消耗token数

  @@index([userId, date])
}
```

- [ ] 1.2.2 配置 Prisma 迁移并初始化数据库
- [ ] 1.2.3 部署 PostgreSQL（Vercel Postgres / Supabase / Neon / PlanetScale）

#### 任务1.3：认证系统

- [ ] 1.3.1 集成 NextAuth.js v5（Auth.js）
- [ ] 1.3.2 实现邮箱密码注册/登录
- [ ] 1.3.3 实现 OAuth 登录（GitHub / Google）
- [ ] 1.3.4 实现 API Key 生成与管理（用于开放 API）
- [ ] 1.3.5 实现 JWT 认证中间件（保护API路由）

### 阶段二：核心功能开发（第3-6周）

#### 任务2.1：平台适配模块——B站字幕提取

B站字幕获取的关键技术路线：

- [ ] 2.1.1 研究B站API，实现视频信息获取
  - 通过 BV号/AV号 互转
  - 调用 `api.bilibili.com/x/web-interface/view` 获取视频元信息
  - 提取 cid（分P标识）、标题、封面
- [ ] 2.1.2 实现B站CC字幕获取
  - 调用 `api.bilibili.com/x/player/v2` 获取字幕列表
  - 解析 `subtitle.subtitles` 中的字幕URL
  - 下载并解析JSON格式字幕
- [ ] 2.1.3 实现字幕降级策略
  - 优先：CC字幕（AI生成字幕 / UP主上传字幕）
  - 降级方案1：通过B站接口获取弹幕作为辅助文本
  - 降级方案2：下载视频音频 → Whisper转录
- [ ] 2.1.4 实现Cookie管理与反爬
  - Cookie池轮换机制
  - 自适应重试（指数退避 + 随机延迟）
  - User-Agent轮换
- [ ] 2.1.5 实现B站视频信息缓存（热门视频30天，普通视频7天）

**B站API关键端点**：
```
获取视频信息: https://api.bilibili.com/x/web-interface/view?bvid={bvid}
获取播放器信息: https://api.bilibili.com/x/player/v2?bvid={bvid}&cid={cid}
获取字幕列表: https://api.bilibili.com/x/player/v2?bvid={bvid}&cid={cid}
获取视频分P列表: https://api.bilibili.com/x/player/pagelist?bvid={bvid}
```

#### 任务2.2：平台适配模块——YouTube字幕提取

- [ ] 2.2.1 实现YouTube字幕获取
  - 方案A：使用 YouTube Data API v3（需API Key，有配额限制）
  - 方案B：使用 yt-dlp 提取字幕（需服务端运行，有合规风险）
  - 方案C（推荐）：使用 youtube-transcript 或 youtubei.js 库
- [ ] 2.2.2 实现字幕语言自动选择（优先中文 → 英文 → 其他）
- [ ] 2.2.3 实现字幕格式标准化（统一转为 `{start, end, text}[]` 格式）

#### 任务2.3：音频转文字引擎（Whisper集成）

- [ ] 2.3.1 集成 OpenAI Whisper API
  - 音频预处理（FFmpeg 转码为标准格式）
  - 处理大文件分片上传（25MB限制）
- [ ] 2.3.2 实现本地 Whisper 降级方案
  - 方案A：faster-whisper（CTranslate2，速度更快）
  - 方案B：FunASR（阿里达摩院，中文优化）
- [ ] 2.3.3 实现音视频分离（FFmpeg / ffmpeg.wasm）
  - 从视频中提取音频流
  - 格式转换（mp4→mp3/wav）
  - 采样率标准化（16kHz）
- [ ] 2.3.4 实现WebGPU浏览器端Whisper（可选：隐私模式）
  - 使用 whisper-webgpu 或 transformers.js 的 whisper 模型

#### 任务2.4：AI总结引擎

- [ ] 2.4.1 实现文本智能分块算法
  ```
  输入：长文本（可能10万+字符）
  策略：
    1. 按段落/句子边界自然断点
    2. 每块控制在2000-4000 tokens
    3. 块间保留200-500字符重叠（上下文衔接）
    4. 按时间戳分块（视频场景自然分段）
  ```
- [ ] 2.4.2 实现多级摘要管道
  ```
  阶段1（局部摘要）：
    并行调用LLM对各文本块生成摘要（每块150-300字）
  
  阶段2（全局整合）：
    将所有局部摘要合并，调用LLM生成最终结构化总结
  
  阶段3（可选增强）：
    RAG检索增强 → 补充相关背景知识
    VLM视觉分析 → 提取关键帧/PPT内容
  ```
- [ ] 2.4.3 实现 Prompt 工程
  - 设计多种总结风格的Prompt模板
  - "省流模式"：关键要点+核心结论（≤500字）
  - "详细模式"：章节摘要+时间戳导航+关键引用
  - "学术模式"：结构化框架+概念解释
  - 支持用户自定义Prompt
- [ ] 2.4.4 实现多模型路由
  - 模型注册表：GPT-4o / Claude 3.5 Sonnet / Qwen3 / DeepSeek / Gemini
  - 按成本优先路由（便宜任务用 DeepSeek/Qwen）
  - 按质量优先路由（重要任务用 GPT-4o/Claude）
  - 失败自动切换备用模型
- [ ] 2.4.5 实现流式响应
  - Edge Function 返回 ReadableStream
  - 前端 EventSource / useChat 实时渲染
  - 支持断点续传（长视频分阶段返回）

#### 任务2.5：缓存系统

- [ ] 2.5.1 设计缓存键策略
  ```
  字幕缓存: subtitle:{platform}:{videoId}  (TTL: 24h)
  摘要缓存: summary:{platform}:{videoId}:{mode}:{model}  (TTL: 7d)
  用户限流: ratelimit:{userId}:{action}  (滑动窗口)
  ```
- [ ] 2.5.2 实现 Upstash Redis 集成
  - 自动序列化/反序列化
  - 热点数据自动延长过期
  - 缓存命中率监控
- [ ] 2.5.3 实现限流系统
  - 免费用户：每天5次，每次≤30分钟视频
  - Plus用户：无次数限制，每次≤2小时
  - API维度：每分钟N次请求

### 阶段三：前端开发（第5-8周）

#### 任务3.1：核心页面开发

- [ ] 3.1.1 首页（Landing Page）
  - 视频URL输入框（支持粘贴/拖拽）
  - 平台自动识别提示
  - 热门总结展示
  - 功能特性介绍
- [ ] 3.1.2 总结页（核心体验）
  - URL输入 → 平台识别 → 视频信息预览 → 模式选择 → 开始总结
  - 流式生成实时展示（打字机效果）
  - 章节导航（点击跳转到对应视频时间点）
  - 关键词高亮
  - 思维导图视图切换
  - 复制/导出/分享功能
- [ ] 3.1.3 用户面板
  - 历史总结列表（搜索/筛选/排序）
  - 使用量统计（分钟数/token消耗）
  - API Key管理
  - 订阅管理
- [ ] 3.1.4 定价页
  - 套餐对比表格
  - 支付集成（Stripe / 支付宝 / 微信支付）

#### 任务3.2：核心组件开发

- [ ] 3.2.1 VideoInput 组件
  - URL输入 + 实时验证
  - 平台图标自动显示
  - 粘贴即触发识别
- [ ] 3.2.2 SummaryView 组件
  - Markdown渲染（支持代码高亮、表格、LaTeX）
  - 章节时间戳可点击（`[00:05:30]` → 跳转视频）
  - 暗色/亮色主题切换
  - 字号调节
- [ ] 3.2.3 MindMapView 组件
  - 基于 ReactFlow 或 Markmap 渲染思维导图
  - 从总结Markdown自动提取层级结构
- [ ] 3.2.4 PlayerCard 组件
  - 嵌入式视频播放器（B站/YouTube iframe）
  - 时间戳同步（点击总结段落 → 视频跳转）
- [ ] 3.2.5 ShareCard 组件
  - 生成分享图片（OG Image）
  - 一键复制Markdown
  - 导出为PDF/Notion/Obsidian

#### 任务3.3：交互优化

- [ ] 3.3.1 实现骨架屏（Skeleton）加载状态
- [ ] 3.3.2 实现乐观更新（Optimistic UI）
- [ ] 3.3.3 实现错误边界（Error Boundary）与重试机制
- [ ] 3.3.4 实现 PWA（离线访问、桌面快捷方式）
- [ ] 3.3.5 实现国际化（i18n，中/英/日/韩）

### 阶段四：支付与商业化（第7-9周）

#### 任务4.1：支付系统

- [ ] 4.1.1 集成 Stripe 支付（国际信用卡）
- [ ] 4.1.2 集成支付宝/微信支付（LemonSqueezy / Paddle / 自定义）
- [ ] 4.1.3 实现订阅管理（创建/升级/降级/取消）
- [ ] 4.1.4 实现 Webhook 处理（支付成功/失败/退款）
- [ ] 4.1.5 实现发票生成与管理

#### 任务4.2：配额系统

- [ ] 4.2.1 实现分钟数计量（按视频时长计费）
- [ ] 4.2.2 实现配额消耗与重置（月付套餐月度重置）
- [ ] 4.2.3 实现配额不足提醒
- [ ] 4.2.4 实现使用量仪表盘

### 阶段五：开放API与集成（第8-10周）

#### 任务5.1：开放 API 开发

- [ ] 5.1.1 设计 RESTful API 接口
  - `POST /api/v1/summarize` - 视频总结
  - `GET /api/v1/summarize/:id` - 查询总结结果
  - `POST /api/v1/subtitle` - 提取字幕
  - `GET /api/v1/usage` - 查询使用量
- [ ] 5.1.2 实现 API Key 认证（Bearer Token）
- [ ] 5.1.3 实现 API 文档（OpenAPI/Swagger）
- [ ] 5.1.4 实现 API 限流（按Key + 按IP双层）
- [ ] 5.1.5 提供 SDK（TypeScript / Python）

#### 任务5.2：浏览器扩展

- [ ] 5.2.1 开发 Chrome 扩展（Manifest V3）
  - 在B站/YouTube视频页面注入"一键总结"按钮
  - 侧边栏显示总结结果
  - 与Web版共享API
- [ ] 5.2.2 适配 Firefox / Edge

#### 任务5.3：MCP Server（可选）

- [ ] 5.3.1 实现 MCP Server 接口
- [ ] 5.3.2 提供 `summarize_video` 工具
- [ ] 5.3.3 发布到 MCP 市场

### 阶段六：测试与部署（第9-12周）

#### 任务6.1：测试

- [ ] 6.1.1 单元测试（Vitest）
  - 平台URL解析测试
  - 字幕格式化测试
  - 文本分块算法测试
  - 缓存键生成测试
- [ ] 6.1.2 集成测试
  - API路由测试
  - 数据库操作测试
  - Redis缓存测试
- [ ] 6.1.3 E2E测试（Playwright）
  - 完整用户流程：输入URL→获取总结→查看历史
  - 支付流程测试
  - 多平台测试（B站/YouTube/本地文件）
- [ ] 6.1.4 性能测试
  - 页面加载性能（Lighthouse ≥ 90）
  - API响应时间（P99 < 3秒）
  - 并发压力测试

#### 任务6.2：部署

- [ ] 6.2.1 Vercel 项目配置
  - 生产环境 + 预览环境
  - 自定义域名 + SSL
  - 环境变量管理
- [ ] 6.2.2 数据库部署
  - Vercel Postgres / Supabase（推荐）
  - 连接池配置
  - 备份策略
- [ ] 6.2.3 Redis 部署
  - Upstash Redis（与Vercel原生集成）
  - 多区域部署（减少延迟）
- [ ] 6.2.4 CI/CD 配置
  - GitHub Actions 自动部署
  - 预览部署（PR自动创建预览环境）
  - 数据库迁移自动化
- [ ] 6.2.5 监控与日志
  - Vercel Analytics / Google Analytics
  - Sentry 错误追踪
  - Axiom / BetterStack 日志聚合
  - API使用量监控面板

### 阶段七：上线与运营（第12周起）

#### 任务7.1：上线准备

- [ ] 7.1.1 SEO优化
  - 元标签、结构化数据（JSON-LD）
  - Sitemap生成
  - OG Image自动生成
- [ ] 7.1.2 内容安全策略（CSP）配置
- [ ] 7.1.3 隐私政策 + 服务条款
- [ ] 7.1.4 用户引导（Onboarding）

#### 任务7.2：持续运营

- [ ] 7.2.1 用户反馈渠道（反馈表单/社区）
- [ ] 7.2.2 A/B测试框架
- [ ] 7.2.3 数据看板（用户增长/留存/付费转化）
- [ ] 7.2.4 成本监控（AI API费用/基础设施费用）

---

## 第三部分：技术决策与建议

### 3.1 技术选型决策矩阵

| 决策点 | 推荐方案 | 替代方案 | 理由 |
|--------|----------|----------|------|
| **前端框架** | Next.js 16 | Nuxt 3 / Remix | React生态最成熟，Vercel原生支持 |
| **后端** | Vercel Edge Functions | Cloudflare Workers / FastAPI | Serverless免运维，Edge低延迟 |
| **数据库** | Supabase (PostgreSQL) | PlanetScale / Neon | 免费额度高，实时订阅，开源 |
| **缓存** | Upstash Redis | Cloudflare KV / ioredis | Serverless Redis，全球低延迟 |
| **认证** | NextAuth.js v5 | Clerk / Lucia Auth | 开源免费，灵活性高 |
| **AI SDK** | Vercel AI SDK | LangChain.js / 自研 | 多模型统一接口，流式原生支持 |
| **支付** | Stripe + LemonSqueezy | Paddle / 支付宝直连 | 覆盖国内外支付 |
| **语音识别** | Whisper API + faster-whisper | 纯API / FunASR | 低成本启动 + 高量切换自部署 |
| **LLM路由** | 自研路由层 | OpenRouter / OneAPI | 灵活控制成本和模型选择 |
| **视频下载** | yt-dlp (独立服务) | 仅依赖平台API | 字幕不可用时降级提取音频 |

### 3.2 成本估算（MVP阶段）

**每月固定成本（月活1000用户，假设1000次总结/天）**：

| 项目 | 月成本估算 |
|------|:--:|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| Upstash Redis | $10 |
| OpenAI API（摘要，GPT-4o-mini + GPT-4o） | $150-300 |
| Whisper API（转录，少量） | $20-50 |
| Stripe 手续费 | 2.9%+$0.30/笔 |
| 域名 | ~$1 |
| **合计** | **~$250-400/月** |

### 3.3 关键技术风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|----------|
| B站API变更/封禁 | 核心功能不可用 | ①多源字幕获取（API+爬虫+转录）②Cookie池轮换③与B站官方合作 |
| AI API成本超预期 | 毛利率下降 | ①强力缓存（命中率>60%）②本地模型降级③用户自带Key |
| Vercel冷启动延迟 | 用户体验差 | ①Edge Functions预热②关键路径优化③CDN缓存 |
| 视频版权合规 | 法律风险 | ①仅处理字幕（不下载视频）②遵守robots.txt③用户协议声明 |
| 大视频OOM | 处理失败 | ①分片处理②流式上传③音频预压缩 |

---

## 第四部分：关键源码模块设计参考

### 4.1 平台路由模块

```typescript
// lib/platforms/index.ts
export enum Platform {
  Bilibili = 'bilibili',
  YouTube = 'youtube',
  Podcast = 'podcast',
  LocalFile = 'local',
}

interface VideoInfo {
  platform: Platform;
  videoId: string;
  title: string;
  coverUrl?: string;
  duration: number;
  subtitles?: SubtitleItem[];
}

interface SubtitleItem {
  start: number;  // 秒
  end: number;
  text: string;
}

export async function resolveVideo(url: string): Promise<VideoInfo> {
  // 1. URL解析，识别平台
  const platform = detectPlatform(url);
  // 2. 提取视频ID
  const videoId = extractVideoId(url, platform);
  // 3. 获取视频元信息
  const info = await fetchVideoInfo(platform, videoId);
  // 4. 获取字幕
  const subtitles = await fetchSubtitles(platform, videoId);
  return { ...info, subtitles };
}

function detectPlatform(url: string): Platform {
  if (url.includes('bilibili.com') || url.includes('b23.tv')) {
    return Platform.Bilibili;
  }
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return Platform.YouTube;
  }
  // ... 更多平台
}

export async function fetchSubtitles(
  platform: Platform,
  videoId: string
): Promise<SubtitleItem[]> {
  // 先查Redis缓存
  const cached = await redis.get(`subtitle:${platform}:${videoId}`);
  if (cached) return JSON.parse(cached);

  let subtitles: SubtitleItem[];
  switch (platform) {
    case Platform.Bilibili:
      subtitles = await fetchBilibiliSubtitles(videoId);
      break;
    case Platform.YouTube:
      subtitles = await fetchYouTubeSubtitles(videoId);
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  // 缓存24小时
  await redis.setex(
    `subtitle:${platform}:${videoId}`,
    86400,
    JSON.stringify(subtitles)
  );
  return subtitles;
}
```

### 4.2 AI总结引擎

```typescript
// lib/ai/summarize.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

interface SummarizeOptions {
  subtitles: SubtitleItem[];
  mode: 'brief' | 'detailed';
  model?: string;
  customPrompt?: string;
}

export async function* summarizeStream(options: SummarizeOptions) {
  const { subtitles, mode, model = 'gpt-4o-mini' } = options;

  // 1. 文本分块
  const chunks = chunkSubtitles(subtitles, { maxTokens: 3000, overlap: 300 });

  // 2. 并行生成局部摘要
  const localSummaries = await Promise.all(
    chunks.map(chunk => generateLocalSummary(chunk, model))
  );

  // 3. 全局整合（流式输出）
  const globalPrompt = buildGlobalPrompt(localSummaries, mode);

  const result = await streamText({
    model: openai(model),
    prompt: globalPrompt,
    temperature: mode === 'brief' ? 0.3 : 0.5,
    maxTokens: mode === 'brief' ? 1000 : 4000,
  });

  // 4. 逐块返回给前端
  for await (const chunk of result.textStream) {
    yield chunk;
  }
}

function chunkSubtitles(
  subtitles: SubtitleItem[],
  options: { maxTokens: number; overlap: number }
): string[] {
  const chunks: string[] = [];
  let current = '';
  let currentTokens = 0;

  for (const item of subtitles) {
    const line = `[${formatTime(item.start)}] ${item.text}\n`;
    const lineTokens = estimateTokens(line);

    if (currentTokens + lineTokens > options.maxTokens && current.length > 0) {
      chunks.push(current);
      // 保留最后overlap字符作为上下文
      const overlapText = current.slice(-options.overlap);
      current = overlapText + line;
      currentTokens = estimateTokens(current);
    } else {
      current += line;
      currentTokens += lineTokens;
    }
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}
```

### 4.3 缓存策略

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export const cache = {
  async getSubtitle(platform: string, videoId: string) {
    return redis.get<string>(`subtitle:${platform}:${videoId}`);
  },

  async setSubtitle(platform: string, videoId: string, data: any) {
    // 基础TTL 24小时
    let ttl = 86400;
    // 检查是否为热门视频（最近24小时访问次数）
    const accessCount = await redis.incr(`hot:${platform}:${videoId}`);
    await redis.expire(`hot:${platform}:${videoId}`, 86400);
    // 热门视频延长缓存
    if (accessCount > 10) ttl = 604800; // 7天
    await redis.setex(`subtitle:${platform}:${videoId}`, ttl, JSON.stringify(data));
  },

  async getSummary(
    platform: string,
    videoId: string,
    mode: string,
    model: string
  ) {
    return redis.get<string>(`summary:${platform}:${videoId}:${mode}:${model}`);
  },

  async setSummary(
    platform: string,
    videoId: string,
    mode: string,
    model: string,
    data: any
  ) {
    await redis.setex(
      `summary:${platform}:${videoId}:${mode}:${model}`,
      604800, // 7天
      JSON.stringify(data)
    );
  },
};
```

---

## 附录：关键参考资源

### 开源项目参考

- [BibiGPT GitHub](https://github.com/Mrbuchixiangcai/BibiGPT) — 原项目参考
- [BiliSum](https://github.com/lycohana/BiliSum) — 最接近BibiGPT的开源替代
- [video-quick-eval](https://github.com/tiandaren/video-quick-eval) — 轻量级CLI方案
- [Mux Video AI Workflows](https://github.com/muxinc/nextjs-video-ai-workflows) — Vercel官方视频AI参考架构
- [Video-Analysis-Summarization](https://github.com/hakazmi/Video-Analysis-Summarization) — 多模态方案

### 技术文档

- [Vercel AI SDK](https://sdk.vercel.ai/) — AI SDK文档
- [NextAuth.js v5](https://authjs.dev/) — 认证库文档
- [Upstash Redis](https://upstash.com/docs/redis/overview) — Serverless Redis文档
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text) — 语音转文字API
- [B站API非官方文档](https://github.com/SocialSisterYi/bilibili-API-collect) — B站API参考

### 相关文章

- [BibiGPT：音视频内容智能提取与AI总结的全链路技术方案](https://blog.gitcode.com/73c40f0e0b74ce2744663843801db15e.html)
- [字幕提取技术原理全解析：从视频URL到AI总结的实战指南](https://blog.gitcode.com/f2f5ae669672f59e0a813891b9ed20dd.html)
- [跨平台 AI 视频总结指南：B站、YouTube、播客一键提炼要点（2026）](https://bibigpt.co/blog/posts/cross-platform-ai-video-summary-bilibili-youtube-podcast)
- [BibiGPT API文档](https://docs.bibigpt.co/api-reference/introduction)
- [BibiGPT定价与会员方案](https://docs.bibigpt.co/subscription/bibigpt-subscription-options-and-pricing)
- [Whisper API Pricing (2026) — $0.006/min vs Self-Host Costs](https://brasstranscripts.com/blog/openai-whisper-api-pricing-2025-self-hosted-vs-managed)
- [T4 Stack: Next.js 16 + Vercel AI SDK + Local RAG Tutorial](https://www.sitepoint.com/t4-stack-nextjs-16-vercel-ai-sdk-local-rag-tutorial/)
