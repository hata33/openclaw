# sessions — 能力清单与对外接口

## 公共 API 总览

会话模块的 API 分为 7 类：Session ID、Session Key 解析、会话分类、输入来源、会话覆盖、发送策略、事件系统。

## 一、Session ID（session-id.ts）

```typescript
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

| 函数 | 签名 | 说明 |
|------|------|------|
| `looksLikeSessionId` | `(value: string) => boolean` | 判断是否为 UUID 格式 |
| `isSessionId` | `(value: unknown) => boolean` | 类型安全的 Session ID 检查 |
| `assertSessionId` | `(value: unknown) => string` | 断言为有效 ID，否则抛错 |
| `asSessionIdOrDefault` | `(value: unknown, fallback: string) => string` | 返回 ID 或 fallback |

## 二、Session Key 解析（session-key-utils.ts）

### parseAgentSessionKey

```typescript
function parseAgentSessionKey(sessionKey: string): ParsedAgentSessionKey | null

type ParsedAgentSessionKey = {
  agentId: string;   // Agent 标识
  rest: string;       // 剩余部分
};
// "agent:main:telegram:group:123" → { agentId: "main", rest: "telegram:group:123" }
```

### parseThreadSessionSuffix

```typescript
function parseThreadSessionSuffix(rest: string): ParsedThreadSessionSuffix

type ParsedThreadSessionSuffix = {
  baseSessionKey: string | undefined;
  threadId: string | undefined;
};
// "agent:main:discord:guild-123:channel-456:thread-789"
// → { baseSessionKey: "agent:main:discord:guild-123:channel-456", threadId: "thread-789" }
```

### 类型判断函数

| 函数 | 说明 |
|------|------|
| `isCronSessionKey(key)` | 是否为 Cron 会话 Key |
| `isCronRunSessionKey(key)` | 是否为 Cron 运行会话 Key（更精确） |
| `isSubagentSessionKey(key)` | 是否为子 Agent 会话 Key |
| `isAcpSessionKey(key)` | 是否为 ACP 会话 Key |
| `getSubagentDepth(key)` | 获取子 Agent 嵌套深度（0 = 主 Agent） |

### 规范化函数

| 函数 | 说明 |
|------|------|
| `normalizeSessionKeyPreservingOpaquePeerIds(key)` | 规范化 Key，保留不透明 peer ID |
| `normalizeSessionPeerId({ channel, peerKind, peerId })` | 规范化 peer ID |

## 三、会话分类

### classifySessionKind（classify-session-kind.ts）

```typescript
function classifySessionKind(params: {
  sessionKey: string;
  sessionEntry?: SessionEntry | null;
}): SessionKind

// "cron" | "direct" | "group" | "global" | "spawn-child" | "unknown"
```

优先级：sentinel keys → cron → spawn-child → group → direct（fallback）

### deriveSessionChatType（session-chat-type.ts）

```typescript
function deriveSessionChatType(params: {
  sessionKey: string;
  chatType?: ChatType;
}): SessionKeyChatType

// "direct" | "group" | "channel" | "unknown"
```

### deriveSessionChatTypeFromKey（session-chat-type-shared.ts）

```typescript
function deriveSessionChatTypeFromKey(rest: string): SessionKeyChatType | null
```

纯字符串分析，无 I/O。支持旧格式识别：
- `group:xxx` → group
- `xxx@g.us` → group（WhatsApp）
- `discord:guild-xxx:channel-xxx` → channel

## 四、Session Label（session-label.ts）

```typescript
const SESSION_LABEL_MAX_LENGTH = 512;

function parseSessionLabel(raw: unknown): ParsedSessionLabel
function isValidSessionLabel(value: unknown): boolean

type ParsedSessionLabel = { ok: true; label: string } | { ok: false; error: string };
```

## 五、输入来源（input-provenance.ts）

```typescript
type InputProvenanceKind = "external_user" | "inter_session" | "internal_system";

type InputProvenance = {
  kind: InputProvenanceKind;
  originSessionId?: string;
  sourceSessionKey?: string;
};
```

| 函数 | 说明 |
|------|------|
| `makeInputProvenance(kind, params?)` | 创建 InputProvenance 对象 |
| `normalizeInputProvenance(raw)` | 规范化输入来源 |
| `applyInputProvenanceToUserMessage(msg, provenance)` | 将来源信息附加到消息 |

| 来源类型 | 含义 |
|----------|------|
| `external_user` | 来自外部用户（渠道消息） |
| `inter_session` | 来自其他会话（跨会话通信） |
| `internal_system` | 来自系统内部（Cron、Heartbeat） |

## 六、会话覆盖

### Level Overrides（level-overrides.ts）

```typescript
function parseVerboseOverride(raw: unknown):
  | { ok: true; value: VerboseLevel | null | undefined }
  | { ok: false; error: string }

function parseTraceOverride(raw: unknown): ...
function parseThinkingOverride(raw: unknown): ...
```

合法值：`"on"`, `"off"`, `"full"` 等。用于 `/verbose`、`/trace` 命令。

### Model Overrides（model-overrides.ts）

```typescript
type ModelOverrideSelection = {
  provider: string;
  model: string;
  isDefault?: boolean;
};
```

| 函数 | 说明 |
|------|------|
| `applyModelOverride({ sessionEntry, providerId, modelId, fallbackOrigin })` | 应用模型覆盖 |
| `clearModelOverride(sessionEntry)` | 清除模型覆盖 |
| `resolveEffectiveModel({ sessionEntry, agentConfig })` | 解析实际生效模型（覆盖 > 配置 > 默认） |
| `clearFallbackOrigin(entry)` | 清除 fallback origin 标记 |

## 七、发送策略（send-policy.ts）

```typescript
type SessionSendPolicyDecision = "allow" | "deny";

function normalizeSendPolicy(raw?: string | null): SessionSendPolicyDecision | undefined

function resolveSendPolicy(params: {
  cfg: OpenClawConfig;
  sessionEntry?: SessionEntry | null;
  sessionKey?: string;
}): SessionSendPolicyDecision
```

## 八、事件系统

### 生命周期事件（session-lifecycle-events.ts）

```typescript
type SessionLifecycleEvent = {
  sessionKey: string;
  reason: string;
  parentSessionKey?: string;
  label?: string;
  displayName?: string;
};

function onSessionLifecycleEvent(listener): () => void  // 注册，返回取消函数
function emitSessionLifecycleEvent(event): void           // 触发
```

### 转录事件（transcript-events.ts）

```typescript
type SessionTranscriptUpdate = {
  sessionFile: string;
  sessionKey?: string;
  message?: unknown;
  messageId?: string;
  messageSeq?: number;
};

function onSessionTranscriptUpdate(listener): () => void
function emitSessionTranscriptUpdate(update): void
```

## 九、Session ID 解析（session-id-resolution.ts）

```typescript
function resolveSessionIdMatch(params: {
  sessions: Record<string, SessionEntry>;
  sessionKey?: string;
  sessionId?: string;
}): SessionIdMatchSelection | null
```

按 sessionKey 或 sessionId 查找匹配的 SessionEntry，支持规范化匹配和结构化匹配。
