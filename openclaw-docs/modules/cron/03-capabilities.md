# cron — 能力清单与对外接口

## 核心类型（types.ts）

### CronSchedule

```typescript
type CronSchedule =
  | { kind: "at"; at: string }                                    // 一次性
  | { kind: "every"; everyMs: number; anchorMs?: number }         // 固定间隔
  | { kind: "cron"; expr: string; tz?: string; staggerMs?: number }; // Cron 表达式
```

### CronJob

```typescript
type CronJob = CronJobBase<
  CronSchedule,
  CronSessionTarget,
  CronWakeMode,
  CronPayload,
  CronDelivery | undefined,
  CronFailureAlert | undefined | false
>;
```

### CronPayload

```typescript
type CronPayload =
  | { kind: "systemEvent"; text: string; ... }
  | { kind: "agentTurn"; message: string; model?: string; thinking?: string; timeoutSeconds?: number; toolsAllow?: string[]; ... };
```

### CronDelivery

```typescript
type CronDelivery = {
  mode: "none" | "announce" | "webhook";
  channel?: string;
  to?: string;
  threadId?: string | number;
  accountId?: string;
  bestEffort?: boolean;
  failureDestination?: { mode: string; channel?: string; to?: string; };
};
```

### CronFailureAlert

```typescript
type CronFailureAlert = {
  after: number;
  mode: "announce" | "webhook";
  channel?: string;
  to?: string;
  cooldownMs?: number;
  includeSkipped?: boolean;
};
```

### CronSessionTarget

```typescript
type CronSessionTarget = "main" | "isolated" | "current" | `session:${string}`;
```

### CronWakeMode

```typescript
type CronWakeMode = "next-heartbeat" | "now";
```

## 服务接口（service-contract.ts）

### CronServiceContract

```typescript
interface CronServiceContract {
  start(): Promise<void>;
  stop(): void;
  status(): Promise<CronStatusSummary>;
  list(opts?: { includeDisabled?: boolean }): Promise<CronListResult>;
  listPage(opts?: CronListPageOptions): Promise<CronListPageResult>;
  get(jobId: string): Promise<CronJob | undefined>;
  add(job: CronAddInput): Promise<CronAddResult>;
  update(jobId: string, patch: CronUpdateInput): Promise<CronUpdateResult>;
  remove(jobId: string): Promise<CronRemoveResult>;
  run(jobId: string, opts?: { mode?: CronRunMode }): Promise<CronServiceRunResult>;
  runs(jobId: string): Promise<CronRunHistoryEntry[]>;
  wake(text: string, opts?: { mode?: CronWakeMode }): Promise<CronWakeResult>;
}
```

## 调度引擎（schedule.ts）

### nextCronRunMs

```typescript
function nextCronRunMs(schedule: CronSchedule, afterMs?: number): number | null
```

- **功能**：计算下次执行时间（毫秒时间戳）

### isRecurringSchedule

```typescript
function isRecurringSchedule(schedule: CronSchedule): boolean
```

## 时间解析（parse.ts）

### parseAbsoluteTimeMs

```typescript
function parseAbsoluteTimeMs(input: string): number | null
```

- **支持格式**：ISO 8601、Unix 时间戳、日期字符串

## 规范化（normalize.ts）

### normalizeCronJobCreate

```typescript
function normalizeCronJobCreate(input: Record<string, unknown>): CronJobCreate
```

### normalizeCronJobPatch

```typescript
function normalizeCronJobPatch(input: Record<string, unknown>): CronJobPatch
```

## 投递（delivery.ts, delivery-plan.ts）

### resolveCronDeliveryPlan

```typescript
function resolveCronDeliveryPlan(job: CronJob): CronDeliveryPlan
```

### deliverCronResult

```typescript
function deliverCronResult(params: { job: CronJob; result: string; ... }): Promise<void>
```

### resolveFailureDestination

```typescript
function resolveFailureDestination(alert?: CronFailureAlert): CronFailureDeliveryPlan | null
```

## 活跃任务（active-jobs.ts）

### markCronJobActive / clearCronJobActive

```typescript
function markCronJobActive(jobId: string): void
function clearCronJobActive(jobId: string): void
function isCronJobActive(jobId: string): boolean
```

## 整点错开（stagger.ts）

### normalizeCronStaggerMs

```typescript
function normalizeCronStaggerMs(raw: unknown): number | undefined
```

### isRecurringTopOfHourCronExpr

```typescript
function isRecurringTopOfHourCronExpr(expr: string): boolean
```

## Session Target（session-target.ts）

### resolveCronSessionTargetSessionKey

```typescript
function resolveCronSessionTargetSessionKey(sessionTarget?: string): string | undefined
```

### assertSafeCronSessionTargetId

```typescript
function assertSafeCronSessionTargetId(sessionId: string): string
```

## 存储（store.ts）

### loadCronStore

```typescript
function loadCronStore(configDir?: string): LoadedCronStore
```

### writeCronStore

```typescript
function writeCronStore(store: CronStoreFile, configDir?: string): void
```
