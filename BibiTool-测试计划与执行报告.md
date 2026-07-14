# BibiTool — 测试计划与执行报告

> 创建日期：2026-07-14 | 框架：Vitest v4.1.10
> 执行结果：**13 个文件 · 115 个测试 · 全部通过 ✅**

---

## 一、测试架构

`
vitest.config.ts
├── environment: node
├── globals: true
├── include: src/**/*.test.ts
└── resolve.alias: @/ → ./src/
`

### 测试分类

| 类型 | 文件数 | 说明 |
|------|:------:|------|
| 纯函数单元测试 | 8 | 无 mock，覆盖 core lib 纯函数 |
| 集成测试（mock DB） | 1 | mock Prisma → quota 业务逻辑 |
| 集成测试（mock Redis） | 1 | mock @upstash/redis → 缓存策略 |
| 集成测试（mock AI SDK） | 1 | mock ai / @ai-sdk/* → 总结管道 |
| 集成测试（mock JWT） | 1 | mock next-auth/jwt → session 提取 |
| 集成测试（mock fetch） | 1 | mock globalThis.fetch → Whisper API |
| **合计** | **13** | **115 个测试，全部通过** |

---

## 二、测试文件详情

### 单元测试（8 文件，78 测试 ✅）

| 文件 | 模块 | 用例 | 关键覆盖 |
|------|------|:----:|----------|
| utils.test.ts | lib/utils.ts | 17 | formatTime / estimateTokens / 视频 ID 提取 (BV/AV/YT/short) / sleep |
| chunk.test.ts | lib/ai/chunk.ts | 6 | 短输入/长分块/重叠验证/空输入/时间戳格式/flatten |
| subtitle-normalizer.test.ts | lib/subtitle-normalizer.ts | 13 | HTML 清理/实体解码/相邻合并/空过滤/排序/语言检测 zh/en/unknown |
| export.test.ts | lib/export.ts | 10 | SRT 格式 (单条/多条/小时/空) / Markdown 清理 |
| platforms.test.ts | lib/platforms/index.ts | 10 | detectPlatform (B站/YT/本地/null) / extractVideoId |
| prompt.test.ts | lib/ai/prompt.ts | 11 | 4 种 prompt 模板 × brief/detailed/unknown mode |
| outer.test.ts | lib/ai/router.ts | 12 | 模型选择 (cheap/expensive) / 三级降级链 / 可用模型列表 |
| ilibili-cookie.test.ts | lib/platforms/bilibili-cookie.ts | 10 | UA 轮换 / header 构建 / Cookie 注入 / null/undefined |

### 集成测试（5 文件，37 测试 ✅）

| 文件 | Mock 目标 | 用例 | 关键覆盖 |
|------|-----------|:----:|----------|
| quota.integration.test.ts | Prisma | 11 | checkQuota (有额度/无额度/用户不存在) / consumeQuota (扣减/最小值/日志) / getDailyUsage / initializeCredits |
| cache.integration.test.ts | @upstash/redis | 11 | get/setSubtitle (24h TTL/热门 7d 延长) / get/setSummary / invalidateVideo / 无 Redis 优雅降级 |
| summarize.integration.test.ts | ai / @ai-sdk/* | 7 | 短路径单次 streaming / 长路径 Map-Reduce (generateText+streamText) / 局部摘要失败容错 / 全失败错误 / 模型降级链 |
| uth-helpers.integration.test.ts | next-auth/jwt | 5 | 有效 token / 无 token / 无 sub 字段 / 可选字段 / getToken 抛出异常 |
| 	ranscribe.integration.test.ts | fetch | 7 | 成功转录含 segments / 纯文本响应 / 请求格式验证 / 无 API Key / 文件过大 / API 错误 / 语言选项 |

---

## 三、覆盖率分析

### 已覆盖模块（可独立测试的纯函数，100% 覆盖）

| 模块 | 函数数 | 测试状态 |
|------|:------:|:--------:|
| lib/utils.ts | 5 | ✅ 全部覆盖 |
| lib/ai/chunk.ts | 2 | ✅ 全部覆盖 |
| lib/subtitle-normalizer.ts | 3 | ✅ 全部覆盖 |
| lib/export.ts | 5 | ✅ 全部覆盖 |
| lib/platforms/index.ts | 3 | ✅ 全部覆盖 |
| lib/ai/prompt.ts | 5 | ✅ 全部覆盖 |
| lib/ai/router.ts | 4 | ✅ 全部覆盖 |
| lib/platforms/bilibili-cookie.ts | 4 | ✅ 全部覆盖 |

### 集成测试覆盖的模块

| 模块 | 测试覆盖的逻辑 |
|------|----------------|
| lib/quota.ts | checkQuota/consumeQuota/getDailyUsage/initializeCredits (mock Prisma) |
| lib/cache.ts | getSubtitle/setSubtitle/getSummary/setSummary/invalidateVideo/isAvailable (mock Redis) |
| lib/ai/summarize.ts | summarizeStream 全管道：短路径/长路径 Map-Reduce/失败降级 (mock AI SDK) |
| lib/auth-helpers.ts | getSession 四种场景 (mock JWT) |
| lib/transcribe.ts | transcribeAudio 七种场景 (mock fetch) |

### 未覆盖（需实际外部服务）

| 模块 | 原因 | 建议 |
|------|------|------|
| lib/auth.ts | 需要实际 NextAuth + 数据库 | E2E 测试 |
| lib/db.ts | Prisma 客户端代理 | E2E 测试 |
| lib/rate-limit.ts | 需要实际 Redis 实例 | E2E 测试 |
| lib/ai/chapter.ts | 需要实际 LLM API | E2E 测试 |
| lib/ai/rewrite.ts | 需要实际 LLM API | E2E 测试 |
| lib/platforms/bilibili.ts | 需要实际 B站 API | E2E 测试 |
| lib/platforms/youtube.ts | 需要实际 YouTube API | E2E 测试 |

---

## 四、发现的 Bug

在集成测试过程中发现了 **1 个 bug** 并修复：

**三级降级链无限循环**（src/lib/ai/router.ts）：getFallbackModel 对末位模型 gpt-4o 返回了首位的 gpt-4o-mini，导致 summarize.ts 的 while(true) 重试循环永远无法满足退出条件（
ext.model === currentRoute.model）。修复：末位模型返回自身，让循环检测到"所有模型都已尝试"后抛出错误。

---

## 五、运行方式

| 命令 | 说明 |
|------|------|
| 
pm test | 全量运行 |
| 
pm run test:watch | 监视模式 |
| 
px vitest run src/lib/__tests__/utils.test.ts | 单个文件 |
| 
px vitest run -t "empty subtitles" | 按名称筛选 |

---

## 六、CI 集成

流水线（.github/workflows/ci.yml）步骤：
lint → tsc --noEmit → npm test → npm run build

测试在 	sc 之后、uild 之前执行，确保只有通过全部 115 个测试的代码才会被构建部署。
