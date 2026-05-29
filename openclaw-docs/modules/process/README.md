# process — 进程管理

> 子进程的创建、监控、排队和终止。
> 提供 exec 包装、进程树杀死、命令队列、进程监控器（Supervisor）和 OOM 保护。

## 文件结构

| 文件 | 职责 |
|------|------|
| `exec.ts` | 命令执行包装（execFile/spawn + 超时 + 编码） |
| `kill-tree.ts` | 进程树终止（SIGTERM → SIGKILL） |
| `spawn-utils.ts` | Spawn 工具（回退策略） |
| `command-queue.ts` | 命令队列（串行化 + 优先级） |
| `command-queue.types.ts` | 队列类型定义 |
| `lanes.ts` | 命令通道（Main/Cron/Subagent/Nested） |
| `linux-oom-score.ts` | Linux OOM Score 调整（保护 Gateway） |
| `child-process-bridge.ts` | 子进程桥接 |
| `windows-command.ts` | Windows 命令兼容 |
| `supervisor/index.ts` | Supervisor 单例 |
| `supervisor/supervisor.ts` | 进程监控器实现 |
| `supervisor/registry.ts` | 运行记录注册表 |
| `supervisor/types.ts` | Supervisor 类型 |
| `supervisor/adapters/child.ts` | 子进程适配器 |
| `supervisor/adapters/pty.ts` | PTY 适配器 |
| `supervisor/adapters/env.ts` | 环境变量适配器 |
| `supervisor/supervisor-log.runtime.ts` | 日志 |

## 核心概念

### CommandLane（命令通道）

```typescript
const enum CommandLane {
  Main = "main",         // 主 Agent
  Cron = "cron",         // 定时任务
  CronNested = "cron-nested", // 定时任务嵌套
  Subagent = "subagent", // 子 Agent
  Nested = "nested",     // 嵌套命令
}
```

### ProcessSupervisor（进程监控器）

跟踪所有子进程的生命周期：启动、运行、退出、异常。

### 命令队列

串行化并发命令执行，支持优先级和超时。

### OOM 保护

Linux 上主动调高子进程的 `oom_score_adj`，让内核优先杀子进程而非 Gateway。
