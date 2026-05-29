# context-engine — 上下文引擎

> 管理 Agent 的上下文窗口：消息组装、压缩和引擎注册。
> 提供可插拔的上下文引擎架构，支持第三方引擎替换内置引擎。

## 文件结构

| 文件 | 行数 | 职责 |
|------|------|------|
| `types.ts` | — | 核心类型（AssembleResult、CompactResult、ContextEngine 接口） |
| `registry.ts` | — | 引擎注册表（注册/解析/工厂模式） |
| `init.ts` | — | 初始化（确保内置引擎注册） |
| `delegate.ts` | — | 压缩委托（第三方引擎可复用内置压缩） |
| `legacy.ts` | — | Legacy 引擎（内置默认，保持向后兼容） |
| `legacy.registration.ts` | — | Legacy 引擎注册 |
| `host-compat.ts` | — | 宿主兼容性 |

## 核心概念

### ContextEngine 接口

```typescript
interface ContextEngine {
  info: ContextEngineInfo;
  ingest?(messages: AgentMessage[]): Promise<IngestResult>;
  assemble(ctx: ContextEngineRuntimeContext): Promise<AssembleResult>;
  compact?(ctx: ContextEngineRuntimeContext): Promise<CompactResult>;
}
```

- **ingest** — 消息摄入（可选）
- **assemble** — 上下文组装（从会话历史构建模型输入）
- **compact** — 上下文压缩（当上下文溢出时压缩）

### AssembleResult

```typescript
type AssembleResult = {
  messages: AgentMessage[];      // 组装后的消息列表
  estimatedTokens: number;       // 估计 Token 数
  promptAuthority?: "assembled" | "preassembly_may_overflow";
  systemPromptSections?: ...;    // 附加系统提示段
};
```

### 引擎注册

```typescript
registerContextEngine({ id: "my-engine", factory: () => new MyEngine() });
resolveContextEngine("my-engine");  // → MyEngine instance
```

### Legacy 引擎

内置默认引擎，保持与现有行为 100% 兼容：

- ingest: no-op（SessionManager 处理持久化）
- assemble: pass-through（使用现有 sanitize/validate/limit 流水线）
- compact: 委托给 `compactEmbeddedPiSessionDirect`
