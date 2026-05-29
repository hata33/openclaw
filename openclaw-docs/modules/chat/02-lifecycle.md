# chat — 数据流

## Canvas 渲染流程

```
Agent 回复消息
  ↓
1. 解析 Markdown fence
   parseFenceSpans(message)
   → 查找 ```canvas-preview 块

2. 提取 Canvas 参数
   tryParseJsonRecord(content)
   → { kind, url, title, preferredHeight }

3. 返回 CanvasPreview
   → 渠道适配器渲染为 iframe/链接
```

## 工具内容块解析

```
消息内容块
  ↓
isToolCallBlock(block) → 判断是否为工具调用
  ↓
resolveToolBlockArgs(block) → 提取参数
resolveToolUseId(block) → 提取工具调用 ID
```
