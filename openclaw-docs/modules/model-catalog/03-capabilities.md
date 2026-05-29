# model-catalog — 能力清单与对外接口

## 公共 API 总览

模型目录模块通过 `index.ts` 统一导出所有公共 API。外部模块应通过此入口导入。

## 一、引用工具函数（refs.ts）

### normalizeModelCatalogProviderId

```typescript
function normalizeModelCatalogProviderId(provider: string): string
```

- **功能**：规范化 Provider ID，统一转为小写并去除空白
- **示例**：`"DeepSeek"` → `"deepseek"`，`"  OpenAI  "` → `"openai"`
- **用途**：确保大小写不敏感的 Provider 匹配

### buildModelCatalogRef

```typescript
function buildModelCatalogRef(provider: string, modelId: string): string
```

- **功能**：构建模型引用字符串
- **格式**：`"provider/modelId"`
- **示例**：`buildModelCatalogRef("openai", "gpt-5.5")` → `"openai/gpt-5.5"`
- **用途**：模型在系统中的唯一人类可读标识符

### buildModelCatalogMergeKey

```typescript
function buildModelCatalogMergeKey(provider: string, modelId: string): string
```

- **功能**：构建模型合并键
- **格式**：`"provider::modelId"`（全小写）
- **示例**：`buildModelCatalogMergeKey("OpenAI", "GPT-5.5")` → `"openai::gpt-5.5"`
- **用途**：在数据合并时识别同一模型的不同来源条目

## 二、规范化函数（normalize.ts）

### normalizeModelCatalog

```typescript
function normalizeModelCatalog(
  value: unknown,
  params: { ownedProviders: ReadonlySet<string> }
): ModelCatalog | undefined
```

- **功能**：规范化完整的模型目录数据
- **参数**：
  - `value` — 原始 JSON 对象（不信任的输入）
  - `params.ownedProviders` — 已声明的 Provider ID 集合（安全过滤）
- **返回**：规范化后的 `ModelCatalog`，输入无效时返回 `undefined`
- **处理流程**：依次规范化 providers → aliases → suppressions → discovery → runtimeAugment

### normalizeModelCatalogProviderRows

```typescript
function normalizeModelCatalogProviderRows(params: {
  provider: string;
  providerCatalog: ModelCatalogProvider;
  source: ModelCatalogSource;
}): NormalizedModelCatalogRow[]
```

- **功能**：将单个提供商的目录数据转换为扁平化的行列表
- **返回**：`NormalizedModelCatalogRow[]`，按 provider 和 id 排序
- **关键处理**：
  - 构建 `ref` 和 `mergeKey`
  - 填充默认值（input=["text"]，status="available"，reasoning=false）
  - 合并提供商级别和模型级别的 api/baseUrl/headers

### normalizeModelCatalogRows

```typescript
function normalizeModelCatalogRows(params: {
  providers: Record<string, ModelCatalogProvider>;
  source: ModelCatalogSource;
}): NormalizedModelCatalogRow[]
```

- **功能**：批量规范化多个提供商的目录行
- **实现**：遍历所有提供商，对每个调用 `normalizeModelCatalogProviderRows()`，最后合并排序

## 三、权威合并函数（authority.ts）

### mergeModelCatalogRowsByAuthority

```typescript
function mergeModelCatalogRowsByAuthority(
  rows: Iterable<NormalizedModelCatalogRow>
): NormalizedModelCatalogRow[]
```

- **功能**：按权威来源等级合并重复的模型行
- **权威等级**：config(0) > manifest(1) > cache/runtime-refresh(2) > provider-index(3)
- **合并逻辑**：使用 `mergeKey` 识别同一模型，保留来源优先级最高的条目
- **返回**：去重后的模型行列表，按 provider 和 id 排序

## 四、规划器函数

### planManifestModelCatalogRows（manifest-planner.ts）

```typescript
function planManifestModelCatalogRows(params: {
  manifest: PluginManifest;
  pluginId: string;
}): NormalizedModelCatalogRow[]
```

- **功能**：从插件 manifest JSON 中提取模型目录数据
- **来源标记**：`source: "manifest"`

### planManifestModelCatalogSuppressions（manifest-planner.ts）

```typescript
function planManifestModelCatalogSuppressions(params: {
  manifest: PluginManifest;
  pluginId: string;
}): ManifestModelCatalogSuppressionEntry[]
```

- **功能**：从 manifest 中提取模型抑制规则
- **用途**：在特定条件下隐藏某些模型（如某些 baseUrl 下不兼容的模型）

### planProviderIndexModelCatalogRows（provider-index-planner.ts）

```typescript
function planProviderIndexModelCatalogRows(params: {
  index: OpenClawProviderIndex;
}): NormalizedModelCatalogRow[]
```

- **功能**：从内置 Provider 索引中提取模型目录数据
- **来源标记**：`source: "provider-index"`

## 五、Provider 索引加载（provider-index/）

### loadOpenClawProviderIndex

```typescript
function loadOpenClawProviderIndex(): OpenClawProviderIndex
```

- **功能**：加载 OpenClaw 内置的 Provider 索引
- **数据来源**：`provider-index/openclaw-provider-index.ts` 中硬编码的索引数据
- **包含**：未安装插件的提供商的模型预览信息

## 六、核心类型（types.ts）

### 枚举类型

| 类型 | 值 | 说明 |
|------|-----|------|
| `ModelCatalogInput` | `"text" \| "image" \| "document"` | 模型支持的输入类型 |
| `ModelCatalogDiscovery` | `"static" \| "refreshable" \| "runtime"` | 模型发现模式 |
| `ModelCatalogStatus` | `"available" \| "preview" \| "deprecated" \| "disabled"` | 模型可用状态 |
| `ModelCatalogSource` | `"manifest" \| "provider-index" \| "cache" \| "config" \| "runtime-refresh"` | 数据来源 |
| `UnifiedModelCatalogKind` | `"text" \| "image_generation" \| "video_generation" \| "music_generation"` | 统一目录的模型类型 |

### 数据结构

| 类型 | 说明 |
|------|------|
| `ModelCatalogModel` | 单个模型的完整描述（20+ 字段） |
| `ModelCatalogProvider` | 提供商及其模型列表 |
| `ModelCatalogAlias` | 提供商别名映射 |
| `ModelCatalogSuppression` | 模型抑制规则 |
| `ModelCatalog` | 顶层目录结构 |
| `ModelCatalogCost` | 定价信息（支持分层定价） |
| `ModelCatalogTieredCost` | 分层定价结构 |
| `NormalizedModelCatalogRow` | 规范化后的模型行（所有字段已填充默认值） |
| `UnifiedModelCatalogEntry` | 统一目录条目（跨所有模型类型） |

## 七、使用场景示例

### 场景 1：Gateway 启动时构建模型目录

```typescript
import {
  planManifestModelCatalogRows,
  planProviderIndexModelCatalogRows,
  normalizeModelCatalogRows,
  mergeModelCatalogRowsByAuthority,
} from "../model-catalog/index.js";

// 1. 从各来源提取
const manifestRows = planManifestModelCatalogRows({ manifest, pluginId });
const indexRows = planProviderIndexModelCatalogRows({ index });

// 2. 规范化配置来源
const configRows = normalizeModelCatalogRows({ providers: configProviders, source: "config" });

// 3. 合并（config 优先级最高）
const merged = mergeModelCatalogRowsByAuthority([
  ...configRows,
  ...manifestRows,
  ...indexRows,
]);
```

### 场景 2：Agent 查询模型信息

```typescript
import { buildModelCatalogRef } from "../model-catalog/index.js";

const ref = buildModelCatalogRef("anthropic", "claude-opus-4-7");
// ref = "anthropic/claude-opus-4-7"

const model = mergedRows.find(row => row.ref === ref);
if (model) {
  console.log(`Context window: ${model.contextWindow}`);
  console.log(`Supports reasoning: ${model.reasoning}`);
  console.log(`Cost: $${model.cost?.input}/M input tokens`);
}
```

### 场景 3：UI 展示模型列表

```typescript
// 使用 UnifiedModelCatalogEntry 展示
const entries: UnifiedModelCatalogEntry[] = mergedRows.map(row => ({
  kind: "text",
  provider: row.provider,
  model: row.id,
  label: row.name,
  source: row.source,
  capabilities: {
    contextWindow: row.contextWindow,
    reasoning: row.reasoning,
    input: row.input,
  },
}));
```
