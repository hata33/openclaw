# model-catalog — 策略、配置与边界情况

## 一、规范化策略

### 1.1 默认值填充策略

当模型数据缺失某些字段时，系统按以下规则填充默认值：

| 字段 | 默认值 | 设计理由 |
|------|--------|----------|
| `input` | `["text"]` | 绝大多数模型只支持文本输入 |
| `status` | `"available"` | 未声明状态的模型默认可用 |
| `reasoning` | `false` | 未声明推理能力的模型默认不支持 |
| `name` | 等于 `id` | 未设置显示名称时使用模型 ID |

### 1.2 字段合并策略

提供商级别和模型级别的配置需要合并。合并规则是**模型级别覆盖提供商级别**：

```typescript
// 提供商级别：所有模型共享的默认值
const providerApi = normalizeModelCatalogApi(providerCatalog.api);
const providerBaseUrl = normalizeOptionalString(providerCatalog.baseUrl);
const providerHeaders = normalizeStringMap(providerCatalog.headers);

// 模型级别：单个模型的特定值（覆盖提供商级别）
const api = normalizeModelCatalogApi(model.api) ?? providerApi;
const baseUrl = normalizeOptionalString(model.baseUrl) ?? providerBaseUrl;
const headers = mergeStringMaps(providerHeaders, normalizeStringMap(model.headers));
```

**示例**：

```yaml
# 提供商级别
providers:
  openai:
    baseUrl: "https://api.openai.com/v1"
    api: "openai-chat"
    models:
      - id: "gpt-5.5"
      - id: "gpt-5.5-codex"
        baseUrl: "https://codex.openai.com/v1"  # 覆盖提供商级别
```

结果：
- `gpt-5.5` → `baseUrl: "https://api.openai.com/v1"`（使用提供商级别）
- `gpt-5.5-codex` → `baseUrl: "https://codex.openai.com/v1"`（模型级别覆盖）

### 1.3 大小写规范化策略

- **Provider ID**：统一转为小写（`"DeepSeek"` → `"deepseek"`）
- **mergeKey**：Provider 和 modelId 都转为小写（`"openai::GPT-5.5"` → `"openai::gpt-5.5"`）
- **ref**：Provider 转为小写，modelId 保持原样（`"openai/gpt-5.5"`）

为什么 ref 不把 modelId 也转为小写？因为某些模型的大小写有意义（如 `gpt-5.5-mini` vs `GPT-5.5-MINI` 可能是不同模型）。

### 1.4 输入类型过滤策略

只保留已知的输入类型，过滤未知值：

```typescript
const MODEL_CATALOG_INPUTS = new Set(["text", "image", "document"]);

function normalizeModelCatalogInputs(value: unknown): ModelCatalogInput[] | undefined {
  const inputs = normalizeTrimmedStringList(value).filter(
    (input): input is ModelCatalogInput => MODEL_CATALOG_INPUTS.has(input),
  );
  return inputs.length > 0 ? inputs : undefined;
}
```

**边界情况**：如果输入是 `["text", "image", "video"]`，结果是 `["text", "image"]`（`"video"` 被过滤）。

## 二、安全策略

### 2.1 原型污染防护

所有 Record 类型的 key 都经过 `isBlockedObjectKey` 检查：

```typescript
function normalizeSafeRecordKey(value: unknown): string {
  const key = normalizeOptionalString(value) ?? "";
  return key && !isBlockedObjectKey(key) ? key : "";
}
```

被阻止的 key 包括：`__proto__`、`constructor`、`prototype`、`toString`、`valueOf` 等。

**为什么重要？** 如果不检查，攻击者可以通过模型目录数据注入恶意属性：

```json
{
  "providers": {
    "__proto__": { "isAdmin": true }
  }
}
```

### 2.2 Owned Providers 限制

只有在 `ownedProviders` 集合中的 Provider 才会被处理：

```typescript
const providerId = normalizeModelCatalogProviderId(rawProviderId);
if (!providerId || !ownedProviders.has(providerId)) {
  continue;  // 跳过未声明的 Provider
}
```

**为什么重要？** 防止通过目录数据注入未知 Provider。`ownedProviders` 由已安装的插件列表决定。

### 2.3 类型严格校验

所有数值字段都经过严格校验：

```typescript
// 非负数（价格、token 数等不能为负）
function normalizeNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

// 正数（上下文窗口必须大于 0）
function normalizePositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

// 正整数（token 数必须是整数）
function normalizePositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}
```

## 三、权威合并策略

### 3.1 来源权威等级

```typescript
const MODEL_CATALOG_SOURCE_AUTHORITY = {
  config: 0,            // 用户手动配置，最高优先级
  manifest: 1,          // 插件官方定义
  cache: 2,             // 缓存数据
  "runtime-refresh": 2, // 运行时刷新（与缓存同级）
  "provider-index": 3,  // 未安装插件的预览数据，最低优先级
};
```

### 3.2 为什么这样设计？

1. **用户配置最优先**：用户可能手动修改了模型参数（如自定义 baseUrl），必须尊重
2. **Manifest 次之**：已安装插件的官方定义比未安装的预览数据更可靠
3. **缓存和运行时刷新同级**：两者都可能是过期数据
4. **Provider 索引最低**：这只是预览数据，当插件安装后会被 manifest 数据覆盖

### 3.3 合并是替换而非合并字段

当同一模型有多条记录时，系统保留优先级最高的那条，**不是逐字段合并**：

```
manifest:  { id: "gpt-5.5", contextWindow: 200000, cost: { input: 2.5 } }
config:    { id: "gpt-5.5", contextWindow: 1048576 }
```

结果：`{ id: "gpt-5.5", contextWindow: 1048576 }`（config 的整条记录替换 manifest 的，`cost` 字段丢失）

**这是一个已知的设计权衡**：逐字段合并更精确，但实现复杂且可能引入不一致。整条替换更简单、更可预测。

## 四、错误处理策略

### 4.1 无效输入静默忽略

所有规范化函数对无效输入采用**静默忽略**策略，不抛出异常：

```typescript
function normalizeModelCatalogModel(value: unknown): ModelCatalogModel | undefined {
  if (!isRecord(value)) {
    return undefined;  // 不是对象 → 返回 undefined
  }
  const id = normalizeOptionalString(value.id) ?? "";
  if (!id) {
    return undefined;  // 没有有效 ID → 返回 undefined
  }
  // ...
}
```

**为什么？** 模型目录数据来自外部（manifest JSON、用户配置），不应该因为一条无效数据导致整个系统崩溃。

### 4.2 空结果返回 undefined

当规范化结果为空时，返回 `undefined` 而非空对象：

```typescript
const catalog = {
  ...(providers ? { providers } : {}),
  ...(aliases ? { aliases } : {}),
  // ...
};
return Object.keys(catalog).length > 0 ? catalog : undefined;
```

### 4.3 列表空结果返回空数组

列表类型的规范化函数在没有有效数据时返回空数组：

```typescript
if (models.length === 0) {
  return undefined;  // 提供商没有有效模型 → 整个提供商被丢弃
}
```

## 五、性能策略

### 5.1 排序稳定化

所有输出列表都按 `provider` 和 `id` 排序，确保：
- 相同输入总是产生相同输出（可预测性）
- 便于二分查找（性能）
- UI 展示顺序稳定（用户体验）

```typescript
.toSorted((a, b) => a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id))
```

### 5.2 Set 用于成员检查

使用 `Set` 进行 O(1) 的成员检查：

```typescript
const MODEL_CATALOG_INPUTS = new Set(["text", "image", "document"]);
const MODEL_CATALOG_STATUSES = new Set(["available", "preview", "deprecated", "disabled"]);
```

### 5.3 惰性计算

只在需要时计算可选字段：

```typescript
// 使用条件展开，只在值存在时才添加到结果中
return {
  id,
  ...(name ? { name } : {}),
  ...(api ? { api } : {}),
  // ...
};
```

## 六、已知边界情况

### 6.1 分层定价（Tiered Pricing）

分层定价的 `range` 字段支持 1 或 2 个元素：

```typescript
range: [number]           // 只有下限
range: [number, number]   // 下限和上限
```

如果 range 的元素数量不在 1-2 之间，该条分层定价会被跳过。

### 6.2 兼容性配置（Compat）的未知字段

`normalizeModelCatalogCompat()` 只处理已知的布尔/字符串/字符串列表字段，未知字段会被静默忽略。这意味着：
- 新增兼容性字段需要更新规范化函数
- 旧版本 OpenClaw 会忽略新版本新增的 compat 字段

### 6.3 提供商别名循环

别名系统不检测循环引用。如果 A → B → A，会导致无限循环。这是已知的边界情况，由上游（manifest 验证）保证不出现。

### 6.4 空模型列表的提供商

如果一个提供商的所有模型都被过滤（如 ID 全部无效），整个提供商会返回 `undefined`，不会出现在最终目录中。
