# sessions — 实现流程与数据流

## 会话生命周期

### 1. 会话创建

```
入站消息到达
  → routing 解析出 sessionKey
  → session-id-resolution.ts 查找已有 SessionEntry
  → 未找到 → 创建新 SessionEntry
  → 触发 SessionLifecycleEvent（created）
  → 持久化到 config/sessions
```

### 2. Session ID 解析流程

`session-id-resolution.ts` 负责将 Session Key 映射到 SessionEntry：

```
输入: sessionKey 或 sessionId
  ↓
1. 检查是否为 UUID（sessionId）
   → 是：直接按 ID 查找 SessionEntry
   → 否：按 sessionKey 查找
2. 按 sessionKey 查找：
   a. 规范化 sessionKey
   b. 遍历所有 SessionEntry
   c. 匹配 normalizedSessionKey
3. 返回匹配结果（SessionIdMatchSelection）
```

### 3. 会话类型推导

`session-chat-type.ts` 推导会话的聊天类型：

```
输入: sessionKey
  ↓
1. parseAgentSessionKey(sessionKey)
   → 提取 rest 部分
2. deriveSessionChatTypeFromKey(rest)
   → 正则匹配已知模式：
     - "group:xxx" → group
     - "whatsapp:xxx@g.us" → group
     - "discord:guild-xxx:channel-xxx" → channel
     - 其他 → unknown
3. 如果 key 无法推导 → 查询渠道插件
4. 返回 SessionKeyChatType
```

### 4. 会话生命周期事件

```typescript
type SessionLifecycleEvent = {
  sessionKey: string;
  reason: string;              // "created" | "activated" | "terminated" 等
  parentSessionKey?: string;   // 父会话（子 Agent 时有值）
  label?: string;
  displayName?: string;
};
```

事件系统使用 Set 存储监听器：

```
注册监听器: onSessionLifecycleEvent(listener)
  → 添加到 SESSION_LIFECYCLE_LISTENERS Set
  → 返回取消函数

触发事件: emitSessionLifecycleEvent(event)
  → 遍历所有监听器，调用 listener(event)
```

### 5. 用户消息转录

`user-turn-transcript.ts` 将用户消息写入会话转录文件：

```
用户消息到达
  ↓
1. 构建 InputProvenance（标记来源）
2. applyInputProvenanceToUserMessage() — 将来源信息附加到消息
3. appendSessionTranscriptMessage() — 追加到转录文件
4. emitSessionTranscriptUpdate() — 通知转录事件监听器
```

### 6. 发送策略评估

`send-policy.ts` 决定是否允许向某会话发送消息：

```
输入: config, sessionEntry, sessionKey
  ↓
1. 检查 sessionEntry.sendPolicy
   → "allow" → 允许
   → "deny" → 拒绝
2. 未设置 → 检查会话类型
   → direct → 默认允许
   → group → 默认允许
3. 返回 SessionSendPolicyDecision
```

### 7. 级别覆盖

`level-overrides.ts` 管理 verbose/trace/thinking 级别的会话级覆盖：

```
用户执行 /verbose on
  ↓
1. parseVerboseOverride("on")
   → 验证值是否合法（on/off/full）
2. 写入 SessionEntry.verboseLevel
3. 持久化

Agent Loop 读取级别时：
  → 优先使用 SessionEntry 中的覆盖值
  → 未设置则使用全局默认
```

### 8. 模型覆盖

`model-overrides.ts` 管理会话级模型切换：

```
用户执行 /model anthropic/claude-opus-4-7
  ↓
1. 解析模型引用（provider/model）
2. 写入 SessionEntry.modelOverride
3. 清除旧覆盖的 fallback origin
4. 持久化

Agent Loop 选择模型时：
  → 优先使用 SessionEntry 中的模型覆盖
  → 未设置则使用 Agent 配置的模型
```

## 转录事件系统

`transcript-events.ts` 提供会话文件更新通知：

```typescript
type SessionTranscriptUpdate = {
  sessionFile: string;     // 会话文件路径
  sessionKey?: string;     // 会话 Key
  message?: unknown;       // 消息内容
  messageId?: string;      // 消息 ID
  messageSeq?: number;     // 消息序号
};
```

```
注册监听器: onSessionTranscriptUpdate(listener)
触发事件: emitSessionTranscriptUpdate(update)
```

用途：实时监听会话消息变化（如跨会话通信、实时 UI 更新）。

## 线程后缀解析

`session-key-utils.ts` 提供线程后缀解析：

```typescript
type ParsedThreadSessionSuffix = {
  baseSessionKey: string | undefined;
  threadId: string | undefined;
};

// "agent:main:discord:guild-123:channel-456:thread-789"
// → { baseSessionKey: "agent:main:discord:guild-123:channel-456", threadId: "thread-789" }
```

## Sub-agent 深度检测

`getSubagentDepth()` 检测当前会话的子 Agent 嵌套深度：

```typescript
// agent:main:***  → 0（主 Agent）
// agent:main:sub:xxx  → 1（一层子 Agent）
// agent:main:sub:xxx:sub:yyy  → 2（两层嵌套）
```

用于限制子 Agent 的嵌套深度，防止无限递归。
