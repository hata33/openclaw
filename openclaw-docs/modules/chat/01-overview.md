# chat — 功能定义

## Canvas 渲染检测

Agent 消息中可能包含 Canvas 预览指令。canvas-render.ts 从 Markdown fence 中提取：

```
CanvasPreview = {
  kind: "canvas",
  surface: "assistant_message",
  render: "url",
  url?: string,
  title?: string,
  preferredHeight?: number,
  viewId?: string,
}
```

## 工具内容块

不同 Provider 使用不同的工具块格式：

| 格式 | type 值 | 参数字段 |
|------|---------|----------|
| Anthropic | `tool_use` | `input` |
| OpenAI | `function` | `arguments` |
| Gemini | `toolCall` | `args` |

tool-content.ts 统一处理这些差异。
