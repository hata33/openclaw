# commitments — 承诺管理

> 从 Agent 对话中提取和管理承诺（commitments）。
> 识别 Agent 对用户做出的承诺，跟踪完成状态。

## 文件结构

| 文件 | 职责 |
|------|------|
| `types.ts` | 类型定义（Commitment） |
| `config.ts` | 配置 |
| `extraction.ts` | 承诺提取（从对话中识别） |
| `store.ts` | 承诺存储 |
| `store-writer.ts` | 存储写入 |
| `runtime.ts` | 运行时管理 |
| `model-selection.runtime.ts` | 模型选择 |

## 核心概念

### Commitment

Agent 在对话中做出的承诺：

```
"我会在 5 点前完成" → { type: "deadline", content: "完成任务", by: "17:00" }
"明天提醒你" → { type: "reminder", content: "提醒", at: "明天" }
```

### 提取流程

```
对话消息 → extraction.ts → 使用 LLM 识别承诺 → 存储到 store
```
