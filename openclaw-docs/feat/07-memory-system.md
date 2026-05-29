# 07 — 记忆系统

> OpenClaw 的记忆系统让 Agent 拥有"长期记忆"——记住用户偏好、历史事件、
> 学到的教训。本文档剖析记忆的存储、检索和维护机制。

## 记忆架构

OpenClaw 的记忆分为三层：

```
┌─────────────────────────────────────────┐
│ Layer 3: MEMORY.md（长期记忆）          │
│   人工策展的精华记忆                     │
├─────────────────────────────────────────┤
│ Layer 2: memory/*.md（每日记忆）        │
│   每天的原始笔记                         │
├─────────────────────────────────────────┤
│ Layer 1: Session Transcript（会话记录） │
│   每次对话的完整记录                     │
└─────────────────────────────────────────┘
```

### Layer 1: Session Transcript（会话记录）

每次对话的完整记录，存储在 `~/.openclaw/agents/main/sessions/` 目录下：

```
sessions/
  ├── <session-id-1>.jsonl    ← 会话1的完整记录
  ├── <session-id-2>.jsonl    ← 会话2的完整记录
  └── ...
```

每个 `.jsonl` 文件包含该会话的所有消息（用户输入、Agent 回复、工具调用等），以 JSON Lines 格式存储。

这是最底层的原始数据，保留了对话的完整上下文。

### Layer 2: 每日记忆（memory/*.md）

Agent 可以在对话过程中写入每日记忆：

```
workspace/memory/
  ├── 2026-05-29.md    ← 今天的笔记
  ├── 2026-05-28.md    ← 昨天的笔记
  └── ...
```

这些是 Agent 的"日记"，记录当天发生的重要事件、决策和想法。

### Layer 3: 长期记忆（MEMORY.md）

MEMORY.md 是 Agent 的"长期记忆"——从每日记忆中提炼出的精华：

```markdown
# MEMORY.md - 长期记忆

## 用户偏好
- 喜欢简洁的回复
- 时区: Asia/Shanghai
- 技术栈: TypeScript, Node.js

## 重要决策
- 2026-05-29: 决定使用 OpenClaw 作为 AI 助手平台
- ...

## 学到的教训
- 不要在深夜发送通知
- ...
```

## 记忆插件系统

OpenClaw 的记忆通过插件系统实现，支持多种后端：

### 记忆插件接口

```typescript
// 只能有一个活跃的记忆插件
interface MemoryPlugin {
  id: string;
  // 向量存储
  store(content: string, metadata: MemoryMetadata): Promise<void>;
  search(query: string, options?: SearchOptions): Promise<MemoryResult[]>;
  // 管理
  list(filter?: MemoryFilter): Promise<MemoryEntry[]>;
  delete(id: string): Promise<void>;
  // 维护
  compact(): Promise<void>;
}
```

### 内置记忆后端

| 后端 | 技术 | 特点 |
|------|------|------|
| `memory-lancedb` | LanceDB（向量数据库） | 语义搜索、本地存储 |
| `memory-wiki` | Markdown 文件 | 人类可读、Git 友好 |

#### LanceDB 向量记忆

LanceDB 后端使用向量嵌入实现语义搜索：

```
存储流程:
  文本 → 嵌入模型（embedding） → 向量 → 存储到 LanceDB

检索流程:
  查询文本 → 嵌入模型 → 查询向量 → 相似度搜索 → 返回相关记忆
```

这意味着搜索不需要精确匹配——语义相近的内容也能找到。

#### Wiki 记忆

Wiki 后端将记忆存储为 Markdown 文件，支持人类直接阅读和编辑：

```
memory-wiki/
  ├── user-preferences.md
  ├── project-notes.md
  └── lessons-learned.md
```

## 记忆检索流程

当 Agent 需要回忆信息时：

```
用户提到"上次我们讨论的那个项目"
  → Agent 调用 memory_search("上次讨论的项目")
  → 记忆系统搜索 MEMORY.md + memory/*.md
  → 向量相似度匹配
  → 返回相关记忆片段
  → Agent 将记忆注入上下文
  → 基于记忆生成回复
```

### 记忆搜索优先级

```
1. MEMORY.md（长期记忆，最可能相关）
2. 最近的 memory/*.md（近期记忆）
3. 较早的 memory/*.md（历史记忆）
```

## 记忆维护

### 心脏跳转维护（Heartbeat）

Agent 的心跳机制（HEARTBEAT.md）可以触发记忆维护：

```
心跳触发
  → 检查最近的记忆文件
  → 识别值得保留的长期记忆
  → 更新 MEMORY.md
  → 清理过时的记忆
```

### 记忆压缩

当记忆文件过多时，系统会自动压缩：
1. 合并同一天的多个记忆文件
2. 从旧的每日记忆中提炼关键信息到 MEMORY.md
3. 删除已提炼过的每日记忆文件

### 记忆卫生

`memory-hygiene` 技能（`skills/memory-hygiene/`）提供记忆清理能力：
- 审计向量记忆中的垃圾数据
- 清理不相关的自动回忆
- 优化记忆存储结构

## 记忆安全

### 安全规则

1. **MEMORY.md 只在主会话中加载** — 不在群聊、共享会话中暴露
2. **子 Agent 不继承记忆** — 防止记忆泄露到不受控的上下文
3. **记忆搜索有结果数量限制** — 防止大量记忆注入导致 token 浪费

### 为什么限制记忆加载？

```typescript
// MEMORY.md 包含敏感的个人信息
// 如果在群聊中加载，其他用户可能看到这些信息
// 所以只在主会话（直接对话）中加载
if (sessionType !== "main") {
  // 不加载 MEMORY.md
}
```

## 关键代码入口

| 文件/目录 | 职责 |
|-----------|------|
| `src/memory/root-memory-files.ts` | MEMORY.md 文件管理 |
| `extensions/memory-core/` | 记忆核心框架 |
| `extensions/memory-lancedb/` | LanceDB 向量记忆实现 |
| `extensions/memory-wiki/` | Wiki 文件记忆实现 |
| `src/plugin-sdk/` | 记忆插件接口定义 |
| `skills/memory-hygiene/` | 记忆清理技能 |

## 总结

1. **三层记忆** — 会话记录 → 每日记忆 → 长期记忆
2. **向量搜索** — LanceDB 实现语义级别的记忆检索
3. **插件化后端** — LanceDB、Wiki、可扩展
4. **自动维护** — 心跳触发记忆整理和压缩
5. **安全隔离** — 记忆只在主会话中加载，防止泄露
