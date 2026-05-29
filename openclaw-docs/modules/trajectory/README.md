# trajectory — 轨迹记录

> 负责 Agent 运行轨迹的记录、导出和清理。
> 捕获 Agent 每次运行的完整事件流，用于调试、审计和支持请求。

## 文件结构

| 文件 | 行数 | 职责 |
|------|------|------|
| `types.ts` | — | 事件类型定义（TrajectoryEvent、Manifest） |
| `paths.ts` | — | 路径管理（文件路径解析、大小限制） |
| `runtime.ts` | — | 运行时记录（捕获 Agent 事件并写入文件） |
| `metadata.ts` | — | 元数据收集（配置快照、环境信息、版本） |
| `export.ts` | — | 导出功能（生成调试支持包） |
| `command-export.ts` | — | CLI 导出命令 |
| `cleanup.ts` | — | 清理过期轨迹文件 |

## 核心概念

- **TrajectoryEvent** — 轨迹事件（Agent 运行中的每一步操作）
- **Trajectory Pointer** — 指向当前活跃轨迹文件的指针
- **Trajectory Bundle** — 导出的调试支持包（JSON/JSONL/Text）
- **Metadata** — 运行元数据（配置、环境、模型、技能快照）

## 事件结构

```typescript
type TrajectoryEvent = {
  traceSchema: "openclaw-trajectory";
  schemaVersion: 1;
  traceId: string;         // 追踪 ID
  source: "runtime" | "transcript" | "export";
  type: string;            // 事件类型
  ts: string;              // ISO 时间戳
  seq: number;             // 序列号
  sessionId: string;       // 会话 ID
  provider?: string;       // AI Provider
  modelId?: string;        // 模型 ID
  data?: Record<string, unknown>;  // 事件数据
};
```

## 大小限制

```typescript
TRAJECTORY_RUNTIME_CAPTURE_MAX_BYTES = 10 MB   // 单次捕获最大
TRAJECTORY_RUNTIME_FILE_MAX_BYTES = 50 MB       // 单文件最大
TRAJECTORY_RUNTIME_EVENT_MAX_BYTES = 256 KB     // 单事件最大
```
