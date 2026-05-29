# web-search — 功能定义与设计思想

## 这个模块解决什么问题？

Agent 需要搜索互联网获取最新信息。不同搜索服务（Brave、Google、Perplexity）有不同的 API 和结果格式。

web-search 解决的核心问题：

1. **统一接口** — 不同的搜索 Provider 通过统一接口调用
2. **自动选择** — 根据配置和凭证自动选择可用的 Provider
3. **结果格式化** — 将不同 Provider 的结果统一为标准格式

## 设计思想

### 1. Provider 分层

与 web-fetch 类似，Provider 有三个来源：

```
配置中的 Provider（web/provider-runtime-shared.ts）
  → 用户在配置中指定的搜索服务

插件 Provider（plugins/web-search-providers.runtime.ts）
  → 插件注册的搜索 Provider

运行时 Provider（secrets/runtime-web-tools-state.ts）
  → 运行时动态提供的搜索服务
```

### 2. 自动检测优先级

```typescript
sortWebSearchProvidersForAutoDetect(providers)
```

排序规则：
- 有凭证的 Provider 优先
- 插件 Provider 可覆盖内置 Provider
- 相同条件下按注册顺序

### 3. 配置选择

```typescript
function resolveWebSearchRuntimeConfig(params?) {
  // 优先使用输入配置（如果指定）
  if (params?.preferInputConfig && params.config) {
    return params.config;
  }
  // 否则使用运行时配置快照
  return selectApplicableRuntimeConfig({
    inputConfig: params?.config,
    runtimeConfig: getRuntimeConfigSnapshot(),
    runtimeSourceConfig: getRuntimeConfigSourceSnapshot(),
  });
}
```

### 4. 启用判断

```typescript
function resolveWebSearchEnabled({ search, sandboxed }) {
  if (typeof search?.enabled === "boolean") return search.enabled;
  if (sandboxed) return true;
  return true;  // 默认启用
}
```

### 5. 搜索参数

搜索支持多种参数（具体参数取决于 Provider）：

```
query: string         — 搜索查询
count?: number        — 结果数量
freshness?: string    — 时间过滤
language?: string     — 语言
country?: string      — 国家
```

### 6. 结果格式

不同 Provider 的结果被统一为：

```typescript
type RunWebSearchResult = {
  provider: string;              // 使用的 Provider ID
  result: Record<string, unknown>; // 搜索结果（标准化后）
};
```
