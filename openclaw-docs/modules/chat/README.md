# chat — 聊天渲染与工具内容

> 聊天消息的 Canvas 渲染检测和工具内容块解析。
> 识别消息中的 Canvas 预览和工具调用/结果块。

## 文件结构

| 文件 | 职责 |
|------|------|
| `canvas-render.ts`（139 行） | Canvas 渲染检测（从 Markdown fence 中提取 Canvas 预览） |
| `tool-content.ts`（139 行） | 工具内容块解析（tool_call / tool_result 类型判断） |

## 核心功能

### Canvas 渲染

从消息中的 Markdown 代码块检测 Canvas 渲染指令：

````
```canvas-preview
{ "kind": "canvas", "url": "...", "title": "..." }
```
````

### 工具内容块

```typescript
isToolCallBlock(block)   // type === "toolcall" | "tool_call" | "tooluse" | "tool_use"
isToolResultBlock(block) // type === "toolresult" | "tool_result"
resolveToolBlockArgs(block)  // block.args | block.arguments | block.input
resolveToolUseId(block)      // block.id | block.tool_use_id
```
