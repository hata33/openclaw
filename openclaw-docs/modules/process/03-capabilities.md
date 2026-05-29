# process — API

## exec.ts

```typescript
function runCommandWithTimeout(params: {
  command: string;
  args?: string[];
  timeoutMs?: number;
  cwd?: string;
  env?: Record<string, string>;
}): Promise<{ stdout: string; stderr: string; exitCode: number }>
```

## kill-tree.ts

```typescript
function killProcessTree(pid: number, options?: { graceMs?: number }): Promise<void>
```

## command-queue.ts

```typescript
type CommandQueue = {
  enqueue<T>(task: () => Promise<T>, options?: CommandQueueEnqueueOptions): Promise<T>
}
```

## lanes.ts

```typescript
const enum CommandLane {
  Main, Cron, CronNested, Subagent, Nested
}
```

## supervisor

```typescript
function getProcessSupervisor(): ProcessSupervisor
interface ProcessSupervisor {
  spawn(params): Promise<RunRecord>
  kill(runId: string): void
  list(): RunRecord[]
}
```

## linux-oom-score.ts

```typescript
function adjustOomScore(childPid: number): void
```
