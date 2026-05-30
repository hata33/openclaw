# 22 — 承诺系统

> OpenClaw 的承诺系统（Commitments）自动从对话中提取 Agent 做出的承诺，
> 追踪执行状态，确保"说到做到"。

## 设计思想

```
对话中 Agent 经常会做出承诺：
  "我会在明天早上 9 点提醒你" → 需要创建定时提醒
  "我稍后会整理这份报告" → 需要后续跟进
  "我会持续监控邮件" → 需要持续任务

没有承诺系统：
  → 承诺淹没在对话中
  → 没有追踪，容易遗忘

有承诺系统：
  → 自动提取承诺
  → 追踪执行状态
  → 未完成时主动提醒
```

## 架构

```
对话回合完成
  │
  ▼
┌──────────────────────┐
│  extraction.ts       │  ← LLM 提取承诺
│  从对话文本中提取     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  store.ts            │  ← 持久化存储
│  保存承诺记录         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  runtime.ts          │  ← 生命周期管理
│  队列 / 定时 / 重试   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  config.ts           │  ← 配置（时区、策略）
└──────────────────────┘
```

## 承诺提取

`src/commitments/extraction.ts` — 使用 LLM 从对话中提取承诺：

```
对话回合完成（用户消息 + Agent 回复）
  → buildCommitmentExtractionPrompt() 构建提取 prompt
  → 调用 LLM 分析对话
  → parseCommitmentExtractionOutput() 解析输出
  → 返回提取的承诺列表
```

### 提取流程

```typescript
type CommitmentExtractionItem = {
  sessionId: string;
  userText: string;           // 用户说了什么
  assistantText?: string;     // Agent 回复了什么
  sourceMessageId?: string;   // 来源消息 ID
  scope: CommitmentScope;     // 承诺范围
};

// 批量提取
extractBatch({ items })
  → 并行提取多个会话的承诺
  → persistCommitmentExtractionResult() 持久化
```

## 承诺存储

`src/commitments/store.ts` — 持久化承诺记录：

```
承诺提取完成
  → store.create() 创建承诺记录
  → 记录：描述、截止时间、状态、来源
  → 存储到本地文件（JSON）
  → 支持查询、更新、标记完成
```

## 运行时管理

`src/commitments/runtime.ts` — 管理承诺的生命周期：

### 提取队列

```
对话完成 → 不立即提取，加入队列
  → 收集一批对话
  → 定时批量提取（减少 API 调用）
  → 提取失败 → 冷却后重试
```

### 心跳策略

`src/commitments/` 中的心跳集成：

```
Heartbeat 触发
  → 检查未完成的承诺
  → 过期的承诺 → 通知 Agent 跟进
  → 心跳策略控制检查频率
```

## 模型选择

`src/commitments/model-selection.runtime.ts` — 承诺提取使用轻量模型：

```
承诺提取不需要最强模型
  → 选择便宜的模型（如 haiku、flash）
  → 配置覆盖：commitments.model
  → 降低成本，不影响质量
```

## 配置

```yaml
commitments:
  enabled: true
  timezone: "Asia/Shanghai"      # 承诺截止时间的时区
  model: "auto"                  # 提取模型
  heartbeatPolicy:               # 心跳检查策略
    checkInterval: 30            # 每 30 分钟检查一次
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/commitments/extraction.ts` | LLM 承诺提取 |
| `src/commitments/store.ts` | 承诺持久化存储 |
| `src/commitments/runtime.ts` | 生命周期管理 |
| `src/commitments/config.ts` | 配置解析 |
| `src/commitments/model-selection.runtime.ts` | 模型选择 |

## 总结

1. **自动提取** — LLM 自动从对话中识别承诺
2. **持久追踪** — 承诺不会随对话结束而丢失
3. **批量处理** — 队列化提取，减少 API 调用
4. **心跳集成** — 定期检查未完成承诺
5. **轻量模型** — 使用便宜模型提取，降低成本
