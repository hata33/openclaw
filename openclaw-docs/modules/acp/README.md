# acp — Agent Control Protocol

> Agent 控制协议（ACP）：外部 IDE/工具与 OpenClaw Agent 的通信协议。
> 支持 Claude Code、Cursor 等 AI 编码工具通过 ACP 与 Agent 交互。

## 文件结构（42 个文件）

### 核心

| 文件 | 职责 |
|------|------|
| `server.ts` | ACP 服务器 |
| `client.ts` | ACP 客户端 |
| `client-helpers.ts` | 客户端辅助 |
| `commands.ts` | ACP 命令 |
| `meta.ts` | 元数据 |
| `policy.ts` | 策略 |

### 会话

| 文件 | 职责 |
|------|------|
| `conversation-id.ts` | 对话 ID |
| `session-mapper.ts` | 会话映射 |
| `session-interaction-mode.ts` | 交互模式 |
| `session-lineage-meta.ts` | 会话血缘 |

### 审批

| 文件 | 职责 |
|------|------|
| `approval-classifier.ts` | 审批分类 |
| `permission-relay.ts` | 权限中继 |

### 绑定

| 文件 | 职责 |
|------|------|
| `persistent-bindings.lifecycle.ts` | 持久绑定生命周期 |
| `persistent-bindings.resolve.ts` | 绑定解析 |
| `persistent-bindings.types.ts` | 绑定类型 |

### 事件

| 文件 | 职责 |
|------|------|
| `event-ledger.ts` | 事件账本 |
| `event-mapper.ts` | 事件映射 |

### 其他

| 文件 | 职责 |
|------|------|
| `normalize-text.ts` | 文本规范化 |
| `record-shared.ts` | 共享记录 |
| `secret-file.ts` | 密钥文件 |
| `control-plane/` | 控制面板 |
| `runtime/` | 运行时 |

## 核心概念

### ACP 协议

外部工具通过 ACP 协议与 Agent 通信：

```
IDE → ACP 请求 → Agent 处理 → ACP 响应 → IDE
```

### 审批系统

敏感操作需要用户审批：

```
Agent 请求 → 审批分类 → 权限中继 → 用户决定
```

### 会话映射

ACP 对话映射到 OpenClaw 会话，保持上下文连续。
