# model-catalog — 功能定义与设计思想

## 这个模块解决什么问题？

OpenClaw 支持 25+ 个 LLM 提供商，每个提供商有几十个模型，每个模型有不同的能力、定价、上下文窗口。模型目录系统需要：

1. **统一管理** — 将来自不同来源（manifest、config、provider-index、runtime-refresh）的模型信息聚合到一个统一的数据结构中
2. **规范化** — 不同来源的数据格式不一致，需要统一规范（类型校验、默认值填充、大小写统一）
3. **权威合并** — 同一模型可能出现在多个来源中，需要决定以谁为准
4. **安全过滤** — 防止通过模型目录注入恶意数据（原型污染防护、owned providers 限制）

## 核心设计原则

### 1. 渐进式数据填充

所有字段都是可选的（Optional），支持从最小配置到完整配置的渐进式填充：

```typescript
// 最小模型定义（只有 ID）
{ id: "gpt-5.5" }

// 完整模型定义
{
  id: "gpt-5.5",
  name: "GPT-5.5",
  contextWindow: 1_048_576,
  maxTokens: 32768,
  input: ["text", "image"],
  reasoning: true,
  cost: { input: 2.5, output: 10.0 },
  status: "available",
  compat: { supportsTools: true, supportsStrictMode: true }
}
```

### 2. 防御性编程

对所有输入进行类型检查，不信任任何外部数据：

```typescript
function normalizeNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}
```

### 3. 安全防护

- **原型污染防护**：使用 `isBlockedObjectKey` 过滤危险的 key（如 `__proto__`、`constructor`）
- **Owned Providers 限制**：只处理已声明的提供商，防止通过目录数据注入未知提供商

### 4. 来源权威等级

当同一模型的信息来自多个来源时，按以下优先级合并：

```
config (0)       — 用户手动配置，优先级最高
manifest (1)     — 插件官方定义
cache (2)        — 缓存数据
runtime-refresh (2) — 运行时刷新数据
provider-index (3)  — 未安装插件的预览数据，优先级最低
```

## 关键数据结构

### ModelCatalogModel — 单个模型的完整描述

```typescript
type ModelCatalogModel = {
  id: string;                    // 模型标识（如 "gpt-5.5"）
  name?: string;                 // 显示名称
  api?: ModelApi;                // API 类型
  baseUrl?: string;              // 自定义 API 地址
  headers?: Record<string, string>; // 自定义请求头
  input?: ModelCatalogInput[];   // 输入类型 ["text", "image", "document"]
  reasoning?: boolean;           // 是否支持推理
  contextWindow?: number;        // 上下文窗口大小（token 数）
  contextTokens?: number;        // 上下文 token 数
  maxTokens?: number;            // 最大输出 token 数
  cost?: ModelCatalogCost;       // 定价信息
  compat?: ModelCompatConfig;    // 兼容性配置
  mediaInput?: ModelMediaInputConfig; // 媒体输入配置
  status?: ModelCatalogStatus;   // 状态（available/preview/deprecated/disabled）
  statusReason?: string;         // 状态原因
  replaces?: string[];           // 替代哪些旧模型
  replacedBy?: string;           // 被哪个新模型替代
  tags?: string[];               // 标签
};
```

### ModelCatalogProvider — 提供商及其模型

```typescript
type ModelCatalogProvider = {
  baseUrl?: string;              // 提供商级别的默认 API 地址
  api?: ModelApi;                // 提供商级别的默认 API 类型
  headers?: Record<string, string>; // 提供商级别的默认请求头
  models: ModelCatalogModel[];   // 该提供商下的所有模型
};
```

### NormalizedModelCatalogRow — 规范化后的模型行

经过 `normalizeModelCatalog` 处理后，所有字段都已填充默认值：

```typescript
type NormalizedModelCatalogRow = {
  provider: string;         // 提供商 ID（小写）
  id: string;               // 模型 ID
  ref: string;              // "provider/modelId" 格式引用
  mergeKey: string;         // "provider::modelId" 格式合并键（全小写）
  name: string;             // 显示名称（默认等于 id）
  source: ModelCatalogSource; // 数据来源
  input: ModelCatalogInput[]; // 输入类型（默认 ["text"]）
  reasoning: boolean;       // 是否支持推理（默认 false）
  status: ModelCatalogStatus; // 状态（默认 "available"）
  // ... 其他可选字段
};
```

### ModelCatalog — 顶层目录结构

```typescript
type ModelCatalog = {
  providers?: Record<string, ModelCatalogProvider>;  // 提供商列表
  aliases?: Record<string, ModelCatalogAlias>;        // 提供商别名
  suppressions?: ModelCatalogSuppression[];           // 模型抑制规则
  discovery?: Record<string, ModelCatalogDiscovery>;  // 发现模式配置
  runtimeAugment?: boolean;                           // 是否启用运行时扩展
};
```

## 模块在系统中的位置

```
┌─────────────────────────────────────────────────────────┐
│                     插件层（extensions/）                  │
│  anthropic  openai  deepseek  google  ollama  ...       │
│       │         │         │         │        │           │
│       └─────────┴─────────┴─────────┴────────┘           │
│                    ↓ 定义模型                              │
├─────────────────────────────────────────────────────────┤
│               插件 SDK 层（plugin-sdk/）                   │
│  plugin-entry.ts  provider-model-shared.ts  ...         │
│                         ↓ 注册模型                        │
├─────────────────────────────────────────────────────────┤
│           ★ 模型目录层（model-catalog/）★                  │
│  types.ts — 定义数据格式                                  │
│  normalize.ts — 规范化原始数据                             │
│  authority.ts — 按权威等级合并重复数据                      │
│  refs.ts — 构建模型引用和合并键                            │
│  manifest-planner.ts — 从 manifest 提取模型               │
│  provider-index/ — 内置 Provider 索引                     │
│                         ↓ 提供模型查询                     │
├─────────────────────────────────────────────────────────┤
│              Agent 层（agents/）                          │
│  查询模型能力 → 选择最佳模型 → 调用 Provider Runtime       │
└─────────────────────────────────────────────────────────┘
```
