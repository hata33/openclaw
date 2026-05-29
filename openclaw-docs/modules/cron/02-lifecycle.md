# cron — 实现流程与数据流

## 任务调度完整流程

```
服务启动 → cron/service.ts
  ↓
1. 加载持久化存储
   store.ts → 读取 cron.json 或 cron/ 目录
   → 解析为 CronStoreFile

2. 注册调度器
   service/timer.ts → 为每个启用的任务注册定时器
   │
   ├→ cron 表达式 → croner 库计算下次执行时间
   ├→ every → setInterval(everyMs)
   └→ at → setTimeout(at - now)

3. 等待触发
   ↓
定时器到期
  ↓
4. 标记任务活跃
   active-jobs.ts → markCronJobActive(jobId)

5. 执行任务
   根据 sessionTarget 分支：
   │
   ├→ "main" — 系统事件注入
   │    resolveEventSessionKey(sessionKey)
   │    → 注入到主会话的消息队列
   │
   └→ "isolated" — 独立 Agent 运行
        isolated-agent/run.ts
        │
        ├→ 创建会话
        │    session.ts → 创建临时 Session
        │
        ├→ 加载上下文
        │    skills-snapshot.ts → 技能快照
        │    model-selection.ts → 模型选择
        │    run-config.ts → 运行配置
        │
        ├→ 执行 Agent
        │    run-executor.ts → 执行 Agent Loop
        │    run-delivery.runtime.ts → 收集输出
        │
        ├→ 投递结果
        │    delivery-target.ts → 解析投递目标
        │    delivery-dispatch.ts → 调度投递
        │    delivery.ts → 发送消息
        │
        └→ 清理
             session-reaper.ts → 清理过期会话

6. 清除活跃标记
   active-jobs.ts → clearCronJobActive(jobId)

7. 记录执行历史
   service/task-ledger.ts → 记录运行结果

8. 判断是否重复
   at 模式 + deleteAfterRun → 删除任务
   cron/every → 重新注册下次定时器
```

## Cron 表达式调度

```
schedule.ts
  ↓
1. 解析表达式
   resolveCachedCron(expr, timezone)
   → croner 库解析
   → LRU 缓存（最大 512 条）

2. 计算下次执行时间
   cron.nextRun()
   → 返回 Date

3. 注册定时器
   setTimeout(nextRun - Date.now())

4. 错开处理
   if (isRecurringTopOfHourCronExpr(expr)):
     staggerMs = normalizeCronStaggerMs(job.staggerMs)
     → 添加 0 ~ staggerMs 的随机延迟
```

## 时间解析流程

```
parse.ts → parseAbsoluteTimeMs(input)
  ↓
纯数字 → Unix 时间戳
ISO 日期 → "2026-06-01" → "2026-06-01T00:00:00Z"
ISO 时间 → "2026-06-01T09:00:00" → "2026-06-01T09:00:00Z"
带时区 → 直接解析
```

## 投递流程

```
任务执行完成
  ↓
1. 解析投递计划
   delivery-plan.ts → resolveCronDeliveryPlan(job)
   → { mode, channel, to, threadId, accountId }

2. 投递分支
   │
   ├→ "none" → 不投递
   │
   ├→ "announce" → 发送通知
   │    delivery.ts → sendDurableMessageBatch()
   │    → 渠道消息发送
   │
   └→ "webhook" → HTTP POST
        POST job.delivery.to URL
        → 发送运行结果 JSON

3. 失败投递
   resolveFailureDestination(job.failureAlert)
   → 连续失败 → 发送失败警报
```

## 任务 CRUD 流程

```
CronServiceContract 接口:
  │
  ├→ add(input) → 创建任务
  │    normalize(input) → 规范化
  │    validate → 验证
  │    store.write → 持久化
  │    timer.register → 注册定时器
  │
  ├→ update(id, patch) → 更新任务
  │    merge → 合并变更
  │    store.write → 持久化
  │    timer.refresh → 刷新定时器
  │
  ├→ remove(id) → 删除任务
  │    timer.unregister → 取消定时器
  │    store.write → 持久化
  │
  ├→ run(id) → 手动触发
  │    跳过调度，直接执行
  │
  ├→ wake(text) → 唤醒事件
  │    注入系统事件到主会话
  │
  ├→ list() → 列出任务
  ├→ runs(id) → 执行历史
  └→ status() → 服务状态
```

## 持久化流程

```
store.ts
  ↓
1. 解析存储路径
   resolveConfigDir() + "/cron.json"
   或 resolveConfigDir() + "/cron/"

2. 读取文件
   fs.readFileSync() → JSON.parse

3. 分离配置和状态
   configJobs: 任务配置
   state: 运行状态（下次执行时间、最后结果等）

4. 写入文件
   replaceFileAtomic() → 原子写入
   → 防止并发写入冲突
```

## 会话清理

```
session-reaper.ts
  ↓
定期扫描 Cron 创建的临时会话
  → 超过 TTL → 删除
  → 关联任务已删除 → 删除
```
