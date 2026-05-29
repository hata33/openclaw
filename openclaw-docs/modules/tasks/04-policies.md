# tasks — 策略

## 一、并发策略

`task-executor-policy.ts` 控制最大并发任务数。

## 二、保留策略

`task-retention.ts` 定义任务保留时间：

- 完成任务：保留 N 天后清理
- 失败任务：保留更长时间供调试

## 三、状态协调

`task-registry.reconcile.ts` 在进程重启后协调任务状态：

```
进程重启 → 检查 running 任务 → 标记为 interrupted → 可重试
```

## 四、审计

所有任务操作记录审计日志。
