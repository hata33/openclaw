# provider-runtime — 能力清单与对外接口

## 公共 API

provider-runtime 模块只有一个源文件 `operation-retry.ts`，所有 API 均从此文件导出。

## 类型定义

### ProviderOperationRetryStage

```typescript
type ProviderOperationRetryStage = "read" | "poll" | "download" | "create";
```

Provider 操作阶段。不同阶段有不同的默认重试策略。

### TransientProviderRetryParams

```typescript
type TransientProviderRetryParams = {
  error: unknown;           // 捕获的错误对象
  message: string;          // 错误消息文本
  provider: string;         // Provider ID（如 "openai"）
  apiKeyIndex: number;      // API Key 索引（多 Key 轮换时使用）
  attemptNumber: number;    // 当前尝试次数（从 1 开始）
  stage?: ProviderOperationRetryStage;  // 操作阶段
};
```

传递给 `shouldRetry` 回调的上下文信息。

### TransientProviderRetryOptions

```typescript
type TransientProviderRetryOptions = {
  attempts: number;          // 总尝试次数（含首次调用）
  baseDelayMs?: number;      // 基础延迟（默认 250ms）
  maxDelayMs?: number;       // 最大延迟（默认 1000ms）
  signal?: AbortSignal;      // 中止信号
  shouldRetry?: (params: TransientProviderRetryParams) => boolean;  // 自定义重试判断
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;     // 自定义 sleep（测试用）
};
```

### TransientProviderRetryConfig

```typescript
type TransientProviderRetryConfig = boolean | TransientProviderRetryOptions;
```

简化配置类型：`true` 使用默认选项，`false`/`undefined` 不重试。

## 常量

### DEFAULT_TRANSIENT_PROVIDER_RETRY_OPTIONS

```typescript
const DEFAULT_TRANSIENT_PROVIDER_RETRY_OPTIONS = {
  attempts: 2,
  baseDelayMs: 250,
  maxDelayMs: 1_000,
} as const;
```

默认重试配置：2 次尝试，250ms 基础延迟，1 秒最大延迟。

## 核心函数

### executeProviderOperationWithRetry（主入口）

```typescript
async function executeProviderOperationWithRetry<T>(params: {
  provider: string;                              // Provider ID
  stage: ProviderOperationRetryStage;            // 操作阶段
  operation: () => Promise<T>;                   // 要执行的异步操作
  retry?: TransientProviderRetryConfig;           // 可选重试配置
}): Promise<T>
```

- **功能**：执行带有自动重试的 Provider 操作
- **返回**：操作结果
- **抛出**：如果所有重试都失败，抛出最后一个错误

### isTransientProviderOperationError

```typescript
function isTransientProviderOperationError(
  error: unknown,
  message: string,
): boolean
```

- **功能**：判断错误是否为瞬态错误（值得重试）
- **瞬态**：HTTP 5xx、网络错误（ECONNRESET 等）、超时
- **非瞬态**：HTTP 4xx、认证错误、参数错误

## 配置解析函数

### resolveTransientProviderRetryOptions

```typescript
function resolveTransientProviderRetryOptions(
  options?: TransientProviderRetryConfig,
): TransientProviderRetryOptions | undefined
```

- `false`/`undefined` → `undefined`（不重试）
- `true` → 默认选项
- `TransientProviderRetryOptions` → 直接返回

### defaultTransientProviderRetryForStage

```typescript
function defaultTransientProviderRetryForStage(
  stage: ProviderOperationRetryStage,
): TransientProviderRetryConfig | undefined
```

- `"create"` → `undefined`（不重试）
- 其他 → `true`（使用默认重试）

### providerOperationRetryConfig

```typescript
function providerOperationRetryConfig(
  stage: ProviderOperationRetryStage,
  options?: TransientProviderRetryConfig,
): TransientProviderRetryConfig | undefined
```

合并用户配置和阶段默认配置。

## 辅助函数

### resolveTransientProviderAttempts

```typescript
function resolveTransientProviderAttempts(
  options?: TransientProviderRetryOptions,
): number
```

解析实际尝试次数，至少 1 次。

### resolveTransientProviderDelayMs

```typescript
function resolveTransientProviderDelayMs(
  options: TransientProviderRetryOptions,
  attemptNumber: number,
): number
```

计算第 N 次重试的延迟时间（指数退避）。

### shouldRetrySameKeyProviderOperation

```typescript
function shouldRetrySameKeyProviderOperation(params: {
  options: TransientProviderRetryOptions;
  error: unknown;
  message: string;
  provider: string;
  apiKeyIndex: number;
  attemptNumber: number;
  maxAttempts: number;
  stage?: ProviderOperationRetryStage;
}): boolean
```

判断是否应该使用同一 API Key 重试。综合考虑尝试次数、中止信号、自定义回调和瞬态错误判断。
