# 13 — 上下文引擎

> OpenClaw 的上下文引擎（Context Engine）是可插拔的上下文管理抽象层，
> 负责消息摄入、上下文组装、自动压缩和维护，确保每次模型调用都在 token 预算内。

## 为什么需要上下文引擎

LLM 的上下文窗口有限（4K–200K tokens），但对话可能无限增长。上下文引擎解决核心问题：

```
无限增长的对话历史 + 有限的 token 窗口 = 需要智能管理

方案：可插拔的上下文引擎，不同策略可以互换：
- 简单截断（最近 N 轮）
- 滑动窗口 + 摘要
- 向量检索增强（RAG）
- 自定义策略（通过插件）
```

## 架构

```
用户消息 → Agent 对话
              │
              ▼
     ┌─────────────────┐
     │  Context Engine  │ ← 可插拔，通过插件注册
     │  (接口定义)       │
     └────────┬────────┘
              │
     ┌────────┴────────────────────┐
     │                              │
     ▼                              ▼
  核心引擎                       插件引擎
  (内置默认)                   (memory-lancedb 等)
```

## ContextEngine 接口

`src/context-engine/types.ts` 定义了完整的上下文引擎契约：

```typescript
interface ContextEngine {
  readonly info: ContextEngineInfo;

  // 生命周期
  bootstrap?(params): Promise<BootstrapResult>;      // 初始化
  maintain?(params): Promise<MaintenanceResult>;      // 维护（压缩后清理）
  dispose?(): Promise<void>;                           // 清理资源

  // 数据摄入
  ingest(params): Promise<IngestResult>;               // 单条消息
  ingestBatch?(params): Promise<IngestBatchResult>;    // 批量消息

  // 核心操作
  assemble(params): Promise<AssembleResult>;           // 组装上下文
  compact(params): Promise<CompactResult>;             // 压缩上下文

  // 回合后处理
  afterTurn?(params): Promise<void>;                   // 回合完成后处理

  // 子 Agent 支持
  prepareSubagentSpawn?(params): Promise<...>;         // 准备子 Agent
  onSubagentEnded?(params): Promise<void>;             // 子 Agent 结束通知
}
```

## 核心流程

### 1. Bootstrap（初始化）

```
新会话创建
  → contextEngine.bootstrap()
  → 可选：导入历史消息
  → 返回 bootstrapped: true/false
```

### 2. Ingest（消息摄入）

```
每条新消息产生
  → contextEngine.ingest()
  → 引擎决定是否存储、如何索引
  → 批量消息用 ingestBatch() 更高效
```

### 3. Assemble（上下文组装）

```
模型调用前
  → contextEngine.assemble({
      messages,        // 原始消息历史
      tokenBudget,     // token 预算
      availableTools,  // 可用工具列表
      model,           // 当前模型
      prompt,          // 用户当前提问
    })
  → 引擎返回：
    - messages: 精选的消息列表（在预算内）
    - estimatedTokens: 估计 token 数
    - systemPromptAddition: 附加系统提示
    - contextProjection: 投影模式（per_turn 或 thread_bootstrap）
```

### 4. Compact（上下文压缩）

当 token 用量接近或超过预算时：

```
token 接近上限
  → contextEngine.compact({
      tokenBudget,
      force,           // 是否强制压缩
      currentTokenCount,
      abortSignal,     // 可取消
    })
  → 引擎执行压缩策略：
    - 旧消息摘要
    - 删除冗余对话
    - 保留关键信息
  → 返回压缩结果（前后 token 数、摘要等）
```

### 5. Maintain（维护）

```
压缩完成 / 回合结束
  → contextEngine.maintain()
  → 引擎可以做：
    - 清理过期的内部状态
    - 重写转录条目（通过 runtimeContext.rewriteTranscriptEntries）
    - 优化存储
```

## 子 Agent 上下文管理

上下文引擎参与子 Agent 的生命周期：

```
主 Agent 准备 spawn 子 Agent
  → contextEngine.prepareSubagentSpawn({
      parentSessionKey,
      childSessionKey,
      contextMode: "isolated" | "fork",
    })
  → 返回 rollback 函数（spawn 失败时回滚）

子 Agent 完成
  → contextEngine.onSubagentEnded({
      childSessionKey,
      reason: "completed" | "deleted" | "swept" | "released",
    })
```

- **isolated 模式**：子 Agent 从零开始
- **fork 模式**：子 Agent 继承父 Agent 的上下文

## 上下文投影

`ContextEngineProjection` 控制上下文如何传递给后端运行时：

```typescript
type ContextEngineProjection = {
  mode: "per_turn" | "thread_bootstrap";
  epoch?: string;          // 上下文版本号
  fingerprint?: string;    // 诊断指纹
};
```

- **per_turn**：每次模型调用都完整投影上下文（传统模式）
- **thread_bootstrap**：只在 epoch 变化时投影一次，后续复用后端线程（高效模式）

## Prompt Cache 感知

上下文引擎可以感知和利用 prompt cache：

```typescript
type ContextEnginePromptCacheInfo = {
  retention: "none" | "short" | "long" | "in_memory" | "24h";
  lastCallUsage: { input, output, cacheRead, cacheWrite, total };
  observation: { broke, previousCacheRead, cacheRead, changes[] };
  lastCacheTouchAt: number;
  expiresAt: number;
};
```

引擎可以根据 cache 状态优化上下文组装策略，最大化 cache 命中率。

## Host 能力协商

上下文引擎通过 `hostRequirements` 声明需要的宿主能力：

```typescript
type HostCapability =
  | "bootstrap"              // 支持初始化
  | "assemble-before-prompt" // 支持模型调用前组装
  | "after-turn"             // 支持回合后处理
  | "maintain"               // 支持维护
  | "compact"                // 支持压缩
  | "runtime-llm-complete"   // 提供 LLM 推理能力
  | "thread-bootstrap-projection"; // 支持线程引导投影
```

如果宿主不满足要求，引擎会返回错误而不是静默降级。

## 引擎注册

`src/context-engine/registry.ts` 管理上下文引擎的注册和发现：

```
插件注册 contextEngine
  → registry 记录引擎
  → 创建会话时，根据配置选择引擎
  → 未指定时使用默认引擎
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/context-engine/types.ts` | ContextEngine 接口定义 |
| `src/context-engine/registry.ts` | 引擎注册与发现 |
| `src/context-engine/init.ts` | 引擎初始化 |
| `src/context-engine/host-compat.ts` | 宿主能力兼容性检查 |
| `src/context-engine/delegate.ts` | 引擎委托调用 |
| `src/context-engine/legacy.ts` | 内置默认引擎 |
| `src/context-engine/legacy.registration.ts` | 默认引擎注册 |

## 总结

1. **可插拔设计** — 上下文管理策略通过插件替换，核心不绑定具体实现
2. **完整生命周期** — bootstrap → ingest → assemble → compact → maintain
3. **预算感知** — 所有操作都在 token 预算约束下执行
4. **子 Agent 支持** — 参与子 Agent 的上下文继承和清理
5. **高级特性** — prompt cache 感知、线程投影、安全重写
