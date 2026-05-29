# cron — 策略、配置与边界情况

## 一、调度策略

### 1.1 Cron 表达式

使用 croner 库解析，支持标准 5 字段和扩展 6 字段（含秒）：

```
5 字段: 分 时 日 月 周
6 字段: 秒 分 时 日 月 周

示例:
  "0 18 * * *"           → 每天 18:00
  "0 9 * * 1-5"          → 工作日 9:00
  "0 0 1 1 *"            → 每月 1 号 00:00
  "0 */30 * * * *"       → 每 30 分钟（6 字段）
```

### 1.2 时区处理

```typescript
function resolveCronTimezone(tz?: string) {
  if (trimmed) return trimmed;  // 用户指定
  return Intl.DateTimeFormat().resolvedOptions().timeZone;  // 系统默认
}
```

**注意**：tz 省略时使用 Gateway 主机本地时区，不是 UTC。

### 1.3 整点错开

整点执行的 cron 任务自动添加随机延迟：

```typescript
DEFAULT_TOP_OF_HOUR_STAGGER_MS = 5 * 60 * 1000;  // 5 分钟窗口

// "0 * * * *" → 不在精确的 00:00 执行
// 而是在 00:00 ~ 00:05 之间的随机时间执行
```

用户可通过 `staggerMs: 0` 禁用错开。

### 1.4 一次性任务

`at` 模式的任务执行后可选自动删除：

```typescript
deleteAfterRun: true  // 执行后删除任务
```

## 二、运行策略

### 2.1 Session Target 约束

| Target | 要求的 Payload | 说明 |
|--------|---------------|------|
| `main` | `systemEvent` | 注入系统事件到主会话 |
| `isolated` | `agentTurn` | 启动独立 Agent |
| `current` | `agentTurn` | 绑定当前会话 |
| `session:xxx` | `agentTurn` | 绑定指定会话 |

**不匹配时行为**：`main` + `agentTurn` 降级为注入文本；`isolated` + `systemEvent` 降级为主会话注入。

### 2.2 Isolated Agent 运行时

独立 Agent 运行在隔离环境中：

```
独立 Session → 无主会话历史
  独立技能快照 → 只加载必要技能
    独立模型选择 → 可覆盖模型
      超时控制 → 默认 0（无限制），可配置
        结果投递 → 执行完成后投递
          会话清理 → 完成后可选清理
```

### 2.3 唤醒模式

```typescript
type CronWakeMode = "next-heartbeat" | "now";
```

- `next-heartbeat` — 下次心跳时处理（延迟，节能）
- `now` — 立即处理（实时，耗资源）

### 2.4 模型预检

`model-preflight.runtime.ts` 在运行前检查模型是否可用：

```
模型在 catalog 中？ → 继续
模型不存在？ → 使用 fallback
无 fallback？ → 使用默认模型
```

## 三、投递策略

### 3.1 投递模式

| 模式 | 行为 |
|------|------|
| `none` | 不投递（后台任务） |
| `announce` | 发送通知到聊天渠道 |
| `webhook` | HTTP POST 到 URL |

### 3.2 投递目标解析

```
delivery.channel + delivery.to → 渠道 + 目标
delivery.threadId → 线程/话题 ID
delivery.accountId → 账户 ID（多账户时区分）
```

### 3.3 Best Effort

```typescript
bestEffort?: boolean
```

投递失败时是否静默忽略。`true` 时投递失败不记录错误。

### 3.4 失败投递

```typescript
delivery.failureDestination: {
  mode: "announce" | "webhook",
  channel?: string,
  to?: string,
}
```

投递失败时的备选目的地。

## 四、失败警报策略

### 4.1 触发条件

```typescript
failureAlert: {
  after: 3,              // 连续失败 3 次后告警
  cooldownMs: 3600000,   // 1 小时内不重复告警
  includeSkipped: false, // 跳过不计入失败
}
```

### 4.2 计数重置

成功执行一次后，失败计数器重置为 0。

## 五、持久化策略

### 5.1 原子写入

```typescript
replaceFileAtomic() → 临时文件 + rename
```

防止并发写入导致数据损坏。

### 5.2 配置/状态分离

```
config: { jobs: [...任务配置...] }
state: { runs: { [jobId]: [...运行历史...] } }
```

配置和状态可以存储在同一文件或分离存储。

### 5.3 迁移支持

`store.ts` 检测旧格式并自动迁移。

## 六、并发策略

### 6.1 活跃任务追踪

```typescript
// 全局单例，跨模块共享
const CRON_ACTIVE_JOB_STATE_KEY = Symbol.for("openclaw.cron.activeJobs");
```

同一任务不会并发执行（通过锁机制）。

### 6.2 分布式锁

`service/locked.ts` 确保任务不会在多个 Gateway 实例上同时执行。

## 七、已知边界情况

### 7.1 时区无指定

tz 省略时使用 Gateway 主机时区，不是 UTC。部署在不同时区的服务器可能表现不同。

### 7.2 长时间运行

Agent 运行可能超时。`timeoutSeconds` 控制最大运行时间，0 表示无限制。

### 7.3 任务 ID 冲突

任务 ID 由系统自动生成（UUID），冲突概率极低。用户不能指定自定义 ID。

### 7.4 大量任务

Cron 表达式使用 LRU 缓存（最大 512 条）避免重复解析。大量不同 cron 表达式可能超出缓存。

### 7.5 存储文件损坏

JSON 解析失败时使用 JSON5 fallback 解析。如果仍失败，任务列表为空。

### 7.6 Session Target 安全

`assertSafeCronSessionTargetId()` 拒绝空字符串和包含 `\0` 的 ID。
