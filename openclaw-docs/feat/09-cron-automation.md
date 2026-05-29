# 09 — 定时任务与自动化

> OpenClaw 支持定时任务（Cron）、心跳检查（Heartbeat）、Webhook 等自动化机制，
> 让 Agent 不只是被动回答，还能主动执行任务。

## 自动化能力总览

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Cron Jobs   │  │  Heartbeat   │  │  Webhooks    │
│  定时任务    │  │  心跳检查    │  │  HTTP 回调   │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       └────────┬────────┘                  │
                │                           │
         Agent Session ──→ 执行任务 ──→ 投递结果
```

## Cron Jobs（定时任务）

### Cron 定义

Cron 任务在配置文件中定义：

```yaml
cron:
  jobs:
    - name: "morning-briefing"
      schedule: "0 9 * * *"          # 每天早上 9 点
      task: "给我一个早间简报：天气、日历、未读邮件"
      delivery:
        mode: "announce"
        channel: "telegram"
        to: "user123"
      agent: "main"
    - name: "weekly-report"
      schedule: "0 18 * * 5"        # 每周五下午 6 点
      task: "总结本周的工作进展"
      agent: "main"
```

### Cron 执行流程

```
调度器检查 cron schedule
  → 到达触发时间
  → 创建独立的 Session（隔离上下文）
  → 将 task 作为用户消息发送给 Agent
  → Agent 处理任务
  → 根据 delivery 配置投递结果
    → announce: 发送到指定渠道
    → webhook: POST 到指定 URL
    → none: 不投递
```

### 关键设计

1. **隔离 Session** — Cron 任务在独立 Session 中执行，不影响主会话
2. **可指定 Agent** — 不同任务可以路由到不同 Agent
3. **灵活投递** — 结果可以发送到渠道、Webhook 或不投递
4. **Auth Profile 传播** — Cron Session 可以继承主 Agent 的认证配置

### Cron 与 Heartbeat 的区别

| 维度 | Cron | Heartbeat |
|------|------|-----------|
| 触发方式 | 精确时间调度 | 周期性轮询（可漂移） |
| 上下文 | 独立 Session | 主 Session 上下文 |
| 适用场景 | 定时提醒、定期报告 | 检查邮件/日历/通知 |
| 精度要求 | 高（9:00 AM 准时） | 低（约每 30 分钟一次） |
| API 调用 | 每次独立调用 | 可批量合并多个检查 |

### Heartbeat 机制

Heartbeat 是 OpenClaw 的主动检查机制：

```
HEARTBEAT.md 定义检查清单
  → Gateway 周期性发送心跳消息
  → Agent 收到心跳
  → 检查各项（邮件、日历、通知等）
  → 有重要事项 → 主动通知用户
  → 无事发生 → 回复 HEARTBEAT_OK
```

#### HEARTBEAT.md 配置

```markdown
# Keep this file empty to skip heartbeat API calls.
# Add tasks below when you want the agent to check something periodically.
```

用户可以在 HEARTBEAT.md 中添加检查项，Agent 会在心跳时执行。

### Heartbeat 状态追踪

Agent 使用 `memory/heartbeat-state.json` 追踪检查状态：

```json
{
  "lastChecks": {
    "email": 1703275200,
    "calendar": 1703260800,
    "weather": null
  }
}
```

避免短时间内重复检查。

## Webhook

OpenClaw 支持 Webhook 作为自动化触发源：

```
外部系统 POST /webhook
  → Gateway 接收请求
  → 路由到对应的 Webhook Handler
  → 创建 Session 处理请求
  → 返回结果或投递到渠道
```

### Webhook 场景

- **CI/CD 通知** — GitHub Actions 完成后通知 Agent
- **监控告警** — 服务器异常时通知 Agent
- **第三方集成** — 任何能发 HTTP POST 的系统

## Gmail Pub/Sub

OpenClaw 支持 Gmail Pub/Sub 作为事件源：

```
Gmail 新邮件 → Google Pub/Sub → OpenClaw Webhook
  → Agent 收到邮件通知
  → 按照 HEARTBEAT.md 的指令处理
```

这是 Heartbeat 的升级版——不是轮询，而是事件驱动。

## 子任务编排（TaskFlow）

TaskFlow 技能（`skills/taskflow/`）提供多步骤任务编排：

```
创建 TaskFlow 任务
  → 定义子任务和依赖关系
  → 分配给子 Agent 并行执行
  → 等待所有子任务完成
  → 汇总结果
```

### TaskFlow 模式

```typescript
// 任务编排示例
interface TaskFlow {
  owner: string;           // 任务所有者
  context: TaskContext;     // 任务上下文
  state: TaskState;        // 任务状态
  waits: TaskWait[];       // 等待条件
  children: Task[];        // 子任务列表
}
```

## 关键代码入口

| 文件/目录 | 职责 |
|-----------|------|
| `src/cron/` | Cron 调度器核心 |
| `src/cron/delivery.ts` | 任务结果投递 |
| `src/cron/delivery-plan.ts` | 投递计划 |
| `src/cron/heartbeat-policy.ts` | 心跳策略 |
| `src/cron/isolated-agent/` | 隔离 Agent 执行 |
| `extensions/webhooks/` | Webhook 扩展 |
| `skills/taskflow/SKILL.md` | TaskFlow 编排技能 |
| `skills/taskflow-inbox-triage/SKILL.md` | 收件箱分类技能 |

## 总结

1. **Cron** — 精确定时任务，独立 Session 执行
2. **Heartbeat** — 周期性主动检查，使用主 Session 上下文
3. **Webhook** — 外部事件驱动
4. **Gmail Pub/Sub** — 邮件事件驱动（Heartbeat 的升级）
5. **TaskFlow** — 多步骤任务编排和并行执行
