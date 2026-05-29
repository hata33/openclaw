# sessions — 策略、配置与边界情况

## 一、会话分类策略

### 1.1 Session Kind 分类优先级

`classifySessionKind()` 按以下优先级判断会话类型：

```
1. Sentinel Keys
   - sessionKey === "global"    → "global"
   - sessionKey === "unknown"   → "unknown"

2. Cron Key Shape
   - isCronRunSessionKey(key)   → "cron"

3. Spawn-Child（必须在 key-shape 之前检查）
   - sessionEntry?.spawnedBy 存在 → "spawn-child"
   - 为什么优先？ACP spawn-child 的 key 可能是不透明的，如果按 key-shape 判断会误判为 "direct"

4. Group/Channel
   - chatType === "group" 或 "channel"  → "group"
   - key 中包含 "group:" 或 "channel:" 子串 → "group"

5. Fallback
   - 以上都不匹配 → "direct"
```

### 1.2 Chat Type 推导链

```
sessionKey
  → parseAgentSessionKey() → 提取 rest
    → deriveSessionChatTypeFromKey(rest) → 正则模式匹配
      → 如果无法从 key 推导 → 查询渠道插件（bootstrapChannelPlugin）
        → 最终 fallback → "unknown"
```

旧格式识别规则（`session-chat-type-shared.ts`）：

| 模式 | 类型 | 示例 |
|------|------|------|
| `group:xxx` | group | `group:123456` |
| `xxx@g.us` | group（WhatsApp） | `123456@g.us` |
| `discord:guild-xxx:channel-xxx` | channel | Discord 频道 |
| `telegram:group:xxx` | group | Telegram 群组 |
| `slack:channel:xxx` | channel | Slack 频道 |

## 二、模型覆盖策略

### 2.1 覆盖优先级

```
SessionEntry.modelOverride（会话级覆盖）
  > Agent 配置的默认模型
    > 全局默认模型
```

用户通过 `/model` 命令切换模型时，覆盖写入 SessionEntry。

### 2.2 Fallback Origin 追踪

当模型选择发生 fallback 时（如指定模型不可用），系统记录 fallback origin：

```typescript
ModelOverrideSelection = {
  provider: string;
  model: string;
  isDefault?: boolean;  // 是否为 fallback 默认值
};
```

`clearFallbackOrigin()` 在用户主动选择模型时调用，清除旧的 fallback 标记。

### 2.3 模型覆盖的持久化

模型覆盖写入 `SessionEntry`，存储在 config/sessions 目录中。会话恢复时自动读取。

## 三、级别覆盖策略

### 3.1 支持的级别类型

| 级别 | 用途 | 合法值 |
|------|------|--------|
| `verboseLevel` | 详细日志 | `"on"`, `"off"`, `"full"` |
| `traceLevel` | 调用追踪 | `"on"`, `"off"` 等 |
| `thinkingLevel` | 思考过程 | `"on"`, `"off"`, `"stream"` |

### 3.2 验证规则

```typescript
const INVALID_VERBOSE_LEVEL_ERROR = 'invalid verboseLevel (use "on"|"off"|"full")';
```

非法值会返回 `{ ok: false, error: string }`，而不是静默忽略。

### 3.3 null vs undefined 语义

- `null` — 用户明确清除覆盖（恢复全局默认）
- `undefined` — 未设置覆盖（使用全局默认）

## 四、发送策略

### 4.1 策略决策链

```
1. 检查 sessionEntry.sendPolicy
   → "allow" → 直接允许
   → "deny" → 直接拒绝

2. 未设置 sendPolicy → 检查会话聊天类型
   → direct → 默认允许
   → group → 默认允许
   → unknown → 默认允许

3. 最终 fallback → 允许
```

### 4.2 deny 的使用场景

- 被静音的群组（不应主动发送消息）
- 被用户手动禁用的会话
- 系统维护期间的临时策略

## 五、输入来源追踪策略

### 5.1 Input Provenance 分类

| 类型 | 场景 | 典型来源 |
|------|------|----------|
| `external_user` | 外部用户消息 | Telegram/Discord/微信消息 |
| `inter_session` | 跨会话通信 | sessions_send、子 Agent 消息 |
| `internal_system` | 系统内部触发 | Cron 任务、Heartbeat |

### 5.2 追踪信息

```typescript
type InputProvenance = {
  kind: InputProvenanceKind;
  originSessionId?: string;     // 来源会话 ID
  sourceSessionKey?: string;    // 来源会话 Key
};
```

`applyInputProvenanceToUserMessage()` 将来源信息写入消息的 metadata，确保后续处理可以追踪消息的完整路径。

## 六、Session Label 策略

### 6.1 验证规则

```typescript
const SESSION_LABEL_MAX_LENGTH = 512;
```

- 最大长度：512 字符
- 不能为空（trim 后）
- 必须是字符串类型

### 6.2 返回值

```typescript
type ParsedSessionLabel = 
  | { ok: true; label: string }
  | { ok: false; error: string };
```

使用 Result 模式而非异常，方便批量验证。

## 七、事件系统策略

### 7.1 生命周期事件

使用 `Set<Listener>` 存储，不支持优先级：

```typescript
const SESSION_LIFECYCLE_LISTENERS = new Set<SessionLifecycleListener>();
```

- 注册返回取消函数（`() => void`）
- 监听器不会被 GC 回收（需要手动取消）
- 事件同步触发（无异步队列）

### 7.2 转录事件

```typescript
const SESSION_TRANSCRIPT_LISTENERS = new Set<SessionTranscriptListener>();
```

同样的 Set 模式。用于实时通知会话文件的写入更新。

## 八、已知边界情况

### 8.1 Sub-agent 深度限制

`getSubagentDepth()` 检测嵌套深度：

```
agent:main:***          → 0
agent:main:sub:xxx      → 1
agent:main:sub:xxx:sub:yyy → 2
```

系统需要检查此深度以防止无限递归的子 Agent 创建。

### 8.2 ACP Session Key

ACP（Agent Communication Protocol）会话 Key 有特殊格式，`isAcpSessionKey()` 识别它们。这些 Key 的 rest 部分可能是不透明的（不遵循标准格式），所以在分类时需要特殊处理。

### 8.3 空会话

当 `resolveSessionIdMatch()` 找不到匹配时返回 `null`，调用方需要处理此情况（通常创建新会话）。

### 8.4 旧格式兼容

Session Key 有多种历史格式：

```
新格式: agent:<agentId>:<rest>
旧格式: group:<groupId>
旧格式: <whatsapp-id>@g.us
旧格式: discord:guild-<id>:channel-<id>
```

`session-chat-type-shared.ts` 负责识别所有这些格式，确保向后兼容。
