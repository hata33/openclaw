# model-catalog — 实现流程与数据流

## 模型目录的完整生命周期

模型目录的数据从多个来源产生，经过规范化、合并、规划后，最终供 Agent 查询使用。

### 整体数据流

```
数据来源                    规划阶段                  规范化阶段              合并阶段           查询阶段
─────────                  ────────                  ──────────              ────────           ────────
插件 manifest.json  ──→  planManifest         ──→                       ──→              ──→  Agent 查询
                          ModelCatalogRows           normalizeModel         mergeModel        模型能力
                                                    CatalogRows            CatalogRows       选择模型
                                                    (normalize.ts)         ByAuthority
用户 config.yaml    ──→  直接读取              ──→                       ──→  (authority.ts) ──→  Provider
                                                                            │                Runtime 调用
内置 provider-index ──→  planProviderIndex     ──→                       ──→              ──→
                          ModelCatalogRows

运行时 API 响应     ──→  runtime-refresh      ──→                       ──→
```

## 阶段一：数据规划（Planning）

### 1.1 从 Manifest 提取模型

插件的 `manifest.json` 中可以声明模型目录数据。`planManifestModelCatalogRows()` 负责提取：

```typescript
// manifest.json 中的模型目录声明
{
  "modelCatalog": {
    "providers": {
      "anthropic": {
        "models": [
          { "id": "claude-opus-4-7", "contextWindow": 200000, "reasoning": true },
          { "id": "claude-sonnet-4-6", "contextWindow": 200000 }
        ]
      }
    }
  }
}

// planManifestModelCatalogRows() 提取后返回：
// [
//   { provider: "anthropic", id: "claude-opus-4-7", source: "manifest", ... },
//   { provider: "anthropic", id: "claude-sonnet-4-6", source: "manifest", ... }
// ]
```

**函数签名**（`manifest-planner.ts`）：

```typescript
function planManifestModelCatalogRows(params: {
  manifest: PluginManifest;
  pluginId: string;
}): NormalizedModelCatalogRow[]
```

### 1.2 从 Provider 索引提取模型

OpenClaw 内置了一个 Provider 索引（`provider-index/openclaw-provider-index.ts`），包含未安装插件的提供商的模型预览数据：

```typescript
function planProviderIndexModelCatalogRows(params: {
  index: OpenClawProviderIndex;
}): NormalizedModelCatalogRow[]
```

Provider 索引的数据来源是 `openclaw-provider-index.ts`，通过 `loadOpenClawProviderIndex()` 加载。

## 阶段二：数据规范化（Normalization）

### 2.1 单个模型规范化

`normalizeModelCatalogModel()` 将原始 JSON 对象规范化为类型安全的 `ModelCatalogModel`：

```
原始数据: { "id": "gpt-5.5", "contextWindow": "1048576", "input": ["text", "image", "unknown"] }
                                    ↓
normalizeModelCatalogModel()
                                    ↓
规范化后: { id: "gpt-5.5", contextWindow: 1048576, input: ["text", "image"] }
```

**规范化规则：**

| 字段 | 规则 |
|------|------|
| `id` | 必需，字符串，不能为空 |
| `contextWindow` | 必须是正数（`normalizePositiveNumber`） |
| `contextTokens` | 必须是正整数（`normalizePositiveInteger`） |
| `input` | 只保留 "text"/"image"/"document"，过滤其他值 |
| `status` | 只允许 "available"/"preview"/"deprecated"/"disabled" |
| `cost` | 非负数，支持分层定价 |
| `compat` | 布尔字段只接受 boolean，字符串字段只接受已知值 |
| `headers` | 经过 `isBlockedObjectKey` 过滤，防止原型污染 |

### 2.2 提供商级别规范化

`normalizeModelCatalogProvider()` 规范化一个提供商及其所有模型：

```typescript
function normalizeModelCatalogProvider(value: unknown): ModelCatalogProvider | undefined
```

处理流程：
1. 检查输入是否为 Record
2. 提取 `models` 数组，逐个调用 `normalizeModelCatalogModel()`
3. 过滤无效模型（`id` 为空的会被丢弃）
4. 如果没有有效模型，返回 `undefined`
5. 提取提供商级别的 `baseUrl`、`api`、`headers`

### 2.3 提供商列表规范化

`normalizeModelCatalogProviders()` 规范化所有提供商：

```typescript
function normalizeModelCatalogProviders(
  value: unknown,
  ownedProviders: ReadonlySet<string>,  // 已声明的提供商 ID 集合
): Record<string, ModelCatalogProvider> | undefined
```

**关键安全机制：`ownedProviders`**

只处理 `ownedProviders` 集合中的提供商。这防止了通过目录数据注入未知提供商：

```typescript
const providerId = normalizeModelCatalogProviderId(rawProviderId);
if (!providerId || !ownedProviders.has(providerId)) {
  continue;  // 跳过未声明的提供商
}
```

### 2.4 完整目录规范化

`normalizeModelCatalog()` 是顶层规范化入口：

```typescript
function normalizeModelCatalog(
  value: unknown,
  params: { ownedProviders: ReadonlySet<string> }
): ModelCatalog | undefined
```

依次处理：
1. `providers` → `normalizeModelCatalogProviders()`
2. `aliases` → `normalizeModelCatalogAliases()`
3. `suppressions` → `normalizeModelCatalogSuppressions()`
4. `discovery` → `normalizeModelCatalogDiscovery()`
5. `runtimeAugment` → 布尔值检查

### 2.5 行级规范化

`normalizeModelCatalogProviderRows()` 将提供商目录转换为扁平化的行列表：

```typescript
function normalizeModelCatalogProviderRows(params: {
  provider: string;
  providerCatalog: ModelCatalogProvider;
  source: ModelCatalogSource;
}): NormalizedModelCatalogRow[]
```

**关键处理：**
- 构建 `ref`（`provider/modelId`）
- 构建 `mergeKey`（`provider::modelId`，全小写）
- 填充默认值：`input` 默认 `["text"]`，`status` 默认 `"available"`，`reasoning` 默认 `false`
- 合并提供商级别和模型级别的 `api`/`baseUrl`/`headers`（模型级别覆盖提供商级别）
- 结果按 `provider` 和 `id` 排序

## 阶段三：权威来源合并（Authority Merge）

当同一模型来自多个来源时，`mergeModelCatalogRowsByAuthority()` 按优先级合并：

```
来自 manifest:  { provider: "openai", id: "gpt-5.5", source: "manifest", contextWindow: 200000 }
来自 config:    { provider: "openai", id: "gpt-5.5", source: "config",   contextWindow: 1048576 }
来自 provider-index: { provider: "openai", id: "gpt-5.5", source: "provider-index", contextWindow: 200000 }
                                    ↓
mergeModelCatalogRowsByAuthority()
                                    ↓
合并结果:       { provider: "openai", id: "gpt-5.5", source: "config", contextWindow: 1048576 }
                ↑ config 优先级最高（0），所以保留 config 的数据
```

**合并逻辑：**

```typescript
function mergeModelCatalogRowsByAuthority(
  rows: Iterable<NormalizedModelCatalogRow>
): NormalizedModelCatalogRow[] {
  const byMergeKey = new Map<string, NormalizedModelCatalogRow>();
  for (const row of rows) {
    const existing = byMergeKey.get(row.mergeKey);
    if (!existing || compareModelCatalogSourceAuthority(row.source, existing.source) < 0) {
      byMergeKey.set(row.mergeKey, row);  // 保留优先级更高的
    }
  }
  return [...byMergeKey.values()].toSorted(...);
}
```

## 阶段四：查询与使用

### 4.1 模型查询流程

```
Agent 需要使用 "openai/gpt-5.5"
  → 构建 ref: "openai/gpt-5.5"
  → 在合并后的模型目录中查找
  → 找到 → 获取模型的完整信息（contextWindow、cost、compat 等）
  → 未找到 → 尝试前向兼容（模板克隆）
```

### 4.2 统一模型目录条目（Unified Model Catalog Entry）

对外暴露的标准化数据结构：

```typescript
type UnifiedModelCatalogEntry<TCapabilities = unknown> = {
  kind: "text" | "image_generation" | "video_generation" | "music_generation";
  provider: string;
  model: string;
  label?: string;
  source: UnifiedModelCatalogSource;
  default?: boolean;
  configured?: boolean;
  capabilities?: TCapabilities;
  modes?: readonly string[];
  authEnvVars?: readonly string[];
  docsPath?: string;
  fetchedAt?: number;
  expiresAt?: number;
  warnings?: readonly string[];
};
```

这个结构跨越所有模型类型（文本/图像/视频/音乐），用于 UI 展示和模型选择。

## 关键函数调用链

```
Gateway 启动
  → 加载插件 manifest
  → planManifestModelCatalogRows()          ← 从 manifest 提取
  → planProviderIndexModelCatalogRows()     ← 从 provider-index 提取
  → normalizeModelCatalogRows()             ← 规范化所有行
  → mergeModelCatalogRowsByAuthority()      ← 按权威等级合并
  → 存入内存中的模型目录索引

Agent 收到用户消息
  → 查询模型目录（通过 ref 或 mergeKey）
  → 获取模型信息（contextWindow、compat 等）
  → 构建 LLM 请求参数
  → 调用 Provider Runtime
```
