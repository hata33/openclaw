# sessions — 会话管理

> 负责会话标识、分类、生命周期事件、消息发送策略、输入来源验证。
> 是 routing 层和 config 层之间的桥梁，管理会话的持久化状态。

## 文件结构

| 文件 | 职责 |
|------|------|
| `session-id.ts` | Session ID 格式定义（UUID）与验证 |
| `session-id-resolution.ts` | Session ID 到 SessionEntry 的解析匹配 |
| `session-key-utils.ts` | Session Key 解析工具（parseAgentSessionKey, 线程后缀解析, subagent 深度） |
| `session-label.ts` | Session 标签解析与验证（最大 512 字符） |
| `session-chat-type.ts` | 会话聊天类型推导（direct/group/channel） |
| `session-chat-type-shared.ts` | 聊天类型共享逻辑（从 Session Key 推导类型） |
| `session-lifecycle-events.ts` | 会话生命周期事件系统（created/activated/terminated） |
| `classify-session-kind.ts` | 会话类型分类（cron/direct/group/global/spawn-child/unknown） |
| `input-provenance.ts` | 输入来源追踪（external_user/inter_session/internal_system） |
| `level-overrides.ts` | 会话级别覆盖（verbose/trace/thinking level） |
| `model-overrides.ts` | 模型覆盖（provider/model 切换、fallback origin） |
| `send-policy.ts` | 消息发送策略（allow/deny 决策） |
| `transcript-events.ts` | 转录事件系统（会话文件更新通知） |
| `user-turn-transcript.ts` | 用户轮转录记录（将用户消息写入会话文件） |

## 核心概念

- **Session ID** — UUID 格式的唯一标识
- **Session Key** — 结构化标识（`agent:<id>:<rest>`），用于路由
- **Session Kind** — 会话类型分类
- **Session Entry** — 会话的持久化状态（存储在 config/sessions 中）
- **Input Provenance** — 消息来源追踪

## 与其他模块的关系

```
routing (路由解析)
    ↓ 返回 sessionKey
sessions (会话管理) ← 本模块
    ↓ 查找/创建 SessionEntry
config/sessions (持久化)
    ↓ 加载/保存会话状态
agents (Agent 运行时)
```
