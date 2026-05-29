# gateway — Gateway 网关

> 362 文件，102154 行。OpenClaw Gateway 核心服务器。
> 管理 WebSocket 连接、会话、节点和 API 方法。

## 子模块

| 子目录 | 说明 |
|--------|------|
| `server/` | HTTP/WebSocket 服务器 |
| `protocol/` | 通信协议（WebSocket 消息格式） |
| `methods/` | API 方法（供客户端调用） |
| `server-methods/` | 服务器端方法实现 |
| `test/` | 测试 |

## 核心概念

### WebSocket 服务器

Gateway 是一个 WebSocket 服务器，所有客户端（TUI、节点、渠道适配器）通过 WebSocket 连接。

### 协议

```
客户端 → { type: "request", method: "...", params: {...} }
服务器 → { type: "response", result: {...} }
服务器 → { type: "event", event: "...", data: {...} }
```

### API 方法

Gateway 暴露的 API 方法：

- 会话管理（创建、列表、发送消息）
- 节点管理（注册、命令执行）
- 配置管理（读取、更新）
- 状态查询

### 认证

支持 Token 和密码认证。
