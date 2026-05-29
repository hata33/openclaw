# routing — 路由系统

> 负责将入站消息从渠道路由到正确的 Session 和 Agent。
> 是消息从"进入 Gateway"到"被 Agent 处理"之间的关键桥梁。

## 文件结构

| 文件 | 职责 |
|------|------|
| `session-key.ts` | Session Key 构建与解析，Agent ID 规范化，DM Scope 策略 |
| `resolve-route.ts` | 路由解析核心：8 层优先级绑定匹配 → Agent 选择 → Session Key 生成 |
| `bindings.ts` | 绑定关系管理：从配置读取路由绑定列表 |
| `binding-scope.ts` | 绑定作用域约束：guild/team/roles/peer 匹配逻辑 |
| `account-id.ts` | 账户 ID 规范化（默认值 "default"，格式校验，缓存） |
| `account-lookup.ts` | 账户查找：大小写不敏感的 Record 查找 |
| `bound-account-read.ts` | 绑定账户读取：从配置中读取已绑定的账户列表 |
| `channel-route-targets.ts` | 渠道路由目标：列出每个渠道的路由目标 Agent |
| `peer-kind-match.ts` | 对等方类型匹配（group 和 channel 可互换匹配） |
| `default-account-warnings.ts` | 默认账户警告：生成配置建议信息 |

## 核心概念

### Session Key — 会话的唯一标识
```
agent:<agentId>:<rest>
```
- `agent:main:main` — main agent 的主会话
- `agent:main:telegram:group:12345` — Telegram 群组会话
- `agent:work:discord:guild:67890` — Discord guild 会话

### 路由绑定（Route Binding）
配置文件中声明的消息路由规则，将特定渠道/账户/对等方映射到特定 Agent。

### 8 层匹配优先级
```
peer (最精确) → parent peer → peer wildcard → guild+roles → guild → team → account → channel (最宽泛)
```

## 与其他模块的关系

```
channels (消息入站)
    ↓ 提取 channel/accountId/peer
routing (路由解析)
    ↓ 返回 agentId + sessionKey
sessions (会话管理)
    ↓ 创建或查找 Session
agents (Agent 运行时)
    ↓ 处理消息
```
