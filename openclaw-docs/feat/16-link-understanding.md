# 16 — 链接理解

> OpenClaw 的链接理解模块（Link Understanding）自动检测消息中的 URL，
> 抓取并提取内容，以结构化形式注入对话上下文，让 Agent 能"理解"链接。

## 解决的问题

```
用户发送: "看看这篇文章 https://example.com/article"

没有链接理解:
  → Agent 只看到一个 URL 字符串
  → 无法了解文章内容
  → 需要手动调用 web_fetch

有链接理解:
  → 自动检测到 URL
  → 后台抓取文章内容
  → 提取标题、正文、图片
  → 以 Markdown 附件形式注入对话
  → Agent 直接理解文章内容
```

## 架构

```
用户消息（含 URL）
  │
  ▼
┌──────────────────────┐
│  detect.ts           │  ← URL 检测
│  检测消息中的链接     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  runner.ts           │  ← 内容获取
│  并行抓取多个链接     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  format.ts           │  ← 格式化
│  转换为 Markdown     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  apply.ts            │  ← 注入上下文
│  附加到消息上下文     │
└──────────────────────┘
```

## URL 检测

`src/link-understanding/detect.ts` 负责从消息文本中提取 URL：

```typescript
// 检测策略：
// 1. 标准正则匹配 http(s):// URLs
// 2. 排除已知的非内容 URL（如图片、视频直链）
// 3. 支持配置排除模式
```

### 检测配置

```yaml
linkUnderstanding:
  enabled: true
  maxLinksPerMessage: 5        # 每条消息最多处理 5 个链接
  timeout: 10000               # 单个链接抓取超时
  excludePatterns:             # 排除模式
    - "\\.(png|jpg|jpeg|gif|mp4)$"
```

## 内容获取与提取

`src/link-understanding/runner.ts` 协调链接抓取：

```
检测到的 URL 列表
  → 并行发起 HTTP 请求（控制并发数）
  → 每个请求有独立超时
  → 内容类型检测
  → 使用 web-fetch 的提取器提取正文
  → 处理失败时优雅降级（返回 URL 原文）
```

## 格式化

`src/link-understanding/format.ts` 将提取的内容格式化为 Markdown：

```markdown
---
title: "文章标题"
url: https://example.com/article
---

## 文章标题

这里是文章的正文内容...

[图片1](https://example.com/img1.jpg)
```

## 上下文注入

`src/link-understanding/apply.ts` 和 `apply.runtime.ts` 负责将提取的内容注入对话：

```
格式化后的 Markdown 内容
  → 作为消息附件附加到用户消息
  → 或作为独立的上下文消息注入
  → Agent 收到的消息包含完整的链接内容
```

### 注入模式

1. **内联附件** — 作为用户消息的附件，与原文一起发送给模型
2. **独立上下文** — 作为独立消息注入，不影响原始消息结构

## 默认配置

`src/link-understanding/defaults.ts` 提供合理的默认值：

```typescript
const defaults = {
  enabled: true,
  maxLinksPerMessage: 5,
  timeoutMs: 10000,
  maxContentLength: 50000,     // 最大内容长度（字符）
  concurrency: 3,              // 最大并发抓取数
};
```

## 运行时应用

`src/link-understanding/apply.runtime.ts` 处理运行时的链接理解逻辑：

```
消息进入处理管线
  → applyLinkUnderstanding()
  → 检测链接 → 抓取 → 格式化 → 注入
  → 返回增强后的消息
```

## 与 web_fetch 的关系

链接理解底层使用 web-fetch 的内容提取能力，但职责不同：

| 维度 | link-understanding | web-fetch |
|------|-------------------|-----------|
| 触发方式 | 自动（检测到 URL） | 手动（Agent 调用工具） |
| 使用者 | 系统管线 | Agent |
| 透明度 | 用户无感知 | Agent 显式调用 |
| 适用场景 | 聊天中提到的链接 | Agent 主动查询 |

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/link-understanding/detect.ts` | URL 检测 |
| `src/link-understanding/runner.ts` | 链接抓取协调 |
| `src/link-understanding/format.ts` | 内容格式化 |
| `src/link-understanding/apply.ts` | 上下文注入 |
| `src/link-understanding/apply.runtime.ts` | 运行时应用逻辑 |
| `src/link-understanding/defaults.ts` | 默认配置 |

## 总结

1. **自动理解** — 无需手动调用，消息中的 URL 自动解析
2. **管线集成** — 深度集成在消息处理管线中
3. **并行高效** — 多链接并行抓取，控制并发
4. **优雅降级** — 抓取失败不影响对话
5. **可配置** — 超时、并发、排除模式均可自定义
