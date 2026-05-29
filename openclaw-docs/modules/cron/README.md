# cron — 定时任务系统

> 负责 Cron 定时任务的完整生命周期管理：调度、执行、投递、持久化。
> 支持 cron 表达式、固定间隔、一次性定时三种调度模式。

## 文件结构（78 个文件，13911 行）

### 核心类型与解析
| 文件 | 职责 |
|------|------|
| `types.ts` | 核心类型（Schedule、Payload、Delivery、Job） |
| `types-shared.ts` | 共享类型（CronJobBase 泛型模板） |
| `parse.ts` | 时间解析（ISO 8601、Unix 时间戳） |
| `normalize.ts` | 任务输入规范化与验证 |
| `schedule.ts` | 调度引擎（croner 库封装、LRU 缓存） |
| `persisted-shape.ts` | 持久化格式定义 |
| `validate-timestamp.ts` | 时间戳验证 |

### 服务层
| 文件 | 职责 |
|------|------|
| `service.ts` | 服务入口 |
| `service-contract.ts` | 服务接口定义（CronServiceContract） |
| `service/state.ts` | 服务状态管理 |
| `service/jobs.ts` | 任务 CRUD 操作 |
| `service/ops.ts` | 运维操作（run、wake、remove） |
| `service/store.ts` | 持久化存储 |
| `service/timer.ts` | 定时器管理 |
| `service/locked.ts` | 分布式锁 |
| `service/timeout-policy.ts` | 超时策略 |
| `service/task-ledger.ts` | 任务账本（执行历史） |
| `service/initial-delivery.ts` | 初始投递 |
| `service/normalize.ts` | 服务层规范化 |
| `service/list-page-types.ts` | 分页查询类型 |

### 投递系统
| 文件 | 职责 |
|------|------|
| `delivery.ts` | 投递执行（发送消息到渠道） |
| `delivery-plan.ts` | 投递计划解析 |
| `delivery-preview.ts` | 投递预览 |
| `delivery-context.ts` | 投递上下文 |
| `delivery-field-schemas.ts` | 投递字段 schema |

### Isolated Agent 运行时（子目录）
| 文件 | 职责 |
|------|------|
| `isolated-agent/run.ts` | Isolated Agent 运行入口 |
| `isolated-agent/run-execution.runtime.ts` | 执行运行时 |
| `isolated-agent/run-executor.ts` | 执行器 |
| `isolated-agent/run-delivery.runtime.ts` | 运行时投递 |
| `isolated-agent/delivery-target.ts` | 投递目标解析 |
| `isolated-agent/delivery-dispatch.ts` | 投递调度 |
| `isolated-agent/model-selection.ts` | 模型选择 |
| `isolated-agent/session.ts` | 会话管理 |
| `isolated-agent/session-key.ts` | 会话 Key |
| `isolated-agent/skills-snapshot.ts` | 技能快照 |

### 辅助
| 文件 | 职责 |
|------|------|
| `active-jobs.ts` | 活跃任务追踪（全局单例） |
| `store.ts` | 文件存储管理 |
| `session-target.ts` | Session Target 解析 |
| `session-reaper.ts` | 过期会话清理 |
| `stagger.ts` | 整点错开策略 |
| `run-id.ts` | 运行 ID 生成 |
| `run-log.ts` | 运行日志 |
| `retry-hint.ts` | 重试提示 |
| `heartbeat-policy.ts` | 心跳策略 |
| `webhook-url.ts` | Webhook URL 生成 |
| `normalize-job-identity.ts` | 任务标识规范化 |
| `run-diagnostics.ts` | 运行诊断 |
| `schedule-identity.ts` | 调度标识 |

## 核心概念

- **Schedule** — 三种调度：cron 表达式、固定间隔、一次性定时
- **Session Target** — 任务在哪个 Session 中运行（main/isolated/current/session:xxx）
- **Payload** — 任务负载（systemEvent 注入系统事件、agentTurn 运行 Agent）
- **Delivery** — 结果投递（none/announce 发送通知/webhook HTTP 回调）
- **Isolated Agent** — 独立 Agent 运行（隔离的会话和上下文）
