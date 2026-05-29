# markdown — Markdown 处理

> Markdown 文本的解析、渲染和分块。
> 支持多种输出格式（纯文本、Telegram Markdown、Discord Markdown 等）。

## 文件结构

| 文件 | 职责 |
|------|------|
| `ir.ts` | Markdown 中间表示（IR）解析 |
| `render.ts` | IR → 目标格式渲染 |
| `fences.ts` | 代码围栏检测 |
| `code-spans.ts` | 行内代码检测 |
| `frontmatter.ts` | YAML Frontmatter 解析 |
| `render-aware-chunking.ts` | 渲染感知分块 |
| `chunk.ts` | 文本分块 |

## 核心概念

### Markdown IR

将 Markdown 解析为中间表示，支持：

- 加粗/斜体/删除线等样式
- 链接
- 列表
- 代码块
- 表格

### 渲染适配

同一 IR 可以渲染为不同格式：

```
IR → Telegram MarkdownV2
   → Discord Markdown
   → WhatsApp 格式
   → 纯文本
```

### 分块

消息可能超出渠道长度限制。render-aware-chunking 在保持 Markdown 结构完整的前提下分块。
