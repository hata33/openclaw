# process — 数据流

## 命令执行流程

```
Agent 请求执行命令
  ↓
1. 入队
   commandQueue.enqueue(task, { priority, timeout })
   → 按优先级排队

2. 执行
   runCommandWithTimeout(command, options)
   → spawn child_process
   → 设置超时

3. 注册到 Supervisor
   supervisor.spawn(params)
   → 记录 RunRecord

4. OOM 保护（Linux）
   adjustOomScore(child.pid)
   → 提高子进程 oom_score_adj

5. 等待完成
   → 收集 stdout/stderr
   → 超时则 kill-tree

6. 更新记录
   supervisor.update(runId, { state: "exited" })
```

## 进程终止流程

```
kill-tree.ts
  ↓
Unix:
  1. SIGTERM → 整个进程组
  2. 等待 grace period（默认 3s）
  3. SIGKILL → 强制终止

Windows:
  1. taskkill /T /PID（优雅）
  2. taskkill /F /T /PID（强制）
```
