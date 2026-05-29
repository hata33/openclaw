# provider-runtime — 实现流程与数据流

## 重试执行流程

### executeProviderOperationWithRetry — 主入口

```
输入: { provider, stage, operation, retry? }
  ↓
1. 解析重试配置
   retryConfig = providerOperationRetryConfig(stage, retry)
   retryOptions = resolveTransientProviderRetryOptions(retryConfig)
   maxAttempts = resolveTransientProviderAttempts(retryOptions)

2. 执行循环（attemptNumber = 1 → maxAttempts）
   │
   ├→ try { return await operation() }
   │    成功 → 直接返回结果
   │
   └→ catch (error)
        ├→ message = formatErrorMessage(error)
        │
        ├→ shouldRetrySameKeyProviderOperation({...})
        │    ├→ attemptNumber >= maxAttempts → false（不再重试）
        │    ├→ signal.aborted → false（已取消）
        │    ├→ options.shouldRetry?.(params) → 自定义判断
        │    └→ isTransientProviderOperationError(error, message) → 默认判断
        │
        ├→ 不重试 → throw error
        │
        └→ 计算延迟并等待
             delayMs = resolveTransientProviderDelayMs(options, attemptNumber)
             await sleep(delayMs, signal)

3. 所有重试都失败 → throw lastError
```

## 瞬态错误判断流程

### isTransientProviderOperationError

```
输入: error, message
  ↓
1. 读取 HTTP Status
   → 从 error.status / statusCode / code 中提取
   → 500/502/503/504 → true（瞬态）
   │
   ↓ （status 无效）
2. 检查消息中的 4xx 模式
   → "HTTP 400/401/403/404" 或 "invalid api key" → false（永久）
   │
   ↓
3. 检查消息中的 5xx 模式
   → "HTTP 500/502/503/504" → true（瞬态）
   │
   ↓
4. 检查网络信号
   → hasTransientNetworkSignal(error, message)
     → ECONNRESET / ECONNREFUSED / ETIMEDOUT / EAI_AGAIN
     → 递归检查 error.cause
   │
   ↓
5. 检查超时信号
   → hasTimeoutSignal(error, message)
     → error.name === "TimeoutError"
     → message 包含 "timed out"
     → 递归检查 error.cause
   │
   ↓
6. 检查 fetch failed
   → "fetch failed" + hasTransientNetworkSignal → true
   │
   ↓
7. 默认 → false（不重试）
```

### 错误状态码提取

`readErrorStatus()` 从多个位置提取 HTTP 状态码：

```typescript
// 尝试从 error 对象的多个属性中读取
for (const value of [record.status, record.statusCode, record.code]) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d{3}$/.test(value.trim())) return Number(value.trim());
}
```

支持不同 Provider 的错误格式差异（有些用 `status`，有些用 `statusCode`，有些用 `code`）。

## 延迟计算

### resolveTransientProviderDelayMs

```
公式: min(maxDelay, baseDelay × 2^(attemptNumber - 1))

示例（默认参数 baseDelay=250, maxDelay=1000）:
  attempt 1: min(1000, 250 × 2^0) = min(1000, 250) = 250ms
  attempt 2: min(1000, 250 × 2^1) = min(1000, 500) = 500ms
  attempt 3: min(1000, 250 × 2^2) = min(1000, 1000) = 1000ms
  attempt 4: min(1000, 250 × 2^3) = min(1000, 2000) = 1000ms（封顶）
```

## 配置解析流程

### resolveTransientProviderRetryOptions

```
输入: boolean | TransientProviderRetryOptions | undefined
  ↓
false / undefined → undefined（不重试）
true → DEFAULT_TRANSIENT_PROVIDER_RETRY_OPTIONS（默认配置）
TransientProviderRetryOptions → 直接使用

默认配置:
  attempts: 2
  baseDelayMs: 250
  maxDelayMs: 1000
```

### providerOperationRetryConfig

```
输入: stage, options?
  ↓
1. 如果 options 有值 → 直接使用（用户覆盖）
2. 否则 → defaultTransientProviderRetryForStage(stage)
   - "create" → undefined（不重试）
   - 其他 → true（使用默认重试）
```

## 并发与中止

### AbortSignal 集成

```typescript
// 重试循环中检查中止信号
if (params.options.signal?.aborted) return false;

// 等待期间支持中止
const sleep = retryOptions.sleep ?? sleepWithAbort;
await sleep(delayMs, retryOptions.signal);
```

`sleepWithAbort` 在等待期间监听中止信号，一旦触发立即抛出 AbortError。

### 自定义 sleep 函数

```typescript
sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
```

支持注入自定义的 sleep 实现（用于测试中加速时间）。

## 数据流总结

```
调用方
  ↓ executeProviderOperationWithRetry({ provider, stage, operation })
  │
  ├→ 解析配置 → 确定最大尝试次数和退避参数
  │
  ├→ 循环执行 operation()
  │   ├→ 成功 → 返回结果
  │   └→ 失败 → 判断是否瞬态错误
  │       ├→ 永久错误 → 直接抛出
  │       └→ 瞬态错误 → 等待退避时间 → 重试
  │
  └→ 所有重试失败 → 抛出最后一个错误
```
