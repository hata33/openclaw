# tasks — 任务系统

> 持久化任务管理：注册、执行、状态跟踪、完成投递。
> 支持独立任务（Task）和流程编排（TaskFlow）两种模式。

## 文件结构（39 个文件）

### 核心执行

| 文件 | 职责 |
|------|------|
| `task-executor.ts` | 任务执行器 |
| `task-executor-policy.ts` | 执行策略 |
| `task-status.ts` | 任务状态管理 |
| `task-completion-contract.ts` | 完成契约 |
| `detached-task-runtime.ts` | 独立任务运行时 |
| `detached-task-runtime-state.ts` | 运行时状态 |
| `detached-task-runtime-contract.ts` | 运行时契约 |
| `runtime-internal.ts` | 内部运行时 |

### 任务注册表

| 文件 | 职责 |
|------|------|
| `task-registry.ts` | 任务注册表主入口 |
| `task-registry.types.ts` | 注册表类型 |
| `task-registry.store.ts` | 存储接口 |
| `task-registry.store.sqlite.ts` | SQLite 存储 |
| `task-registry.store.types.ts` | 存储类型 |
| `task-registry.paths.ts` | 文件路径 |
| `task-registry.maintenance.ts` | 维护（清理、GC） |
| `task-registry.reconcile.ts` | 状态协调 |
| `task-registry.summary.ts` | 摘要 |
| `task-registry.process-state.ts` | 进程状态 |
| `task-registry.audit.ts` | 审计 |
| `task-registry.audit.shared.ts` | 共享审计 |
| `task-registry-control.runtime.ts` | 控制运行时 |
| `task-registry-control.types.ts` | 控制类型 |
| `task-registry-delivery-runtime.ts` | 投递运行时 |
| `task-retention.ts` | 保留策略 |

### TaskFlow（流程编排）

| 文件 | 职责 |
|------|------|
| `task-flow-registry.ts` | TaskFlow 注册表 |
| `task-flow-registry.types.ts` | TaskFlow 类型 |
| `task-flow-registry.store.ts` | TaskFlow 存储 |
| `task-flow-registry.store.sqlite.ts` | SQLite 存储 |
| `task-flow-registry.store.types.ts` | 存储类型 |
| `task-flow-registry.paths.ts` | 路径 |
| `task-flow-registry.maintenance.ts` | 维护 |
| `task-flow-registry.audit.ts` | 审计 |
| `task-flow-runtime-internal.ts` | 内部运行时 |

### 访问层

| 文件 | 职责 |
|------|------|
| `task-owner-access.ts` | 任务所有者访问 |
| `task-status-access.ts` | 状态访问 |
| `task-flow-owner-access.ts` | TaskFlow 所有者访问 |
| `task-domain-views.ts` | 领域视图 |

### 子 Agent

| 文件 | 职责 |
|------|------|
| `codex-native-subagent-task.ts` | Codex 子 Agent 任务 |
| `agent-harness-task-runtime-scope.ts` | Agent Harness 运行时作用域 |

## 核心概念

### Task（任务）

独立的后台工作单元：

```
创建 → 排队 → 执行 → 完成/失败
                    ↓
              投递结果到渠道
```

### TaskFlow（流程）

多步骤的流程编排：

```
创建流程 → 添加步骤 → 等待条件 → 子任务 → 完成
```

### 状态机

```
pending → running → completed
                 → failed
                 → cancelled
```
