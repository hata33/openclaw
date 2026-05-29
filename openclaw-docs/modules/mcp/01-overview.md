# mcp — 功能定义与设计思想

## 这个模块解决什么问题？

Claude Desktop、Cursor 等 AI 应用需要调用外部工具。MCP 是标准化的工具调用协议。OpenClaw 通过 MCP 服务器将其功能暴露给这些应用。

## Channel Server — 渠道集成

将 OpenClaw 的消息渠道暴露给 Claude Desktop：

```
Claude Desktop → MCP Channel Server → OpenClaw Gateway → 渠道（Telegram/Discord）
```

### Channel Bridge

`channel-bridge.ts` 是 MCP 服务器和 Gateway 之间的桥接：

```typescript
class OpenClawChannelBridge {
  // 通过 Gateway WebSocket 通信
  sendMessage(channel, to, text): Promise<void>
  listConversations(): Promise<ConversationDescriptor[]>
  getChatHistory(conversationId): Promise<ChatHistoryResult>
  waitForEvent(filter): Promise<QueueEvent>
}
```

### Channel Tools

注册的 MCP 工具：

| 工具 | 功能 |
|------|------|
| `send_message` | 发送消息到渠道 |
| `list_conversations` | 列出对话 |
| `get_chat_history` | 获取聊天历史 |
| `wait_for_reply` | 等待回复 |

## OpenClaw Tools — 内置工具

`openclaw-tools-serve.ts` 暴露内置工具：

```
工具列表:
  → cron（定时任务管理）
```

## Plugin Tools — 插件工具

`plugin-tools-serve.ts` 暴露插件注册的工具：

```
工具列表:
  → memory_recall（记忆召回）
  → memory_store（记忆存储）
  → memory_forget（记忆删除）
```

## 设计思想

### 1. Stdio 传输

MCP 服务器使用 stdio（标准输入/输出）传输：

```
Claude Desktop ↔ stdin/stdout ↔ MCP Server
```

### 2. 日志路由

stdout 被用于 MCP 协议，日志路由到 stderr：

```typescript
routeLogsToStderr()
```

### 3. Gateway 桥接

Channel Server 通过 Gateway WebSocket 与 OpenClaw 通信，不需要直接访问内部模块。
