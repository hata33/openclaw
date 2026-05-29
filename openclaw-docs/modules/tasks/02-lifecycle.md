# tasks — 数据流

## 任务生命周期

```
1. 创建任务
   taskRegistry.create({ type, params, owner })
   → pending 状态

2. 排队执行
   taskExecutor.enqueue(task)
   → 检查策略（并发限制等）

3. 启动执行
   detached-task-runtime.ts
   → fork 子进程/子 Agent

4. 状态更新
   taskStatus.update(taskId, { state: "running" })
   → 存储到 SQLite

5. 执行完成
   → completed / failed / cancelled

6. 结果投递
   delivery-runtime.ts
   → 发送通知到渠道

7. 清理
   maintenance.ts
   → 过期任务清理
```

## TaskFlow 生命周期

```
1. 创建流程
   taskFlowRegistry.create({ steps })

2. 执行步骤
   → 串行/并行执行子任务

3. 等待条件
   → 等待外部事件

4. 完成
   → 所有步骤完成
```
