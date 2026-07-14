# BibiGPT 核心功能全面调研报告

> 调研日期：2026年6月7日  
> 调研对象：BibiGPT.co（BibiGPT 知行助理）  
> 官方定位：AI 驱动的一站式音视频内容理解与知识管理工具  
> 用户规模：100万+用户，500万+次AI总结

---

## 功能总览

BibiGPT 围绕 **「看得快 · 搜得到 · 用得好」** 三大理念，构建了从"获取信息"到"输出内容"的完整闭环。以下按功能类别逐一详述。

---

## 一、AI 智能总结（核心功能）

### 1.1 一键视频总结
粘贴任意视频/音频链接（30+平台），AI 自动：
- 提取标题、封面、时长等元信息
- 生成结构化摘要（含关键要点、核心论点、数据标注）
- 输出可点击时间戳的章节导航
- 标注高亮洞察和追问问题

### 1.2 总结模式
- **省流模式**：关键要点+核心结论（≤500字），快速了解主旨
- **详细模式**：完整章节摘要+时间戳导航+关键引用
- **学术模式**：结构化框架+概念解释+逻辑脉络
- **自定义模式**：用户自行编写 Prompt 模板

### 1.3 合集归纳总结
- 将多个视频加入合集后，一键生成全局视角的结构化综述
- 自动识别不同视频间的关联与矛盾观点
- 配套生成合集思维导图

### 1.4 章节智能拆分
- 自动按逻辑主题将长视频分段
- 每章独立摘要，类似书籍目录
- 点击任意章节跳转到视频对应时间点

### 1.5 自定义总结模板
- 支持自定义 Prompt 配置（通过 `summarizeWithConfig` API）
- 多模型选择路由（GPT-4o / Claude / Gemini / Qwen3 / DeepSeek / Grok）
- 按需切换输出语言（中/英/日/韩/繁中）

---

## 二、字幕与语音识别

### 2.1 全文字幕提取
- 从平台原生字幕提取（B站CC字幕/YouTube自动字幕等）
- 原视频无字幕时通过 AI 语音识别自动生成
- 每行字幕附带精确时间戳，点击跳转对应视频位置

### 2.2 多引擎转录
支持多种语音识别引擎，可按需切换：
- **OpenAI Whisper**：通用多语言识别
- **通义千问 Qwen3 (FunASR)**：中文优化
- **ElevenLabs Scribe**：高精度英文
- **WebGPU 浏览器本地 Whisper**：100%本地运行，零隐私风险（免费工具）

### 2.3 字幕多格式导出（v4.455.0 新增）
支持五种格式一键导出：

| 格式 | 典型用途 |
|------|----------|
| **SRT** | 视频播放器外挂字幕 |
| **VTT** | Web视频字幕 |
| **JSON** | 程序化处理/二次开发 |
| **TXT** | 纯文本阅读/搜索 |
| **LRC** | 音乐播放器歌词格式 |

### 2.4 智能字幕分段
- 按字数/词数/时长三种维度分段
- 提供短句、长句、CJK优化等预设方案
- 实时预览分段效果

### 2.5 AI 字幕校对
- 添加 Prompt 规则进行校对（如"修正专业术语翻译"）
- 批量查找替换关键词
- 智能合并过短的字幕段

### 2.6 字幕翻译
- 支持中/英/日/韩等多语言互译
- 输出双语对照字幕
- 字幕压制（Burn-in）：将翻译后的字幕直接嵌入视频文件

### 2.7 免费语音转文字工具
- 浏览器端通过 WebGPU 运行 Whisper 模型
- 音频文件不上传服务器，100%本地处理
- 支持 99+ 种语言自动检测
- 完全免费

---

## 三、内容输出与创作

### 3.1 AI 改写（视频转文章）
- 将视频内容转化为叙事性结构化文章
- 带段落标题、过渡语句和完整论述
- 可直接发布为公众号文章/博客/Newsletter
- 导出格式：HTML、PDF、Markdown

### 3.2 思维导图
- AI 自动从视频内容提取知识结构生成思维导图
- 支持 Markmap/XMind 格式
- 交互式展开/折叠/缩放节点
- 导出为图片或 Markdown，可导入 XMind、MindNode 等工具

### 3.3 AI 信息图（SVG）
- 自动分析视频核心观点
- 生成排版精美的 SVG 信息图
- 一图讲清一个概念，可用于演示/社交媒体

### 3.4 PPT 演示 / 动态网页
- 将视频总结自动生成可逐页浏览的演示文稿
- 一键转化为图文并茂的动态网页

### 3.5 高光笔记
- 像电子书一样划选重点内容
- AI 自动判断观点重要度，分级高亮
- 自动收集到专属"高亮笔记"Tab
- 一键分享为精美知识卡片（含视频信息和二维码）

### 3.6 闪卡学习（Flashcard）
- 自动生成问答卡片
- 可导出至 Anki 进行间隔重复记忆
- 支持中英双语对照，结合 AI 润色

### 3.7 导出内容拖拽排序（v4.455.0 新增）
- 导出前可拖拽调整全文总结、章节总结、文章脚本的先后顺序
- 灵活定制最终输出结构

### 3.8 导出到笔记工具
深度集成主流知识管理工具：

| 工具 | 集成方式 |
|------|----------|
| Notion | 一键同步，自动创建格式页面 |
| Obsidian | Markdown 导出，双链兼容 |
| Readwise / Reader | 高亮笔记一键保存 |
| Flomo | URL Scheme 集成 |
| 飞书 | 文档同步 |
| Roam Research / Tana | 直接保存 |
| 思源笔记 / Logseq | Markdown 导入 |
| 其他 | Markdown / JSON / ZIP 通用导出 |

---

## 四、AI 对话与交互

### 4.1 AI 视频问答（Chat with Video）
- 针对视频内容自然语言提问
- 答案附带可点击时间戳（悬停预览，点击跳转）
- AI 严格基于视频原文，避免幻觉（Source Tracing）

### 4.2 AI Agent 模式（v4.455.0 新增）
- 一句话语音/文字指令操作整个总结页
- 比如"看思维导图"→自动切换到思维导图视图
- 比如"导出到 Notion"→自动执行导出
- 无需手动寻找功能入口

---

## 五、视觉与多媒体

### 5.1 AI 风格化配图（Nano Banana Pro）
- 为总结生成高质量封面图
- 支持风格：日漫二次元、赛博朋克、3D立体、极简设计等

### 5.2 视觉分析（Vision/2026 Upgrade）
- 理解视频画面内容（图表、PPT、白板讲解、产品展示等）
- 融合视觉信息与音频文字，生成更准确的全方位总结

### 5.3 播客式生成
- 将长篇视频转化为双人对话播客
- 多种音色组合可选
- 自动生成对话脚本和字幕列表
- 适合通勤/运动场景"听"视频

---

## 六、搜索与发现

### 6.1 跨平台视频搜索
- 同时在 B站、YouTube、抖音等平台搜索
- 打破平台壁垒，一站式发现内容

### 6.2 博主更新推送（v4.455.0 新增）
- 订阅关注的博主/UP主
- 更新后微信第一时间推送提醒
- 三档推送范围可选（全部更新/精选/仅长视频）

### 6.3 探索页（Feed Beta）
- 基于兴趣的推荐信息流
- 发现热门总结和优质内容
- 批量加入合集

---

## 七、多端覆盖

### 7.1 Web 端
- 完整的 SPA 应用（Next.js 构建）
- 响应式设计，支持桌面和移动浏览器
- 支持 15 种界面语言

### 7.2 浏览器扩展
| 浏览器 | 状态 |
|--------|------|
| Chrome | Chrome Web Store 正式版 |
| Edge | Microsoft Edge 加载项商店 |
| Firefox | Firefox Add-ons 官方商店 |

扩展核心能力：
- 打开任意视频页面，点击扩展图标一键总结
- 侧边栏原地展示（不跳转、不离开当前页面）
- 边看视频边查总结、进行 AI 追问
- B站充电视频自动重抓完整字幕

### 7.3 桌面端
- macOS / Windows 原生应用
- 基于 Tauri 2.x 构建（Rust + Web前端）
- 本地文件直接拖入处理

### 7.4 移动端
- iOS / Android 应用
- 基于 Expo (React Native) 构建
- 支持分享菜单直接转发链接总结

### 7.5 微信助理
- 在微信中转发视频/音频链接
- 自动回复 AI 总结
- 无需打开其他应用

---

## 八、支持的平台与格式

### 8.1 支持的平台（30+）
**综合视频**：YouTube、B站（Bilibili）、Vimeo  
**短视频/社交**：TikTok、抖音、小红书、Twitter/X  
**播客**：Apple Podcasts、Spotify、小宇宙、Google Podcasts  
**学习平台**：TED、Coursera  
**其他**：微信公众号文章、任意网页链接、百度网盘分享、阿里云盘

### 8.2 支持的本地文件格式（v4.455.0 扩展）
```
视频：mp4、mov、ts、mkv、webm、avi
音频：mp3、m4a、wav
```

### 8.3 输出语言
中文（简/繁）、English、日本語、한국어（共5种）

---

## 九、开发者生态与 API

### 9.1 开放 REST API
| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/v1/summarize` | GET | 视频/音频一键总结 |
| `/api/v1/summarizeWithConfig` | POST | 自定义 Prompt 总结 |
| `/api/v1/getSubtitle` | GET | 仅提取字幕 |
| `/api/v1/express` | GET | AI 改写为结构化文章 |
| `/api/v1/getPolishedText` | GET | AI 字幕润色分段 |

- 认证方式：Bearer Token
- 提供 OpenAPI Schema 文档（`api.bibigpt.co/api/openapi.json`）

### 9.2 MCP Server
提供 4 个 MCP 工具，兼容 Claude、ChatGPT、Cursor、Codex 等 AI Agent：
- `summarize_video`：总结视频/播客
- `summarize_with_config`：自定义 Prompt + 模型 + 语言
- `get_subtitles`：提取完整字幕及时间戳
- `summarize_by_chapter`：按章节分段总结

MCP 端点：`https://bibigpt.co/api/mcp`

### 9.3 IFTTT 集成
支持通过 IFTTT 自动化工作流串联 BibiGPT API

---

## 十、付费方案

| 方案 | 价格 | 核心权益 |
|------|:--:|------|
| **免费** | $0 | 注册即送 120 分钟，每日有限次 |
| **Plus 月付** | $19.80/月 | 无限次数、月限 6000 分钟本地文件、高级模型、笔记同步、20% 推广分成 |
| **Pro 月付** | $34.80/月 | 含 Plus 全部 + 无限本地视频、视觉分析、AI 封面/短视频生成 |
| **会员合伙人** | $888 买断 | 永久有效、全功能解锁、33% 推广分成、1对1咨询 |
| **按需时长包** | $4.9 起 | 600-3600 分钟弹性购买 |

支付方式：支付宝、微信支付、PayPal  
退款政策：购买后 7 天内可申请退款

---

## 十一、版本演进时间线（2025-2026）

| 版本 | 时间 | 关键更新 |
|------|------|----------|
| v4.455.0 | 2026-06 | AI Agent 模式、博主更新推送、字幕多格式导出、导出拖拽排序、文件格式扩展 |
| v4.399.1 | 2026-05 | Feed Beta 信息流、侧边栏四产品切换器、六款新模型支持 |
| v4.275.1 | 2026-03 | 全新首页 UI、xAI Grok 模型支持、自定义合集总结 |
| v4.249.0 | 2026-02 | 大文件即时加载、移动端体验优化、更清爽的导出 |
| v4.228.0 | 2026-01 | 自动翻译音视频、高效命令面板 |
| v4.165.0 | 2025-12 | 侧边栏分组优化、智能字幕分段、多转录引擎、AI 风格化配图 |
| v4.156.0 | 2025-11 | 合集归纳总结、批量加入合集、订阅管理页面 |
| v4.144.0 | 2025-11 | 模型库、视频合集、播客式生成 |

---

## 十二、功能分类速查表

```
┌─────────────────────────────────────────────────────────┐
│                     BibiGPT 核心功能矩阵                   │
├─────────────┬─────────────┬─────────────┬───────────────┤
│  信息获取    │  信息理解    │  知识输出    │   平台覆盖     │
├─────────────┼─────────────┼─────────────┼───────────────┤
│ 链接识别     │ AI智能总结   │ 思维导图     │ B站/YouTube    │
│ 字幕提取     │ 章节拆分     │ AI改写文章   │ 抖音/小红书     │
│ 语音转文字   │ AI问答对话   │ PPT/网页生成 │ TikTok/Twitter │
│ 字幕翻译     │ 视觉分析     │ 闪卡学习     │ 播客/网课      │
│ 视频搜索     │ 合集归纳     │ SVG信息图    │ 本地文件       │
│ 字幕校对     │ 多模型路由   │ 高光笔记     │ 浏览器扩展     │
│ 多引擎转录   │ Agent模式    │ 多格式导出   │ 桌面/移动端    │
│ 更新推送     │              │ 笔记同步     │ API/MCP       │
└─────────────┴─────────────┴─────────────┴───────────────┘
```

---

## 主要信息来源

- [BibiGPT 7 大能力在线交互体验](https://bibigpt.co/blog/posts/bibigpt-7-ai-features-interactive-demo-showcase)
- [BibiGPT v4.455.0 更新公告](https://bibigpt.co/blog/posts/20260601-bibigpt-chat-agent-creator-push-export-updates)
- [BibiGPT v4.165.0 更新公告](https://api.bibigpt.co/blog/posts/20251205-bibigpt-v41650-sidebar-subtitle-transcription-updates)
- [BibiGPT v4.156.0 更新公告](https://api.bibigpt.co/blog/posts/20251128-bibigpt-collection-summary-batch-add-subscription-dashboard)
- [BibiGPT v4.144.0 更新公告](https://bibigpt.co/en/blog/posts/20251121-bibigpt-ai-audio-video-summary-model-updates)
- [BibiGPT 定价与会员方案](https://docs.bibigpt.co/subscription/bibigpt-subscription-options-and-pricing)
- [BibiGPT API 文档](https://docs.bibigpt.co/api-reference/introduction)
- [BibiGPT 高光笔记与思维导图更新](https://bibigpt.co/blog/posts/20250926-bibigpt-feature-updates)
- [跨平台 AI 视频总结指南 2026](https://bibigpt.co/blog/posts/cross-platform-ai-video-summary-bilibili-youtube-podcast)
- [AI 视频笔记高效学习法](https://bibigpt.co/blog/posts/ai-video-notes-study-workflow-learning-guide-2026)
- [BibiGPT 浏览器扩展](https://bibigpt.co/apps/browser)
- [BibiGPT GitHub v1](https://github.com/JimmyLv/BibiGPT-v1)
- [更准的 AI 字幕意味着什么 2026](https://bibigpt.co/blog/posts/accurate-ai-subtitles-noisy-lectures-podcasts-music-videos)
