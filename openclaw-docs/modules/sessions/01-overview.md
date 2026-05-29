# sessions — 功能定义与设计思想

## 这个模块解决什么问题？

会话管理模块解决 3 个核心问题：

1. **会话标识** — 每个对话如何被唯一标识和查找？
2. **会话分类** — 这是什么类型的对话（DM、群组、Cron、子 Agent）？
3. **会话状态** — 会话的当前状态如何存储和管理（模型覆盖、发送策略、级别设置）？

## Session ID

Session ID 是 UUID 格式的唯一标识：

```typescript
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

- 用于持久化存储中的会话标识
- 与 Session Key 不同：Session ID 是内部标识，Session Key 包含路由信息

## Session Key 解析

`parseAgentSessionKey()` 将 Session Key 解析为结构化数据：

```typescript
type ParsedAgentSessionKey = {
  agentId: string;   // Agent 标识
  rest: string;       // 剩余部分
};

// "agent:main:telegram:group:123456"
// → { agentId: "main", rest: "telegram:group:123456" }
```

### Session Key 形状分类

```typescript
type SessionKeyShape = "missing" | "agent" | "legacy_or_alias" | "malformed_agent";
```

- `agent` — 标准格式 `agent:<id>:<rest>`
- `legacy_or_alias` — 旧格式或别名
- `malformed_agent` — 以 `agent:` 开头但格式不正确
- `missing` — 空值

## Session Kind — 会话类型

```typescript
type SessionKind = "cron" | "direct" | "group" | "global" | "spawn-child" | "unknown";
```

分类优先级（`classify-session-kind.ts`）：

```
1. sentinel keys ("global", "unknown") → "global" / "unknown"
2. cron key shape → "cron"
3. spawn-child (entry has spawnedBy) → "spawn-child"
4. group/channel chatType or key-shape substring → "group"
5. fallback → "direct"
```

## Chat Type — 聊天类型

```typescript
type SessionKeyChatType = "direct" | "group" | "channel" | "unknown";
```

### 推导逻辑

聊天类型从 Session Key 中推导：

```
agent:main:*** → direct
agent:main:telegram:group:123 → group
agent:main:discord:guild-456:channel-789 → channel
```

也支持旧格式识别（WhatsApp 群组 `@g.us`、Discord guild+channel 模式等）。

## Input Provenance — 输入来源

追踪每条消息的来源：

```typescript
type InputProvenanceKind = "external_user" | "inter_session" | "internal_system";

type InputProvenance = {
  kind: InputProvenanceKind;
  originSessionId?: string;
  sourceSessionKey?: string;
};
```

| 来源类型 | 含义 |
|----------|------|
| `external_user` | 来自外部用户（渠道消息） |
| `inter_session` | 来自其他会话（跨会话消息） |
| `internal_system` | 来自系统内部（Cron、Heartbeat） |

## 设计原则

1. **UUID 不透明** — Session ID 不包含语义信息，只是一个唯一标识
2. **Session Key 语义丰富** — 包含路由信息，可以直接判断会话类型
3. **事件驱动** — 通过事件系统通知生命周期变化
4. **分离关注点** — Session ID 负责持久化，Session Key 负责路由
