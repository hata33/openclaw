# routing — 策略、配置与边界情况

## 一、路由匹配策略

### 1.1 八层优先级匹配

路由系统按精确度从高到低匹配绑定规则，第一个匹配即终止：

```
优先级    匹配方式                    说明
──────────────────────────────────────────────────────
 1       binding.peer               精确匹配对等方 ID
 2       binding.peer.parent        线程继承父频道绑定
 3       binding.peer.wildcard      通配符匹配对等方类型
 4       binding.guild+roles        匹配 Guild + 角色
 5       binding.guild              匹配 Guild（不限角色）
 6       binding.team               匹配 Team
 7       binding.account            匹配账户
 8       binding.channel            匹配渠道（最宽泛）
─        default                    无匹配 → 使用 main Agent
```

### 1.2 匹配源顺序保持

同一层级内的多条绑定按配置文件中的声明顺序匹配：

```yaml
agents:
  routing:
    - match: { channel: "telegram", peer: "group:123" }
      agent: work          # 先声明，优先匹配
    - match: { channel: "telegram", peer: "group:456" }
      agent: personal      # 后声明
```

绑定在评估时被赋予递增的 `order` 值，保证源顺序。

### 1.3 账户+通配符合并

当同一渠道同时有账户特定绑定和通配符绑定（`account: "*"`）时：

```typescript
function mergeEvaluatedBindingsInSourceOrder(
  accountScoped: EvaluatedBinding[],
  anyAccount: EvaluatedBinding[],
): EvaluatedBinding[]
```

按源顺序合并两者，而非账户绑定优先。这允许通配符绑定穿插在账户绑定之间。

### 1.4 线程父级继承

当消息来自线程且线程本身没有匹配的绑定时：

```
binding.peer.parent 匹配逻辑：
1. 检查 parentPeer（线程的父频道）是否匹配绑定
2. 如果匹配 → 使用该绑定的 Agent
3. matchedBy 标记为 "binding.peer.parent"
```

**为什么不直接用 Tier 1？** 因为线程的 peer ID 是线程 ID（如 `"thread-123"`），通常没有对应的绑定。但父频道（如 `"channel-456"`）可能有绑定，应该继承。

## 二、Session Key 构建策略

### 2.1 DM Scope 策略

DM 消息的会话隔离粒度由 `dmScope` 控制：

| dmScope | 粒度 | 适用场景 |
|---------|------|----------|
| `main` | 所有 DM 汇聚 | 个人助手，一个会话管理所有对话 |
| `per-peer` | 按对话对象 | 需要为每个联系人维护独立上下文 |
| `per-channel-peer` | 按渠道+对象 | 跨渠道同一人用不同上下文 |
| `per-account-channel-peer` | 按账户+渠道+对象 | 多 Bot 实例，完全隔离 |

### 2.2 Identity Links 跨渠道身份关联

当 dmScope 不是 `"main"` 时，Identity Links 将不同渠道的同一用户关联：

```yaml
session:
  identityLinks:
    alice:
      - "+86138xxxx"
      - "telegram:alice"
      - "discord:alice#1234"
```

```
Telegram 消息来自 "+86138xxxx"
  → 查找 identityLinks，匹配到 "alice"
  → 使用 "alice" 作为 peerId 构建统一 Session Key
  → Discord 消息来自 "alice#1234" 也映射到同一 Session Key
```

**查找逻辑**：
1. 先用纯 peerId 查找
2. 再用 `channel:peerId` 格式查找（更精确）
3. 找到关联身份后，使用规范名称作为 peerId

### 2.3 群组/频道 Session Key

非 DM 消息的 Session Key 格式固定：

```
agent:<agentId>:<channel>:<peerKind>:<peerId>
```

- `peerKind` = `"group"` 或 `"channel"`
- `peerId` 经过 `normalizeSessionPeerId()` 处理

## 三、缓存策略

### 3.1 WeakMap 缓存

绑定评估和路由结果使用 `WeakMap<OpenClawConfig, ...>` 缓存：

```typescript
const evaluatedBindingsCacheByCfg = new WeakMap<OpenClawConfig, EvaluatedBindingsCache>();
const resolvedRouteCacheByCfg = new WeakMap<OpenClawConfig, RouteCache>();
const agentLookupCacheByCfg = new WeakMap<OpenClawConfig, AgentLookupCache>();
```

**自动失效机制**：当配置对象被 GC 回收时，缓存自动清除。

**配置更新检测**：通过比较 `agentsRef`/`bindingsRef` 指针判断配置是否变化：

```typescript
if (existing && existing.agentsRef === agentsRef) {
  return existing;  // 配置未变，使用缓存
}
```

### 3.2 缓存容量限制

| 缓存 | 最大键数 | LRU 淘汰 |
|------|----------|-----------|
| 绑定评估 | 2,000 | 按插入顺序淘汰最旧 |
| 路由结果 | 4,000 | 同上 |
| Account ID | 512 | 同上 |

### 3.3 索引预构建

绑定不是每次线性扫描，而是预构建为多级索引：

```
binding.peer       → Map<"group:123456", Binding[]>
binding.guild      → Map<"guild-789", Binding[]>
binding.team       → Map<"team-012", Binding[]>
binding.account    → Binding[]（线性扫描，通常很短）
binding.channel    → Binding[]（线性扫描，兜底）
```

每级索引都是 O(1) 查找（Map）或 O(n) 线性扫描（数组，n 通常 < 10）。

## 四、Agent ID 安全策略

### 4.1 规范化规则

Agent ID 必须是路径安全和 shell 友好的：

```typescript
const VALID_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
```

- 只允许字母、数字、下划线、横线
- 必须以字母或数字开头
- 最长 64 字符

### 4.2 防御性处理

无效字符被替换为横线，前导/尾随横线被移除：

```typescript
normalized
  .replace(INVALID_CHARS_RE, "-")
  .replace(LEADING_DASH_RE, "")
  .replace(TRAILING_DASH_RE, "")
  .slice(0, 64)
```

**为什么？** Agent ID 被用作文件系统路径的一部分（如 workspace 目录名），必须安全。

### 4.3 空值默认

空 Agent ID 默认为 `"main"`：

```typescript
export const DEFAULT_AGENT_ID = "main";

function normalizeAgentId(value: string | undefined | null): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return DEFAULT_AGENT_ID;
  // ...
}
```

## 五、Account ID 策略

### 5.1 默认账户

未指定账户时使用 `"default"`：

```typescript
export const DEFAULT_ACCOUNT_ID = "default";
```

### 5.2 大小写不敏感查找

```typescript
function resolveAccountEntry<T>(
  accounts: Record<string, T> | undefined,
  accountId: string,
): T | undefined {
  // 先精确匹配
  if (Object.hasOwn(accounts, accountId)) return accounts[accountId];
  // 再大小写不敏感匹配
  const normalized = normalizeLowercaseStringOrEmpty(accountId);
  const matchKey = Object.keys(accounts).find(
    (key) => normalizeLowercaseStringOrEmpty(key) === normalized,
  );
  return matchKey ? accounts[matchKey] : undefined;
}
```

### 5.3 默认账户警告

当渠道配置了多个账户但没有显式指定默认账户时，系统生成警告：

```typescript
function formatSetExplicitDefaultInstruction(channelKey: string): string {
  return `Set channels.${channelKey}.defaultAccount or add channels.${channelKey}.accounts.default`;
}
```

## 六、已知边界情况

### 6.1 配置无绑定规则

当配置中没有路由绑定时，所有消息路由到 main Agent，matchedBy = "default"。

### 6.2 同一渠道的多条通配符绑定

```yaml
routing:
  - match: { channel: "telegram", account: "*" }
    agent: work
  - match: { channel: "telegram", account: "*" }
    agent: personal
```

多条相同模式的绑定按源顺序匹配，第一条生效。

### 6.3 Agent ID 不存在

如果绑定的 `agent` 字段指向一个不存在的 Agent：

```typescript
pickFirstExistingAgentId(cfg, "nonexistent")
  → 返回默认 Agent ID（main）
```

不会报错，静默降级到 main Agent。

### 6.4 空绑定列表

如果 `listBindings()` 返回空数组，路由直接返回默认结果（main Agent），不进入匹配循环。

### 6.5 peer ID 为空

如果 peer ID 为空或无效，构建 Session Key 时使用 `"unknown"` 作为占位符：

```typescript
const peerId = normalizeSessionPeerId({...}) || "unknown";
```

### 6.6 Cron Session Key 的特殊处理

Cron 任务的 Session Key 有特殊路由逻辑：

```typescript
if (isCronRunSessionKey(sessionKey)) {
  if (scope === "global") {
    return { ...wakeOptions, agentId: parsed.agentId };
    // 不设置 sessionKey，使用全局队列
  }
  return {
    ...wakeOptions,
    sessionKey: buildAgentMainSessionKey({ agentId: parsed.agentId, mainKey }),
  };
}
```

全局范围的 Cron 使用 `"global"` 队列，不绑定到特定 Session。
