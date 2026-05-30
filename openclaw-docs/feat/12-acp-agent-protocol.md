# 12 — ACP 子 Agent 通信协议

> OpenClaw 通过 ACP（Agent Communication Protocol）实现父子 Agent 之间的
> 标准化通信，支持子 Agent 启动、会话管理、工具调用和权限审批。

## ACP 是什么

ACP（Agent Communication Protocol）是一个独立于 MCP 的 Agent 间通信协议。如果说 MCP 是"LLM 与工具的接口"，那么 ACP 是"Agent 与 Agent 的接口"。

```
┌─────────────────────────────────────┐
│          OpenClaw Gateway           │
│                                     │
│  ┌──────────┐      ┌────────────┐  │
│  │ 主 Agent │─────→│ ACP Client │  │
│  │ (主会话)  │      │ (发起方)    │  │
│  └──────────┘      └─────┬──────┘  │
│                          │ NDJSON   │
│                    stdio │ over     │
│                          │ streams  │
│  ┌───────────────────────┴──────┐   │
│  │        ACP Server            │   │
│  │  (AcpGatewayAgent Translator)│   │
│  │        ┌──────────┐          │   │
│  │        │ 子 Agent │          │   │
│  │        │ 会话     │          │   │
│  │        └──────────┘          │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

## 两种角色

### ACP Client（客户端）

`src/acp/client.ts` — 主 Agent 通过 ACP Client 启动和管理子 Agent。

```
主 Agent 请求创建子 Agent
  → AcpClient.spawn() 启动子进程
  → 通过 stdio 建立 NDJSON 连接
  → 使用 @agentclientprotocol/sdk 的 ClientSideConnection 通信
  → 返回 session id 和连接句柄
```

Client 负责：
- **启动子 Agent** — spawn 子进程并建立连接
- **发送 Prompt** — 向子 Agent 发送任务
- **接收事件** — 监听子 Agent 的输出和状态更新
- **权限请求** — 转发子 Agent 的权限请求给主 Agent

### ACP Server（服务端）

`src/acp/server.ts` — 在子 Agent 端运行，通过 `AcpGatewayAgent`（translator）桥接到 Gateway。

```
子进程启动
  → serveAcpGateway() 初始化
  → 创建 GatewayClient 连接到本地 Gateway
  → 创建 AgentSideConnection 接收 ACP 请求
  → AcpGatewayAgent 翻译 ACP ↔ Gateway Protocol
```

## AcpGatewayAgent：协议翻译器

`src/acp/translator.ts` 是 ACP 的核心——它实现了 `Agent` 接口，将每个 ACP 请求翻译为 Gateway 操作：

| ACP 操作 | Gateway 翻译 |
|----------|-------------|
| `initialize` | 报告 Agent 能力、版本 |
| `newSession` | 创建新 Session |
| `loadSession` | 加载已有 Session |
| `prompt` | 向 Session 发送消息 |
| `closeSession` | 关闭 Session |
| `setSessionMode` | 切换会话交互模式 |
| `listSessions` | 列出可用 Session |

### 会话映射

```
ACP Session ↔ Gateway Session ↔ OpenClaw Session

ACP session id → OpenClaw session key
ACP 会话配置 → OpenClaw agent 配置
ACP 模型设置 → OpenClaw 模型覆盖
```

## 事件流

```
子 Agent 执行任务
  → 产生事件（文本输出、工具调用、状态变更）
  → AcpGatewayAgent 通过 SessionUpdate 推送
  → ACP Client 接收 SessionNotification
  → 主 Agent 处理或展示给用户
```

### 事件类型

- **文本输出** — 子 Agent 的回复文本
- **工具调用** — 子 Agent 正在使用的工具
- **权限请求** — 子 Agent 需要用户审批
- **状态变更** — 会话模式、思考级别等变化
- **完成通知** — 任务完成或中止

## 权限审批流

`src/acp/permission-relay.ts` — 子 Agent 需要执行敏感操作时，权限请求通过 ACP 传递到主 Agent：

```
子 Agent 需要权限（如执行命令）
  → ACP Server 发送 requestPermission
  → ACP Client 接收
  → 主 Agent 判断是否需要用户介入
  → 用户审批（通过渠道消息）
  → 审批结果通过 ACP 返回给子 Agent
```

### 审批分类

`src/acp/approval-classifier.ts` 自动分类权限请求的严重程度：

```typescript
// 根据操作类型自动判断
// - 低风险：读取文件、搜索
// - 中风险：写入文件、安装包
// - 高风险：执行命令、网络访问
```

## 持久绑定

`src/acp/persistent-bindings.lifecycle.ts` — ACP 支持持久绑定，子 Agent 可以跨会话存活：

```
首次创建子 Agent → 生成 binding id
记录到 persistent-bindings 配置
后续会话 → 通过 binding id 恢复子 Agent
```

## 事件账本

`src/acp/event-ledger.ts` — 所有 ACP 事件记录到本地文件，用于调试和审计：

```
ACP 事件 → ndjson 格式 → 写入 ~/.openclaw/acp-events/
  → 可用于事后分析、回放、调试
```

## 安全机制

1. **Secret 文件隔离** — `src/acp/secret-file.ts` 管理子进程的认证信息
2. **环境变量清理** — `shouldStripProviderAuthEnvVarsForAcpServer()` 确保子进程不继承敏感环境变量
3. **权限策略** — `src/acp/policy.ts` 定义子 Agent 的权限边界
4. **审批分类** — 自动判断操作风险等级

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/acp/client.ts` | ACP Client — 启动和管理子 Agent |
| `src/acp/server.ts` | ACP Server — 子 Agent 端的 Gateway 桥接 |
| `src/acp/translator.ts` | 协议翻译器（ACP ↔ Gateway） |
| `src/acp/permission-relay.ts` | 权限审批中继 |
| `src/acp/approval-classifier.ts` | 权限请求自动分类 |
| `src/acp/persistent-bindings.lifecycle.ts` | 持久绑定生命周期 |
| `src/acp/event-ledger.ts` | 事件账本记录 |
| `src/acp/policy.ts` | 安全策略定义 |
| `src/acp/session.ts` | 会话管理 |
| `src/acp/commands.ts` | ACP CLI 命令 |

## 总结

1. **ACP 是 Agent 间协议** — 不同于 MCP（Agent-Tool 协议），ACP 解决 Agent 与 Agent 的通信
2. **Client-Server 模式** — 主 Agent 为 Client，子 Agent 为 Server
3. **协议翻译** — AcpGatewayAgent 将 ACP 操作翻译为 Gateway Protocol
4. **安全优先** — 权限审批、环境隔离、操作分类三层安全保障
5. **持久化支持** — 子 Agent 可以跨会话存活，事件完整记录
