# routing — 功能定义与设计思想

## 这个模块解决什么问题？

OpenClaw 是一个多渠道、多 Agent 的系统。当一条消息从 Telegram 或 Discord 进入时，系统需要回答：

1. **这条消息应该交给哪个 Agent 处理？** — 可能是 main Agent、work Agent 或其他自定义 Agent
2. **这条消息属于哪个会话？** — Session Key 决定了上下文边界

路由系统就是回答这两个问题的模块。

### 核心问题映射

```
入站消息: { channel: "telegram", accountId: "bot1", peer: { kind: "direct", id: "+86138xxxx" } }
                         ↓
              路由系统（routing）
                         ↓
结果: { agentId: "main", sessionKey: "agent:main:***" }
```

## Session Key 格式

Session Key 是 OpenClaw 中会话的唯一标识符，格式为：

```
agent:<agentId>:<rest>
```

### 常见 Session Key 格式

| Session Key | 含义 |
|-------------|------|
| `agent:main:***` | main Agent 的主会话（所有 DM 默认汇聚到此处） |
| `agent:main:telegram:direct:+86138xxxx` | Telegram 指定用户的 DM 会话 |
| `agent:main:telegram:group:123456` | Telegram 群组会话 |
| `agent:work:discord:guild:789012` | work Agent 的 Discord Guild 会话 |
| `agent:main:telegram:bot1:direct:+86138xxxx` | 指定账户+指定用户的 DM 会话 |

### DM Scope 策略

DM（私聊）消息的 Session Key 取决于 `dmScope` 配置：

| dmScope | Session Key 格式 | 说明 |
|---------|-----------------|------|
| `main`（默认） | `agent:<id>:***` | 所有 DM 汇聚到主会话 |
| `per-peer` | `agent:<id>:direct:<peerId>` | 每个对话对象独立会话 |
| `per-channel-peer` | `agent:<id>:<channel>:direct:<peerId>` | 每个渠道+对话对象独立 |
| `per-account-channel-peer` | `agent:<id>:<channel>:<accountId>:direct:<peerId>` | 最细粒度，完全隔离 |

## Agent ID 规范化

Agent ID 需要满足安全约束（路径安全、shell 友好）：

```typescript
// 有效格式: /^[a-z0-9][a-z0-9_-]{0,63}$/i
"main"     → "main"
"WorkBot"  → "workbot"
"my-agent" → "my-agent"
"a b c"    → "a-b-c"   // 无效字符被替换为 "-"
"--test"   → "test"     // 前导/尾随横线被移除
```

## 路由绑定（Route Binding）

绑定是配置中声明的路由规则，将特定的渠道/账户/对等方映射到特定 Agent：

```yaml
agents:
  list:
    - id: work
    - id: personal
  routing:
    - match:
        channel: "telegram"
        peer: "group:work-team"
      agent: work
    - match:
        channel: "discord"
        guild: "123456"
      agent: personal
```

### 绑定匹配的 8 层优先级

路由系统按以下优先级依次匹配（越精确越优先）：

```
1. binding.peer        — 精确匹配对等方（如 group:123456）
2. binding.peer.parent — 线程父对等方继承
3. binding.peer.wildcard — 通配符匹配对等方类型（如 group:*）
4. binding.guild+roles — 匹配 Guild + 角色
5. binding.guild       — 匹配 Guild（不限角色）
6. binding.team        — 匹配 Team
7. binding.account     — 匹配账户
8. binding.channel     — 匹配渠道（最宽泛）
```

如果没有绑定匹配，使用默认 Agent（main）。

## peer-kind 匹配规则

`peerKindMatches()` 定义了 group 和 channel 可以互换匹配：

```typescript
function peerKindMatches(bindingKind: ChatType, scopeKind: ChatType): boolean {
  if (bindingKind === scopeKind) return true;
  // group 和 channel 可互换
  return (bindingKind === "group" && scopeKind === "channel") ||
         (bindingKind === "channel" && scopeKind === "group");
}
```

**为什么？** 不同平台对"群组"的叫法不同：Discord 叫 channel，Telegram 叫 group，但路由时应该统一处理。

## 账户系统

### Account ID
- 默认值：`"default"`
- 格式：`/^[a-z0-9][a-z0-9_-]{0,63}$/i`（与 Agent ID 相同）
- 查找时大小写不敏感

### 多账户路由

一个渠道可以有多个账户，绑定可以指定账户：

```yaml
channels:
  telegram:
    accounts:
      bot1: { token: "xxx" }
      bot2: { token: "yyy" }

agents:
  routing:
    - match:
        channel: "telegram"
        account: "bot1"
      agent: work
    - match:
        channel: "telegram"
        account: "bot2"
      agent: personal
```

## 模块在系统中的位置

```
channels (渠道层)
    ↓ 入站消息（channel + accountId + peer + guildId + teamId）
    
routing (路由层) ← 本模块
    ↓ 解析结果（agentId + sessionKey + matchedBy）
    
sessions (会话层)
    ↓ 创建/查找 Session
    
agents (Agent 层)
    ↓ 处理消息
```

路由层是渠道层和会话层之间的桥梁。
