# context-engine — 能力清单与对外接口

## 核心类型（types.ts）

### ContextEngine

```typescript
interface ContextEngine {
  info: ContextEngineInfo;
  ingest?(messages: AgentMessage[], ctx: ContextEngineRuntimeContext): Promise<IngestResult>;
  assemble(ctx: ContextEngineRuntimeContext): Promise<AssembleResult>;
  compact?(ctx: ContextEngineRuntimeContext): Promise<CompactResult>;
}
```

### AssembleResult

```typescript
type AssembleResult = {
  messages: AgentMessage[];
  estimatedTokens: number;
  promptAuthority?: "assembled" | "preassembly_may_overflow";
  systemPromptSections?: StructuredPromptSection[];
};
```

### ContextEngineInfo

```typescript
type ContextEngineInfo = {
  id: string;
  name: string;
  version: string;
};
```

### ContextEngineRuntimeContext

包含会话历史、配置、Agent 信息等运行时上下文。

## 注册表（registry.ts）

```typescript
function registerContextEngine(params: {
  id: string;
  factory: ContextEngineFactory;
}): void

function resolveContextEngine(slotId?: string, ctx?: ContextEngineFactoryContext): Promise<ContextEngine>
```

## 初始化（init.ts）

```typescript
function ensureContextEnginesInitialized(): void
```

## 委托（delegate.ts）

```typescript
function delegateCompactionToRuntime(ctx: ContextEngineRuntimeContext): Promise<CompactResult>
```

## Legacy 引擎（legacy.ts）

```typescript
class LegacyContextEngine implements ContextEngine {
  readonly info: ContextEngineInfo;
  assemble(ctx): Promise<AssembleResult>;
  compact(ctx): Promise<CompactResult>;
}
```
