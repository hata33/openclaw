# markdown — 功能定义

## IR 解析（ir.ts）

使用 markdown-it 将 Markdown 解析为自定义 IR：

```
Markdown 文本 → markdown-it tokens → MarkdownIR[]
```

IR 包含：文本、样式（粗体/斜体）、链接、列表、代码、表格等。

## 渲染（render.ts）

将 IR 渲染为目标格式：

```typescript
type RenderStyleMap = {
  bold?: { open: string; close: string };
  italic?: { open: string; close: string };
  ...
};
```

不同渠道有不同的样式标记。

## 分块（render-aware-chunking.ts）

在 Markdown 结构边界处分块：

```
长消息 → 检测长度限制 → 在段落/代码块边界分块 → 每块独立渲染
```

## Frontmatter（frontmatter.ts）

解析 YAML frontmatter：

```
---
key: value
---
```
