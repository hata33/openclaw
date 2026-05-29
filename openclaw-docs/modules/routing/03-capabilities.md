# routing — 能力清单与对外接口

## 公共 API 总览

路由模块的公共 API 分为 4 类：Session Key 构建、路由解析、账户管理、辅助工具。

## 一、Session Key 构建（session-key.ts）

### buildAgentMainSessionKey

```typescript
function buildAgentMainSessionKey(params: {
  agentId: string;
  mainKey?: string;
}): string
```

- **功能**：构建 Agent 的主会话 Key
- **格式**：`agent:<agentId>:<mainKey>`
- **默认**：mainKey 为 `"***"`，所以 main Agent → `agent:main:***`

### buildAgentPeerSessionKey

```typescript
function buildAgentPeerSessionKey(params: {
  agentId: string;
  mainKey?: string;
  channel: string;
  accountId?: string | null;
  peerKind?: ChatType | null;
  peerId?: string | null;
  identityLinks?: Record<string, string[]>;
  dmScope?: "main" | "per-peer" | "per-channel-peer" | "per-account-channel-peer";
}): string
```

- **功能**：构建指定对等方的会话 Key
- **根据 peerKind 和 dmScope 选择不同格式**（见 01-overview.md 的 DM Scope 策略表）

### buildGroupHistoryKey

```typescript
function buildGroupHistoryKey(params: {
  channel: string;
  accountId?: string | null;
  peerKind: "group" | "channel";
  peerId: string;
}): string
```

- **功能**：构建群组历史记录 Key
- **格式**：`<channel>:<accountId>:<peerKind>:<peerId>`

### resolveThreadSessionKeys

```typescript
function resolveThreadSessionKeys(params: {
  baseSessionKey: string;
  threadId?: string | null;
  parentSessionKey?: string;
  useSuffix?: boolean;
  normalizeThreadId?: (threadId: string) => string;
}): { sessionKey: string; parentSessionKey?: string }
```

- **功能**：解析线程的 Session Key
- **格式**：`<baseSessionKey>:thread:<threadId>`（useSuffix=true 时）

### normalizeAgentId

```typescript
function normalizeAgentId(value: string | undefined | null): string
```

- **功能**：规范化 Agent ID
- **规则**：小写、路径安全、最多 64 字符、无效字符替换为横线
- **空值默认**：`"main"`

### isValidAgentId

```typescript
function isValidAgentId(value: string | undefined | null): boolean
```

- **功能**：检查 Agent ID 是否有效
- **规则**：`/^[a-z0-9][a-z0-9_-]{0,63}$/i`

### resolveAgentIdFromSessionKey

```typescript
function resolveAgentIdFromSessionKey(sessionKey: string | undefined | null): string
```

- **功能**：从 Session Key 中提取 Agent ID
- **示例**：`"agent:work:telegram:group:123"` → `"work"`

### classifySessionKeyShape

```typescript
function classifySessionKeyShape(sessionKey: string | undefined | null): SessionKeyShape
```

- **功能**：分类 Session Key 的形状
- **返回**：`"missing"` | `"agent"` | `"legacy_or_alias"` | `"malformed_agent"`

### scopeLegacySessionKeyToAgent

```typescript
function scopeLegacySessionKeyToAgent(params: {
  agentId?: string;
  sessionKey?: string;
  mainKey?: string;
}): string | undefined
```

- **功能**：将旧格式 Session Key 作用域化到指定 Agent

## 二、路由解析（resolve-route.ts）

### resolveAgentRoute（核心函数）

```typescript
function resolveAgentRoute(input: ResolveAgentRouteInput): ResolvedAgentRoute
```

- **功能**：将入站消息路由到正确的 Agent
- **输入**：

```typescript
type ResolveAgentRouteInput = {
  cfg: OpenClawConfig;
  channel: string;
  accountId?: string | null;
  peer?: RoutePeer | null;
  parentPeer?: RoutePeer | null;
  guildId?: string | null;
  teamId?: string | null;
  memberRoleIds?: string[];
};
```

- **输出**：

```typescript
type ResolvedAgentRoute = {
  agentId: string;
  channel: string;
  accountId: string;
  sessionKey: string;
  mainSessionKey: string;
  lastRoutePolicy: "main" | "session";
  matchedBy: "binding.peer" | "binding.peer.parent" | "binding.peer.wildcard"
           | "binding.guild+roles" | "binding.guild" | "binding.team"
           | "binding.account" | "binding.channel" | "default";
};
```

### buildAgentSessionKey

```typescript
function buildAgentSessionKey(params: {
  agentId: string;
  channel: string;
  accountId?: string | null;
  peer?: RoutePeer | null;
  dmScope?: "main" | "per-peer" | "per-channel-peer" | "per-account-channel-peer";
  identityLinks?: Record<string, string[]>;
}): string
```

- **功能**：构建 Agent 的会话 Key（包装 buildAgentPeerSessionKey）

### pickFirstExistingAgentId

```typescript
function pickFirstExistingAgentId(cfg: OpenClawConfig, agentId: string): string
```

- **功能**：验证 Agent ID 是否存在于配置中
- **不存在时**：返回默认 Agent ID

### deriveLastRoutePolicy

```typescript
function deriveLastRoutePolicy(params: {
  sessionKey: string;
  mainSessionKey: string;
}): "main" | "session"
```

### resolveInboundLastRouteSessionKey

```typescript
function resolveInboundLastRouteSessionKey(params: {
  route: Pick<ResolvedAgentRoute, "lastRoutePolicy" | "mainSessionKey">;
  sessionKey: string;
}): string
```

## 三、账户管理

### normalizeAccountId（account-id.ts）

```typescript
function normalizeAccountId(value: string | undefined | null): string
```

- **功能**：规范化账户 ID
- **默认**：`"default"`
- **缓存**：最多 512 条

### resolveAccountEntry（account-lookup.ts）

```typescript
function resolveAccountEntry<T>(
  accounts: Record<string, T> | undefined,
  accountId: string,
): T | undefined
```

- **功能**：大小写不敏感的账户查找

### listBoundAccountIds（bindings.ts）

```typescript
function listBoundAccountIds(cfg: OpenClawConfig, channelId: string): string[]
```

- **功能**：列出指定渠道中已绑定的账户 ID

## 四、辅助工具

### listBindings（bindings.ts）

```typescript
function listBindings(cfg: OpenClawConfig): AgentRouteBinding[]
```

- **功能**：从配置中读取所有路由绑定

### peerKindMatches（peer-kind-match.ts）

```typescript
function peerKindMatches(bindingKind: ChatType, scopeKind: ChatType): boolean
```

- **功能**：检查对等方类型是否匹配（group ↔ channel 可互换）

### channelRouteTargets（channel-route-targets.ts）

```typescript
function channelRouteTargets(cfg: OpenClawConfig): ChannelRouteTarget[]
```

- **功能**：列出每个渠道的路由目标 Agent

### 默认账户警告（default-account-warnings.ts）

```typescript
function formatSetExplicitDefaultInstruction(channelKey: string): string
function formatSetExplicitDefaultToConfiguredInstruction(params: { channelKey: string }): string
```

- **功能**：生成配置建议信息，帮助用户修复默认账户问题

## 五、从 session-key-utils.ts 重导出的 API

以下函数从 `sessions/session-key-utils.ts` 重导出：

```typescript
export {
  getSubagentDepth,       // 获取子 Agent 深度
  isCronSessionKey,       // 是否为 Cron Session Key
  isAcpSessionKey,        // 是否为 ACP Session Key
  isSubagentSessionKey,   // 是否为子 Agent Session Key
  parseAgentSessionKey,   // 解析 Agent Session Key
  parseThreadSessionSuffix, // 解析线程后缀
  type ParsedAgentSessionKey,
} from "../sessions/session-key-utils.js";
```
