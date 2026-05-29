# web-fetch — 能力清单与对外接口

## runtime.ts

### resolveWebFetchEnabled

```typescript
function resolveWebFetchEnabled(params: {
  fetch?: WebFetchConfig;
  sandboxed?: boolean;
}): boolean
```

- **功能**：判断 web_fetch 工具是否启用

### resolveWebFetchDefinition

```typescript
function resolveWebFetchDefinition(params: ResolveWebFetchDefinitionParams):
  | { enabled: true; provider: WebFetchProviderEntry; toolDef: WebFetchProviderToolDefinition }
  | { enabled: false }
```

- **功能**：解析 web_fetch 工具定义和使用的 Provider

### ResolveWebFetchDefinitionParams

```typescript
type ResolveWebFetchDefinitionParams = {
  config?: OpenClawConfig;
  sandboxed?: boolean;
  runtimeWebFetch?: RuntimeWebFetchMetadata;
  providerId?: string;
  preferRuntimeProviders?: boolean;
};
```

### resolveWebFetchToolDefinition

```typescript
function resolveWebFetchToolDefinition(params: {
  config?: OpenClawConfig;
  sandboxed?: boolean;
}): WebFetchProviderToolDefinition | null
```

- **功能**：生成 web_fetch 工具定义（包含描述和参数 schema）

## content-extractors.runtime.ts

### extractReadableContent

```typescript
async function extractReadableContent(params: {
  html: string;
  url: string;
  extractMode: WebContentExtractMode;
  config?: OpenClawConfig;
}): Promise<(WebContentExtractionResult & { extractor: string }) | null>
```

- **功能**：将 HTML 提取为可读文本
- **返回**：`{ text, title, extractor }` 或 `null`
- **策略**：依次尝试所有提取器，第一个成功即返回

### WebContentExtractMode

```typescript
type WebContentExtractMode = "markdown" | "text";
```

### WebContentExtractionResult

```typescript
type WebContentExtractionResult = {
  text: string;
  title?: string;
};
```
