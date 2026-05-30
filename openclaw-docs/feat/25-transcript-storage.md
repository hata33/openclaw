# 25 — 对话转录与存储

> OpenClaw 的转录模块（Transcripts）管理对话历史的持久化存储、摘要生成
> 和跨会话检索，是记忆系统和上下文引擎的数据基础。

## 设计思想

```
每条对话消息都是宝贵的数据：
  → 用户偏好
  → 决策上下文
  → 执行记录

转录系统确保：
  → 所有对话都被持久化
  → 可以搜索和检索历史对话
  → 长对话可以自动摘要
  → 跨会话保持连续性
```

## 架构

```
对话消息
  │
  ▼
┌──────────────────────┐
│  store.ts            │  ← 持久化存储
│  写入转录文件         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  summary.ts          │  ← 摘要生成
│  LLM 生成对话摘要     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  provider-registry   │  ← 存储后端
│  文件 / 数据库 / 云   │
└──────────────────────┘
```

## 转录存储

`src/transcripts/store.ts` — 转录数据的持久化：

```
消息产生
  → store.append() 追加消息
  → 按 session 分文件存储
  → 格式：JSON Lines (每行一条消息)
  → 自动滚动（文件过大时创建新文件）
```

### 存储格式

```jsonl
{"id":"msg-1","role":"user","content":"你好","ts":1703275200}
{"id":"msg-2","role":"assistant","content":"你好！有什么可以帮你的？","ts":1703275201}
{"id":"msg-3","role":"user","content":"今天天气怎么样","ts":1703275202,"tools":[{"name":"web_search","input":{"query":"今天天气"}}]}
```

## 摘要生成

`src/transcripts/summary.ts` — 当对话过长时自动生成摘要：

```
对话超过一定长度
  → summary.generate()
  → 使用 LLM 提取关键信息
  → 生成结构化摘要
  → 摘要替代旧消息，释放 token 空间
```

### 摘要策略

```
滑动窗口 + 摘要：
  → 保留最近 N 轮完整对话
  → 较早的对话压缩为摘要
  → 摘要作为系统上下文注入
```

## Provider 注册

`src/transcripts/provider-registry.ts` — 转录存储后端可插拔：

```
默认：本地文件存储
  → JSON Lines 格式
  → 自动管理文件大小

可扩展：
  → 数据库存储（SQLite、Postgres）
  → 云存储（S3）
  → 自定义存储
```

## 转录类型

`src/transcripts/provider-types.ts` — 定义转录数据的统一类型：

```typescript
type TranscriptEntry = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
};
```

## 手动源

`src/transcripts/manual-source.ts` — 手动导入外部对话：

```
用户想导入历史对话
  → manual-source 接口
  → 解析外部格式
  → 写入转录存储
```

## 配置

```yaml
transcripts:
  provider: "file"               # 存储后端
  maxFileSize: 10485760          # 单文件最大 10MB
  autoSummary: true              # 自动摘要
  summaryThreshold: 100          # 超过 100 条消息时摘要
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/transcripts/store.ts` | 转录存储核心 |
| `src/transcripts/summary.ts` | 摘要生成 |
| `src/transcripts/provider-registry.ts` | 存储后端注册 |
| `src/transcripts/provider-types.ts` | 类型定义 |
| `src/transcripts/config.ts` | 配置 |
| `src/transcripts/manual-source.ts` | 手动导入 |

## 总结

1. **持久化** — 所有对话可靠存储，不丢失
2. **自动摘要** — 长对话自动压缩，释放 token 空间
3. **可插拔后端** — 文件/数据库/云存储可切换
4. **数据基础** — 为记忆系统、上下文引擎提供数据
