# process — 功能定义

## 解决什么问题？

Agent 需要执行大量子进程命令（exec、工具调用、Agent 运行等）。process 模块提供统一的进程管理基础设施。

## 命令执行（exec.ts）

- `execFile` 和 `spawn` 的包装
- 超时控制
- Windows 编码处理（GBK → UTF-8）
- 输出缓冲限制

## 进程树终止（kill-tree.ts）

优雅终止整个进程树：

```
1. SIGTERM（优雅关闭）
   ↓ 等待 grace period
2. SIGKILL（强制终止）
```

Windows 使用 `taskkill /T`。

## 命令队列（command-queue.ts）

串行化命令执行：

- 优先级：foreground > normal > background
- 超时警告
- 等待回调

## ProcessSupervisor

跟踪所有子进程：

```typescript
interface ProcessSupervisor {
  spawn(params): Promise<RunRecord>
  kill(runId): void
  list(): RunRecord[]
}
```

## OOM 保护（linux-oom-score.ts）

```typescript
adjustOomScore(childPid)
→ 提高子进程的 oom_score_adj
→ 内核 OOM 时优先杀子进程
```
