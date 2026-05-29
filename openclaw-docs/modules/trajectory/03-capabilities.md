# trajectory — 能力清单与对外接口

## 运行时（runtime.ts）

### initTrajectoryRuntime

```typescript
function initTrajectoryRuntime(params: {
  cfg?: OpenClawConfig;
  env?: NodeJS.ProcessEnv;
}): TrajectoryRuntimeState
```

### appendTrajectoryEvent

```typescript
function appendTrajectoryEvent(event: TrajectoryEvent): void
```

### closeTrajectoryRuntime

```typescript
function closeTrajectoryRuntime(): void
```

## 路径（paths.ts）

```typescript
function resolveTrajectoryFilePath(sessionId: string): string
function resolveTrajectoryPointerFilePath(sessionId: string): string
function safeTrajectorySessionFileName(sessionId: string): string

const TRAJECTORY_RUNTIME_CAPTURE_MAX_BYTES = 10 * 1024 * 1024
const TRAJECTORY_RUNTIME_FILE_MAX_BYTES = 50 * 1024 * 1024
const TRAJECTORY_RUNTIME_EVENT_MAX_BYTES = 256 * 1024
```

## 元数据（metadata.ts）

```typescript
function buildTrajectoryRunMetadata(params: {
  config?: OpenClawConfig;
  workspaceDir: string;
  sessionKey?: string;
  provider?: string;
  modelId?: string;
  timeoutMs: number;
}): Record<string, unknown>
```

## 导出（export.ts）

```typescript
function exportTrajectoryBundle(params: {
  sessionId: string;
  outputDir: string;
  config?: OpenClawConfig;
}): Promise<TrajectoryCommandExportSummary>
```

## 清理（cleanup.ts）

```typescript
function cleanupTrajectoryArtifacts(params: {
  sessionId: string;
  configDir: string;
}): Promise<RemovedTrajectoryArtifact[]>
```

## 类型（types.ts）

### TrajectoryEvent

```typescript
type TrajectoryEvent = {
  traceSchema: "openclaw-trajectory";
  schemaVersion: 1;
  traceId: string;
  source: "runtime" | "transcript" | "export";
  type: string;
  ts: string;
  seq: number;
  sessionId: string;
  data?: Record<string, unknown>;
};
```

### TrajectoryBundleManifest

```typescript
type TrajectoryBundleManifest = {
  schemaVersion: number;
  traceId: string;
  sessionId: string;
  createdAt: string;
  events: { runtime: number; transcript: number; total: number; };
  warnings?: TrajectoryBundleWarning[];
};
```
