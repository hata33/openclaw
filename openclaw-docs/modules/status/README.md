# status — 状态显示

> 构建 `/status` 命令的输出文本。
> 汇总会话状态、模型信息、队列深度、子 Agent 状态等。

## 文件结构

| 文件 | 职责 |
|------|------|
| `status-text.ts` | 状态文本构建（主入口） |
| `status-text.types.ts` | 状态文本类型 |
| `status-message.ts` | 状态消息构建 |
| `status-message.runtime.ts` | 状态消息运行时 |
| `status-labels.ts` | 状态标签（Fast mode 等） |
| `status-queue.runtime.ts` | 队列状态 |
| `status-subagents.runtime.ts` | 子 Agent 状态 |
| `agent-runtime-label.ts` | Agent 运行时标签 |
| `fallback-notice-state.ts` | 模型回退通知状态 |

## 核心功能

### /status 命令输出

```
📊 Session Status
Model: gpt-4o (OpenAI)
Context: 4096/128000 tokens
Queue: 0 pending
Subagents: 2 running
Reasoning: off
Fast mode: off
Uptime: 2h 35m
```

### 模型回退

当配置的模型不可用时回退到备用模型，status 显示回退通知。

### 子 Agent 状态

显示当前运行的子 Agent 数量和状态。
