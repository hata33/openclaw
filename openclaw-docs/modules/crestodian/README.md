# crestodian — 守护者系统

> Agent 行为的监控、审计和干预系统。
> 检测异常行为，执行安全策略，提供救援机制。

## 文件结构

| 文件 | 职责 |
|------|------|
| `crestodian.ts` | 主入口 |
| `assistant.ts` | 助手后端集成 |
| `assistant-backends.ts` | 助手后端列表 |
| `assistant-prompts.ts` | 助手提示词 |
| `audit.ts` | 审计 |
| `dialogue.ts` | 对话管理 |
| `operations.ts` | 操作 |
| `overview.ts` | 概览 |
| `probes.ts` | 探针（行为检测） |
| `rescue-message.ts` | 救援消息 |
| `rescue-policy.ts` | 救援策略 |
| `tui-backend.ts` | TUI 后端 |

## 核心概念

### 探针（Probes）

检测 Agent 行为模式：

- 异常频率的工具调用
- 敏感操作尝试
- 行为偏离基线

### 救援（Rescue）

当检测到异常时触发救援：

```
异常检测 → 救援策略 → 发送救援消息 → 用户干预
```

### 审计（Audit）

记录 Agent 的所有重要操作，用于事后审查。
