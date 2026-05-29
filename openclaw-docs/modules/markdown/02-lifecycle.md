# markdown — 数据流

```
Agent 生成 Markdown 回复
  ↓
1. 解析 IR
   parseMarkdownIR(text)
   → MarkdownIR[]

2. 渲染适配
   renderMarkdownIR(ir, styleMap)
   → 目标格式文本

3. 分块（如需）
   renderAwareChunk(ir, { maxLength })
   → RenderedMarkdownChunk[]

4. 发送
   → 每块作为独立消息发送
```
