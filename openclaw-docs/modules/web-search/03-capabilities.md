# web-search — 能力清单与对外接口

## runtime-types.ts

### 类型定义

```typescript
type ResolveWebSearchDefinitionParams = {
  config?: OpenClawConfig;
  agentDir?: string;
  sandboxed?: boolean;
  runtimeWebSearch?: RuntimeWebSearchMetadata;
  providerId?: string;
  preferRuntimeProviders?: boolean;
  preferInputConfig?: boolean;
};

type RunWebSearchParams = ResolveWebSearchDefinitionParams & {
  args: Record<string, unknown>;
  signal?: AbortSignal;
};

type RunWebSearchResult = {
  provider: string;
  result: Record<string, unknown>;
};

type ListWebSearchProvidersParams = {
  config?: OpenClawConfig;
};
```

## runtime.ts

### resolveWebSearchEnabled

```typescript
function resolveWebSearchEnabled(params: {
  search?: WebSearchConfig;
  sandboxed?: boolean;
}): boolean
```

- **功能**：判断 web_search 工具是否启用
- **默认**：启用（除非显式配置 `enabled: false`）

### resolveWebSearchDefinition

```typescript
function resolveWebSearchDefinition(
  params: ResolveWebSearchDefinitionParams
): { enabled: true; provider: ...; toolDef: ... } | { enabled: false }
```

- **功能**：解析搜索定义，选择可用的 Provider

### resolveWebSearchToolDefinition

```typescript
function resolveWebSearchToolDefinition(params: {
  config?: OpenClawConfig;
  sandboxed?: boolean;
}): WebSearchProviderToolDefinition | null
```

- **功能**：生成 web_search 工具定义

### runWebSearch

```typescript
function runWebSearch(params: RunWebSearchParams): Promise<RunWebSearchResult>
```

- **功能**：执行搜索操作
- **参数**：搜索参数 + Provider 选择参数
- **返回**：`{ provider, result }`

### listWebSearchProviders

```typescript
function listWebSearchProviders(
  params: ListWebSearchProvidersParams
): string[]
```

- **功能**：列出所有可用的搜索 Provider ID

### resolveWebSearchRuntimeConfig

```typescript
function resolveWebSearchRuntimeConfig(params?: {
  config?: OpenClawConfig;
  preferInputConfig?: boolean;
}): OpenClawConfig | undefined
```

- **功能**：解析搜索运行时配置
