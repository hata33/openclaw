# 03 — 会话模型与多 Agent 路由

> OpenClaw 的会话（Session）是连接用户消息和 AI 模型的中枢。
> 每条消息都经过 Session 路由、Agent 选择、上下文组装、模型调用的完整链路。

## 会话生命周期

```
用户消息进入
  → 渠道事件解析
  → Session 路由（查找或创建 Session）
  → Agent 选择（main / 子 Agent / 指定 Agent）
  → 上下文组装（历史 + 工具定义 + 系统提示）
  → 模型调用（发送到 LLM）
  → 流式响应处理
  → 工具调用循环（如有）
  → 最终回复投递
```

### Session ID

每个会话有唯一标识（UUID 格式），定义在 `src/sessions/session-id.ts`：

```typescript
export const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

### Session Key

Session Key 是更人性化的标识，包含路由信息：

```
agent:main:channel:telegram:chat:123456789
  ↑       ↑        ↑              ↑
  类型   Agent ID  渠道           聊天 ID
```

Gateway 通过 Session Key 将消息路由到正确的 Session。

## Session 与 Agent 的关系

```
Gateway
  ├── Session A (main agent, telegram, chat-1)
  ├── Session B (main agent, discord, guild-123)
  ├── Session C (work agent, whatsapp, +86xxx)
  └── Session D (sub-agent, spawned by A)
```

- **Session** = 一次对话的上下文容器
- **Agent** = 一个独立的助手实例（有独立的 workspace、配置、记忆）
- **一个 Agent 可以有多个 Session**（不同渠道、不同对话）
- **一个 Session 只属于一个 Agent**

### Agent Scope

每个 Agent 有自己的作用域（定义在 `src/agents/agent-scope.ts`）：

```typescript
interface AgentScope {
  agentId: string;        // Agent 唯一标识
  workspaceDir: string;   // 工作目录（SOUL.md、MEMORY.md 等所在）
  config: AgentConfig;    // Agent 专属配置
  sandbox?: SandboxConfig; // 沙箱配置
}
```

`main` Agent 是默认的主 Agent，拥有完整权限。其他 Agent 通过配置定义，各有独立的工作区和权限。

## 多 Agent 路由

OpenClaw 支持将不同的渠道/账户/对等方路由到不同的 Agent：

```yaml
agents:
  defaults:
    model: { primary: "anthropic/claude-opus-4-7" }
  routing:
    - match:
        channel: "telegram"
        chatId: "work-group-*"
      agent: "work"
    - match:
        channel: "discord"
      agent: "personal"
```

### 路由匹配流程

```
入站消息
  → 提取 channel + chatId + senderId
  → 按顺序匹配路由规则
  → 命中 → 使用指定 Agent
  → 未命中 → 使用默认 Agent (main)
```

## Agent Loop（核心循环）

Agent Loop 是 OpenClaw 最核心的代码路径（定义在 `src/agents/`），它实现了完整的 LLM 交互循环：

```
用户消息输入
  → 构建消息列表（历史 + 新消息）
  → 调用 LLM（流式）
  → 处理响应
    ├── 纯文本 → 投递到渠道
    └── 工具调用 → 执行工具 → 将结果加入消息列表 → 回到"调用 LLM"
  → 循环直到无工具调用
```

### 工具调用循环

这是 Agent 的核心能力——它不只是回答问题，还能执行动作：

```
用户: "帮我查一下明天的天气"
  → LLM 返回: tool_call(get_weather, { date: "tomorrow" })
  → 执行工具: get_weather → { temp: 25, condition: "sunny" }
  → LLM 看到工具结果
  → LLM 返回: "明天天气晴朗，25°C"
  → 投递到渠道
```

循环可以多轮进行（LLM 可以连续调用多个工具），但有最大轮数限制防止无限循环。

## 上下文组装

每次调用 LLM 前，需要组装完整的上下文：

```
System Prompt
  + 工具定义列表
  + 历史消息（受上下文窗口限制）
  + 新用户消息
  = 完整的 LLM 输入
```

### 历史消息管理

历史消息不能无限增长，需要管理策略：

1. **滑动窗口**：保留最近 N 条消息
2. **Compaction（压缩）**：将旧消息总结为摘要
3. **Token 计数**：确保不超过模型上下文窗口

## 子 Agent（Sub-agent）

主 Agent 可以通过 `sessions_spawn` 创建子 Agent：

```
主 Agent
  → sessions_spawn("分析这个文件")
  → 创建子 Session（继承或隔离上下文）
  → 子 Agent 独立执行任务
  → 完成后通知主 Agent
```

### 子 Agent 的特点

- **独立 Session**：有自己的会话上下文
- **可继承 workspace**：共享主 Agent 的工作区
- **可隔离执行**：在沙箱中运行
- **异步通知**：完成后通过事件通知主 Agent

## 会话事件

Session 生命周期产生多种事件：

```typescript
// 会话生命周期事件
type SessionLifecycleEvent =
  | "created"      // Session 创建
  | "activated"    // Session 激活（首次使用）
  | "suspended"    // Session 暂停（长时间无活动）
  | "terminated"   // Session 终止
  | "compacted";   // Session 历史压缩
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/sessions/session-id.ts` | Session ID 格式与验证 |
| `src/sessions/session-key-utils.ts` | Session Key 解析 |
| `src/sessions/session-lifecycle-events.ts` | 生命周期事件 |
| `src/agents/agent-scope.ts` | Agent 作用域解析 |
| `src/agents/agent-command.ts` | Agent 命令处理 |
| `src/routing/session-key.ts` | Session 路由 |
| `src/plugins/conversation-binding.ts` | 会话绑定 |

## 总结

1. **Session 是消息的上下文容器** — 每条消息都映射到一个 Session
2. **Agent 是助手的独立实例** — 有自己的 workspace、配置、记忆
3. **路由决定 Agent** — 不同渠道/账户可以绑定不同 Agent
4. **Agent Loop 是核心** — LLM 调用 + 工具执行的循环
5. **子 Agent 支持并行** — 主 Agent 可以 spawn 子 Agent 执行任务
