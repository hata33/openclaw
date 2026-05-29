# routing — 实现流程与数据流

## 路由解析完整流程

### 入站消息到 Agent 路由

```
1. 渠道插件接收消息
   → 提取 channel, accountId, peer, guildId, teamId, memberRoleIds

2. 调用 resolveAgentRoute(input)
   → 输入: ResolveAgentRouteInput
   → 输出: ResolvedAgentRoute

3. resolveAgentRoute 内部流程:
   a. 规范化 channel, accountId, peer
   b. 从配置加载绑定列表（listBindings）
   c. 构建绑定索引（EvaluatedBindingsIndex）
   d. 按 8 层优先级匹配
   e. 构建 Session Key
   f. 返回路由结果
```

### 详细调用链

```
resolveAgentRoute(input)
  │
  ├→ normalizeToken(channel)          // 规范化渠道名
  ├→ normalizeAccountId(accountId)    // 规范化账户 ID
  ├→ pickFirstExistingAgentId(cfg, agentId)  // 验证 Agent 是否存在
  │
  ├→ getEvaluatedBindingsForChannelAccount(cfg, channel, accountId)
  │    ├→ buildEvaluatedBindingsByChannel(cfg)
  │    │    └→ listBindings(cfg)      // 从配置读取绑定列表
  │    │         └→ listRouteBindings(cfg)
  │    │
  │    ├→ normalizeBindingMatch(binding.match)  // 规范化每条绑定的匹配条件
  │    │
  │    └→ buildEvaluatedBindingsIndex(bindings)  // 构建匹配索引
  │         ├→ byPeer: Map<string, EvaluatedBinding[]>     // 按 peer 索引
  │         ├→ byPeerWildcard: EvaluatedBinding[]           // 通配符 peer
  │         ├→ byGuildWithRoles: Map<string, EvaluatedBinding[]>  // guild+roles
  │         ├→ byGuild: Map<string, EvaluatedBinding[]>     // guild（无 roles）
  │         ├→ byTeam: Map<string, EvaluatedBinding[]>      // team
  │         ├→ byAccount: EvaluatedBinding[]                // account
  │         └→ byChannel: EvaluatedBinding[]                // channel
  │
  ├→ 8 层优先级匹配循环
  │    ├→ Tier 1: binding.peer         // 精确 peer 匹配
  │    ├→ Tier 2: binding.peer.parent  // 线程父 peer 继承
  │    ├→ Tier 3: binding.peer.wildcard // 通配符 peer
  │    ├→ Tier 4: binding.guild+roles  // guild + 角色
  │    ├→ Tier 5: binding.guild        // guild
  │    ├→ Tier 6: binding.team         // team
  │    ├→ Tier 7: binding.account      // account
  │    └→ Tier 8: binding.channel      // channel
  │
  └→ choose(agentId, matchedBy, sessionConfig)
       ├→ buildAgentPeerSessionKey(...)  // 构建 Session Key
       ├→ buildAgentMainSessionKey(...)  // 构建主会话 Key
       └→ 返回 ResolvedAgentRoute
```

## Session Key 构建流程

### buildAgentPeerSessionKey

```
输入: agentId, channel, accountId, peerKind, peerId, dmScope, identityLinks

1. 规范化 agentId → normalizeAgentId()
2. 如果 peerKind === "direct"（私聊）:
   a. 根据 dmScope 决定 Session Key 格式
   b. 检查 identityLinks（跨渠道身份关联）
   c. 返回对应格式的 Key
3. 如果 peerKind === "group" | "channel":
   a. 规范化 channel 和 peerId
   b. 返回 agent:<agentId>:<channel>:<peerKind>:<peerId>
```

### DM Session Key 的四种模式

```
dmScope = "main":
  → agent:main:***
  （所有私聊汇聚到主会话）

dmScope = "per-peer":
  → agent:main:direct:+86138xxxx
  （按对话对象分，跨渠道合并同一人）

dmScope = "per-channel-peer":
  → agent:main:telegram:direct:+86138xxxx
  （按渠道+对话对象分）

dmScope = "per-account-channel-peer":
  → agent:main:telegram:bot1:direct:+86138xxxx
  （按账户+渠道+对话对象分，最细粒度）
```

### Identity Links（身份关联）

当用户在多个渠道使用同一个身份时，`identityLinks` 可以将它们关联起来：

```yaml
session:
  identityLinks:
    alice:
      - "+86138xxxx"
      - "telegram:alice_tg"
      - "discord:alice_discord"
```

当 dmScope 不是 "main" 时，系统会查找关联的身份，将不同渠道的同一用户映射到同一个 Session Key。

## 绑定索引构建

### EvaluatedBindingsIndex

为了高效匹配，系统将绑定预建索引：

```typescript
type EvaluatedBindingsIndex = {
  byPeer: Map<string, EvaluatedBinding[]>;           // "group:123456" → [绑定...]
  byPeerWildcard: EvaluatedBinding[];                 // peer 通配符绑定
  byGuildWithRoles: Map<string, EvaluatedBinding[]>;  // guild+roles 绑定
  byGuild: Map<string, EvaluatedBinding[]>;           // guild 绑定
  byTeam: Map<string, EvaluatedBinding[]>;            // team 绑定
  byAccount: EvaluatedBinding[];                      // account 绑定
  byChannel: EvaluatedBinding[];                      // channel 绑定
};
```

### Peer 查找键

由于 group 和 channel 可以互换匹配，peer 查找时会生成两个键：

```typescript
function peerLookupKeys(kind: ChatType, id: string): string[] {
  if (kind === "group") return [`group:${id}`, `channel:${id}`];
  if (kind === "channel") return [`channel:${id}`, `group:${id}`];
  return [`${kind}:${id}`];
}
```

## 缓存机制

路由系统使用多层缓存提升性能：

### 1. 绑定评估缓存

```typescript
const evaluatedBindingsCacheByCfg = new WeakMap<OpenClawConfig, EvaluatedBindingsCache>();
```

- 使用 `WeakMap` 以配置对象为 key，配置更新时自动失效
- 限制最大缓存键数：`MAX_EVALUATED_BINDINGS_CACHE_KEYS = 2000`

### 2. 路由结果缓存

```typescript
const resolvedRouteCacheByCfg = new WeakMap<OpenClawConfig, {
  byKey: Map<string, ResolvedAgentRoute>;
}>();
```

- 缓存已解析的路由结果
- 限制：`MAX_RESOLVED_ROUTE_CACHE_KEYS = 4000`

### 3. Agent 查找缓存

```typescript
const agentLookupCacheByCfg = new WeakMap<OpenClawConfig, AgentLookupCache>();
```

- 缓存 Agent ID 到规范化 ID 的映射
- 避免每次路由都遍历 Agent 列表

### 4. Account ID 缓存

```typescript
const normalizeAccountIdCache = new Map<string, string>();
const ACCOUNT_ID_CACHE_MAX = 512;
```

- 缓存 Account ID 的规范化结果
- LRU 淘汰，最大 512 条

## 线程路由（Thread Routing）

当消息来自 Discord/Slack 的线程时：

```
peer: { kind: "group", id: "thread-123" }  // 线程
parentPeer: { kind: "group", id: "guild-456" }  // 父 Guild

1. 先尝试匹配 peer（线程）
2. 如果不匹配，尝试匹配 parentPeer（父 Guild）
   → matchedBy: "binding.peer.parent"
3. 如果都不匹配，继续后续层
```

这确保线程消息能继承父频道的路由规则。

## ResolvedAgentRoute 结构

路由解析的最终结果：

```typescript
type ResolvedAgentRoute = {
  agentId: string;           // 目标 Agent ID
  channel: string;           // 渠道名
  accountId: string;         // 账户 ID
  sessionKey: string;        // 会话 Key（用于 Session 查找/创建）
  mainSessionKey: string;    // Agent 的主会话 Key
  lastRoutePolicy: "main" | "session";  // 最后路由策略
  matchedBy: string;         // 匹配方式（用于调试）
};
```

### lastRoutePolicy

- `"main"` — 当 sessionKey 等于 mainSessionKey 时，表示所有消息汇聚到主会话
- `"session"` — 消息路由到独立会话
