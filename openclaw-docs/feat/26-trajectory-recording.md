# 26 — 轨迹记录与导出

> OpenClaw 的轨迹模块（Trajectory）记录 Agent 的操作轨迹，
> 支持导出为结构化格式，用于调试、审计和回放。

## 设计思想

```
Agent 执行复杂任务时涉及多步操作：
  → 调用工具 → 搜索 → 读取文件 → 编辑 → 提交

轨迹系统记录每一步：
  → 操作类型和时间戳
  → 输入参数和输出结果
  → 中间状态和决策依据

用途：
  → 调试：为什么 Agent 做了这个决定？
  → 审计：Agent 执行了哪些操作？
  → 回放：复现 Agent 的操作序列
```

## 架构

```
Agent 操作
  │
  ▼
┌──────────────────────┐
│  runtime.ts          │  ← 运行时捕获
│  记录操作到轨迹       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  metadata.ts         │  ← 元数据管理
│  标注操作类型和上下文  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  export.ts           │  ← 导出
│  转换为目标格式       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  cleanup.ts          │  ← 清理
│  过期轨迹自动清理     │
└──────────────────────┘
```

## 轨迹记录

`src/trajectory/runtime.ts` — 运行时捕获 Agent 操作：

```
Agent 执行操作
  → trajectory.record()
  → 记录：
    - 操作类型（tool_call, message, decision）
    - 时间戳
    - 输入参数
    - 输出结果
    - 关联的会话 ID
  → 写入轨迹文件
```

## 元数据

`src/trajectory/metadata.ts` — 为轨迹条目添加结构化元数据：

```typescript
type TrajectoryEntry = {
  id: string;
  type: string;              // 操作类型
  timestamp: number;
  sessionId: string;
  input: unknown;
  output: unknown;
  metadata: {
    model?: string;          // 使用的模型
    duration?: number;       // 执行时长
    tokens?: number;         // 消耗 token
    toolName?: string;       // 工具名称
  };
};
```

## 导出

`src/trajectory/export.ts` — 将轨迹导出为不同格式：

```
导出请求
  → 支持格式：
    - JSON Lines（结构化数据）
    - Markdown（人类可读）
    - Command Export（可重放的命令序列）
  → 可按时间范围、会话、操作类型过滤
  → 导出到文件或标准输出
```

### Command Export

`src/trajectory/command-export.ts` — 导出为可重放的命令：

```
Agent 执行了一系列 shell 命令
  → command-export 提取所有命令
  → 生成可执行的 shell 脚本
  → 用户可以重放这些命令
```

## 清理

`src/trajectory/cleanup.ts` — 自动清理过期轨迹：

```
轨迹文件占用磁盘空间
  → 定期检查轨迹文件
  → 超过保留期的文件 → 自动删除
  → 保留期可配置（默认 30 天）
```

## 路径管理

`src/trajectory/paths.ts` — 轨迹文件的存储路径：

```
轨迹文件存储位置：
  → ~/.openclaw/trajectories/{session-id}/
  → 每个会话一个目录
  → 文件名按时间戳排序
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/trajectory/runtime.ts` | 运行时捕获 |
| `src/trajectory/metadata.ts` | 元数据管理 |
| `src/trajectory/export.ts` | 轨迹导出 |
| `src/trajectory/command-export.ts` | 命令导出 |
| `src/trajectory/cleanup.ts` | 自动清理 |
| `src/trajectory/paths.ts` | 路径管理 |

## 总结

1. **完整记录** — Agent 的每一步操作都被记录
2. **结构化元数据** — 操作类型、耗时、token 等信息完整
3. **多格式导出** — JSON/Markdown/命令脚本
4. **自动清理** — 过期轨迹不占用空间
5. **调试利器** — 复现和审计 Agent 的行为
