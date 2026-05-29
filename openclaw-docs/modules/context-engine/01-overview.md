# context-engine — 功能定义与设计思想

## 这个模块解决什么问题？

AI 模型有上下文窗口限制。会话历史可能超出窗口大小，需要管理哪些消息被送入模型。

核心问题：

1. **上下文组装** — 从完整会话历史中选择哪些消息送入模型
2. **上下文压缩** — 当历史过长时，如何压缩保留关键信息
3. **引擎可插拔** — 不同场景可能需要不同的上下文管理策略

## 设计思想

### 1. 引擎接口

统一接口，支持多种实现：

```typescript
interface ContextEngine {
  ingest?(messages): Promise<IngestResult>;      // 消息摄入
  assemble(ctx): Promise<AssembleResult>;         // 上下文组装
  compact?(ctx): Promise<CompactResult>;          // 上下文压缩
}
```

### 2. 工厂模式

引擎通过工厂函数创建，支持异步初始化：

```typescript
type ContextEngineFactory = (ctx: ContextEngineFactoryContext) => Promise<ContextEngine>;
```

### 3. 委托压缩

第三方引擎可以复用内置的压缩逻辑：

```typescript
delegateCompactionToRuntime(ctx)  // 委托给内置压缩
```

### 4. Prompt Authority

控制 Token 计数的权威来源：

- `assembled` — 使用组装后的 Token 估计
- `preassembly_may_overflow` — 使用组装前后的最大值（防止隐藏溢出）

### 5. Legacy 兼容

内置 Legacy 引擎保持 100% 向后兼容，确保升级不破坏现有行为。
