# link-understanding — 链接理解

> 从消息中检测 URL，抓取页面内容，生成摘要注入上下文。
> 让 Agent 在回复时能理解用户发送的链接内容。

## 文件结构

| 文件 | 行数 | 职责 |
|------|------|------|
| `detect.ts` | URL 检测（提取消息中的裸链接，排除 Markdown 链接） |
| `defaults.ts` | 默认值（超时 30s，最多 3 个链接） |
| `runner.ts` | 链接理解运行器（抓取 + 摘要） |
| `apply.ts` | 应用链接理解（将摘要注入上下文） |
| `apply.runtime.ts` | 运行时入口 |
| `format.ts` | 格式化输出（合并摘要与原文） |

## 核心流程

```
用户发送含链接的消息
  ↓
1. 检测链接
   extractLinksFromMessage(text)
   → 提取裸 URL（排除 Markdown 链接）
   → 去重 + 限制数量

2. 抓取页面
   fetchWithSsrFGuard(url)
   → SSRF 防护
   → 读取内容（大小限制）

3. 生成摘要
   → 使用配置的摘要工具（LLM / CLI）
   → 每个链接生成文本摘要

4. 注入上下文
   formatLinkUnderstandingBody({ body, outputs })
   → 将摘要追加到消息正文
```

## 默认值

| 配置 | 默认值 |
|------|--------|
| 超时 | 30 秒 |
| 最大链接数 | 3 |
