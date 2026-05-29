# mcp — MCP 协议集成

> 实现 Model Context Protocol（MCP）服务器，将 OpenClaw 的渠道、工具和插件暴露为 MCP 工具。
> 支持 Claude Desktop、Cursor 等 MCP 客户端通过标准协议调用 OpenClaw 功能。

## 文件结构

| 文件 | 行数 | 职责 |
|------|------|------|
| `channel-server.ts` | MCP Channel 服务器（Claude Desktop 渠道集成） |
| `channel-bridge.ts` | Gateway 桥接（MCP ↔ Gateway WebSocket） |
| `channel-shared.ts` | 共享类型和工具函数 |
| `channel-tools.ts` | 渠道 MCP 工具注册（消息发送、会话管理） |
| `openclaw-tools-serve.ts` | 内置工具 MCP 服务器（如 cron） |
| `plugin-tools-serve.ts` | 插件工具 MCP 服务器（如 memory_recall） |
| `plugin-tools-handlers.ts` | 插件工具 MCP 处理器 |
| `tools-stdio-server.ts` | 通用工具 MCP stdio 服务器 |

## 核心概念

### MCP（Model Context Protocol）

Anthropic 定义的 AI 工具协议标准。允许外部应用通过标准化接口调用工具。

### 三种 MCP 服务器

| 服务器 | 说明 | 用途 |
|--------|------|------|
| Channel Server | 渠道集成 | Claude Desktop 通过 OpenClaw 发消息 |
| OpenClaw Tools | 内置工具 | 暴露 cron 等内置工具 |
| Plugin Tools | 插件工具 | 暴露 memory_recall 等插件工具 |

### Claude Channel Mode

```typescript
type ClaudeChannelMode = "off" | "on" | "auto";
```

控制是否启用 Claude 渠道能力（`claude/channel` capability）。
