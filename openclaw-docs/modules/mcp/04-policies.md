# mcp — 策略、配置与边界情况

## 一、传输策略

### 1.1 Stdio

MCP 使用 stdio 传输。stdout 专用于协议通信，日志写入 stderr。

### 1.2 Gateway 连接

Channel Server 通过 WebSocket 连接 Gateway，需要 gatewayUrl 和认证凭证。

## 二、工具策略

### 2.1 工具白名单

Plugin Tools Server 应用工具策略：

```typescript
pickSandboxToolPolicy() → 工具白名单
collectExplicitAllowlist() → 显式允许列表
collectExplicitDenylist() → 显式拒绝列表
```

### 2.2 安全限制

某些工具不通过 MCP 暴露（如 exec、fs_write）。

## 三、Claude Channel Mode

| 模式 | 说明 |
|------|------|
| `off` | 不启用 Claude 渠道能力 |
| `on` | 强制启用 |
| `auto` | 自动检测（有 Claude Desktop 时启用） |

## 四、已知边界情况

### 4.1 stdout 污染

任何写入 stdout 的内容都会破坏 MCP 协议。所有日志必须路由到 stderr。

### 4.2 Gateway 断连

Gateway 断连时 Channel Bridge 需要重连。当前行为取决于 WebSocket 实现。

### 4.3 大量工具

插件可能注册大量工具。MCP 协议支持动态工具列表。
