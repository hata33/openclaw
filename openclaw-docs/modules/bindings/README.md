# bindings — 会话绑定

> 将对话（Conversation）绑定到会话（Session）的桥接层。
> 提供统一的绑定记录 CRUD，委托给 session-binding-service。

## 文件结构

| 文件 | 职责 |
|------|------|
| `index.ts`（48 行） | 绑定记录的创建/查询/解绑/触碰 |

## 核心概念

### 绑定记录

将一个渠道对话（ConversationRef）映射到一个 Agent 会话（SessionKey）。

```
ConversationRef { channel, accountId, conversationId }
  ↔
SessionKey { sessionKey }
```

### 操作

| 操作 | 说明 |
|------|------|
| `bind` | 创建绑定（对话 → 会话） |
| `unbind` | 解除绑定 |
| `resolve` | 通过对话查找绑定 |
| `list` | 列出会话的所有绑定 |
| `touch` | 更新最后活跃时间 |
| `getCapabilities` | 查询绑定能力 |
