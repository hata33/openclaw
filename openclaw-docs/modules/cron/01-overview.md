# cron — 功能定义与设计思想

## 这个模块解决什么问题？

AI 助手需要在特定时间执行任务：定时提醒、周期性检查、延迟操作。cron 模块提供完整的定时任务管理：

1. **灵活调度** — cron 表达式、固定间隔、一次性定时
2. **多种运行模式** — 系统事件注入、独立 Agent 运行
3. **结果投递** — 通知、Webhook、静默
4. **持久化** — 任务重启后不丢失

## 三种调度模式

### Cron 表达式

```typescript
{ kind: "cron", expr: "0 18 * * *", tz: "Asia/Shanghai" }
```

支持标准 5 字段和 6 字段（含秒）cron 表达式，使用 croner 库解析。

### 固定间隔

```typescript
{ kind: "every", everyMs: 3600000, anchorMs?: 1700000000000 }
```

按固定毫秒间隔执行。`anchorMs` 可选锚点时间。

### 一次性定时

```typescript
{ kind: "at", at: "2026-06-01T09:00:00+08:00" }
```

支持 ISO 8601 时间戳和 Unix 时间戳。执行后可选自动删除。

## Session Target — 运行目标

```typescript
type CronSessionTarget = "main" | "isolated" | "current" | `session:${string}`;
```

| Target | 说明 |
|--------|------|
| `main` | 注入系统事件到主会话（需要 `systemEvent` payload） |
| `isolated` | 启动独立 Agent 运行（需要 `agentTurn` payload） |
| `current` | 绑定当前会话（创建时所在会话） |
| `session:xxx` | 绑定指定持久会话 |

## Payload — 任务负载

### systemEvent

```typescript
{ kind: "systemEvent", text: "提醒：下午3点开会" }
```

注入文本作为系统事件。适用于 main session target。

### agentTurn

```typescript
{
  kind: "agentTurn",
  message: "检查邮箱是否有新邮件",
  model?: "anthropic/claude-sonnet-4-20250514",
  thinking?: "on",
  timeoutSeconds?: 300,
  toolsAllow?: ["web_fetch", "exec"],
}
```

启动独立 Agent 运行。支持模型覆盖、思考模式、工具白名单、超时控制。

## Delivery — 结果投递

```typescript
type CronDeliveryMode = "none" | "announce" | "webhook";
```

| 模式 | 说明 |
|------|------|
| `none` | 静默执行，不投递结果 |
| `announce` | 发送通知到聊天渠道（指定 channel/to） |
| `webhook` | HTTP POST 到指定 URL |

## 设计思想

### 1. Isolated Agent 架构

`isolated/` 子目录实现了完整的独立 Agent 运行环境：

```
创建独立 Session
  → 加载技能快照
    → 选择模型
      → 执行 Agent Loop
        → 投递结果
          → 清理会话
```

### 2. 整点错开（Stagger）

```typescript
DEFAULT_TOP_OF_HOUR_STAGGER_MS = 5 * 60 * 1000;  // 5 分钟
```

整点执行的 cron 任务自动错开，避免所有任务在同一秒执行造成负载尖峰。

### 3. 持久化

任务存储在 JSON 文件中：

```
<config-dir>/cron.json  或  <config-dir>/cron/
```

支持配置和状态的分离存储。

### 4. 失败警报

```typescript
type CronFailureAlert = {
  after: number;          // 失败 N 次后告警
  mode: "announce" | "webhook";
  channel?: string;
  to?: string;
  cooldownMs?: number;    // 告警冷却时间
};
```

连续失败超过阈值后发送警报。

### 5. 投递计划解析

`delivery-plan.ts` 解析投递配置为标准化的投递计划：

```typescript
type CronDeliveryPlan = {
  mode: "none" | "announce" | "webhook";
  channel?: string;
  to?: string;
  threadId?: string | number;
  accountId?: string;
  source: "delivery";
  requested: boolean;
};
```
