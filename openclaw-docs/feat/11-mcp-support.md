# 11 — MCP 协议支持

> OpenClaw 同时作为 MCP Server 和 MCP Client，通过 Model Context Protocol
> 与外部工具链、IDE、Agent 框架实现标准化互操作。

## MCP 在 OpenClaw 中的定位

MCP（Model Context Protocol）是 Anthropic 提出的标准化协议，用于 LLM 应用与外部工具/数据源之间的通信。OpenClaw 对 MCP 的支持分为三个层面：

```
┌─────────────────────────────────────────────────┐
│                  OpenClaw Gateway                │
│                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ MCP      │  │ MCP Channel  │  │ MCP       │  │
│  │ Tools    │  │ Server       │  │ Plugin    │  │
│  │ Server   │  │ (Claude等)   │  │ Tools     │  │
│  └────┬─────┘  └──────┬───────┘  └─────┬─────┘  │
│       │               │                │         │
│       └───────────────┴────────────────┘         │
│                       │                          │
│              Stdio / SSE Transport               │
└───────────────────────┬─────────────────────────┘
                        │
              外部 MCP Client/Server
         (Claude Desktop, IDE, ACPX 子Agent...)
```

## 三种 MCP 服务模式

### 1. OpenClaw Tools MCP Server

`src/mcp/openclaw-tools-serve.ts` — 将 OpenClaw 内置工具暴露为 MCP 工具。

```
OpenClaw 内置工具 (cron, browser, ...)
  → resolveOpenClawToolsForMcp() 收集工具
  → createToolsMcpServer() 包装为 MCP Server
  → connectToolsMcpServerToStdio() 通过 stdio 暴露
```

外部 MCP Client（如 Claude Desktop）可以通过 stdio 连接，直接调用 OpenClaw 的工具（如 cron 调度）。

### 2. Plugin Tools MCP Server

`src/mcp/plugin-tools-serve.ts` — 将插件注册的工具暴露为 MCP 工具。

```
插件注册的工具 (memory_recall, memory_store, ...)
  → ensureStandalonePluginToolRegistryLoaded() 加载插件工具注册表
  → resolvePluginTools() 按权限策略过滤
  → 包装为 MCP Server 通过 stdio 暴露
```

关键点：插件工具会经过工具权限策略（allowlist/denylist/profile）过滤，确保安全。

### 3. Channel Server（MCP Channel）

`src/mcp/channel-server.ts` — OpenClaw 作为 MCP Server 与 Claude 等 Agent 框架的深度集成通道。

这是最复杂的模式，OpenClaw 通过 MCP 协议向 Claude 等 Agent 提供：

- **会话管理** — 列出会话、获取历史、发送消息
- **工具调用** — 代理 Claude 调用 OpenClaw 工具
- **审批流程** — Claude 的权限请求通过 OpenClaw 审批
- **事件队列** — Claude 可以等待特定事件（消息到达、审批完成等）

```
Claude Code / Claude Desktop
  ← stdio MCP →
OpenClaw Channel Server
  ← Gateway Protocol →
OpenClaw Gateway (sessions, tools, events)
```

## Channel Bridge 架构

`src/mcp/channel-bridge.ts` 是 Channel Server 的核心，实现了 MCP 到 Gateway 的桥接：

```typescript
class OpenClawChannelBridge {
  // 与 Gateway 的连接
  private gateway: GatewayClient | null = null;

  // 事件队列（Gateway 推送的事件缓存）
  private readonly queue: QueueEvent[] = [];

  // 等待中的 MCP 请求
  private readonly pendingWaiters = new Set<PendingWaiter>();

  // Claude 权限审批请求
  private readonly pendingClaudePermissions = new Map<string, ClaudePermissionRequest>();

  // 通用审批请求
  private readonly pendingApprovals = new Map<string, PendingApproval>();
}
```

### 消息流

```
Claude 发起 MCP 请求（如 "列出会话"）
  → Channel Server 接收
  → ChannelBridge 转换为 Gateway Protocol 请求
  → Gateway 处理并返回结果
  → ChannelBridge 转换为 MCP 响应返回给 Claude
```

### 事件等待机制

Channel Bridge 实现了一个事件队列 + 等待器模式：

```
Gateway 推送事件 → 加入 queue
Claude 等待事件 → 检查 queue 是否有匹配
  → 有匹配 → 立即返回
  → 无匹配 → 注册 waiter，等 Gateway 推送新事件时匹配
```

支持的事件过滤：
- 按会话 ID 过滤
- 按事件类型过滤
- 按发送者过滤
- 超时控制

### Claude 权限审批

当 Claude 需要执行敏感操作时，通过 MCP 发起权限请求：

```
Claude 请求权限（如执行 shell 命令）
  → Channel Server 接收 permission_request
  → 存入 pendingClaudePermissions
  → 通知 OpenClaw 用户
  → 用户通过 OpenClaw 渠道回复 "yes <code>" 或 "no <code>"
  → Channel Bridge 匹配审批码
  → 返回审批结果给 Claude
```

## 配置方式

MCP 相关配置在 `mcp` 配置块中：

```yaml
mcp:
  servers:
    - name: "my-tool-server"
      command: "node"
      args: ["./my-mcp-server.js"]
      # 可选的环境变量
      env:
        API_KEY: "${secrets.mcp_api_key}"
```

OpenClaw 作为 MCP Client 时，可以连接外部 MCP Server 并将其工具暴露给 Agent 使用。

## 工具权限策略传递

Plugin Tools MCP Server 在暴露工具时，会应用完整的工具权限策略：

```
config.tools.profile → 工具配置文件策略
config.tools.alsoAllow → 额外允许列表
  → mergeAlsoAllowPolicy() 合并策略
  → collectExplicitAllowlist() 收集白名单
  → collectExplicitDenylist() 收集黑名单
  → resolvePluginTools() 按策略过滤插件工具
```

这确保了 MCP 暴露的工具集与 Agent 直接使用的工具集遵循相同的权限策略。

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/mcp/openclaw-tools-serve.ts` | 内置工具 MCP Server |
| `src/mcp/plugin-tools-serve.ts` | 插件工具 MCP Server |
| `src/mcp/channel-server.ts` | Channel MCP Server（Claude 集成） |
| `src/mcp/channel-bridge.ts` | MCP ↔ Gateway 桥接核心 |
| `src/mcp/channel-tools.ts` | Channel MCP 注册的工具 |
| `src/mcp/channel-shared.ts` | 共享类型定义 |
| `src/mcp/tools-stdio-server.ts` | Stdio 传输层封装 |
| `src/mcp/plugin-tools-handlers.ts` | 插件工具 MCP 处理器 |

## 总结

1. **MCP Server 模式** — OpenClaw 将内置工具和插件工具通过 stdio 暴露给外部 MCP Client
2. **MCP Channel 模式** — 深度集成 Claude 等 Agent 框架，提供会话管理、事件队列、权限审批
3. **安全策略一致** — MCP 暴露的工具与 Agent 直接使用的工具遵循相同的权限策略
4. **Bridge 模式** — 通过 ChannelBridge 实现 MCP 协议到 Gateway Protocol 的双向转换
