# provider-runtime — 策略、配置与边界情况

## 一、重试策略

### 1.1 默认配置

```typescript
DEFAULT_TRANSIENT_PROVIDER_RETRY_OPTIONS = {
  attempts: 2,        // 最多 2 次尝试（1 次原始 + 1 次重试）
  baseDelayMs: 250,   // 基础延迟 250ms
  maxDelayMs: 1_000,  // 最大延迟 1s
};
```

退避序列：`250ms → 500ms → 1000ms → 1000ms → ...`

### 1.2 阶段默认策略

| 阶段 | 默认重试 | 原因 |
|------|----------|------|
| `read` | ✅ | 读操作幂等，安全重试 |
| `poll` | ✅ | 轮询本身就是重复性的 |
| `download` | ✅ | 下载失败通常是网络问题 |
| `create` | ❌ | 创建不幂等，避免重复资源 |

### 1.3 用户覆盖

用户可以通过 `retry` 参数覆盖阶段默认配置：

```typescript
// create 阶段也启用重试（如果知道操作是幂等的）
retry: { attempts: 3 }

// read 阶段禁用重试
retry: false
```

### 1.4 自定义重试判断

```typescript
retry: {
  attempts: 5,
  shouldRetry: (params) => {
    // 只在特定 Provider 和特定错误下重试
    return params.provider === "openai" && params.attemptNumber < 3;
  },
}
```

## 二、瞬态错误分类策略

### 2.1 错误检测的多层策略

系统按以下优先级检测错误类型：

```
1. HTTP Status Code（最可靠）
   → 从 error.status / statusCode / code 提取
   → 500/502/503/504 → 瞬态
   → 其他状态码 → 继续检查

2. 消息中的 4xx 模式（快速排除）
   → "HTTP 400/401/403/404" → 永久错误
   → "invalid api key" / "permission denied" → 永久错误
   → "model not found" / "validation" → 永久错误

3. 消息中的 5xx 模式
   → "HTTP 500/502/503/504" → 瞬态

4. 网络信号检测
   → ECONNRESET / ECONNREFUSED / ETIMEDOUT / EAI_AGAIN
   → 递归检查 error.cause（最多一层）

5. 超时信号检测
   → error.name === "TimeoutError" / "RequestTimeoutError"
   → message 包含 "timeout" / "timed out"
   → 递归检查 error.cause

6. Fetch Failed 特殊处理
   → "fetch failed" 需要配合网络信号才判定为瞬态

7. 默认
   → 不重试（保守策略）
```

### 2.2 递归 Cause 检查

```typescript
function hasTransientNetworkSignal(error: unknown, message: string): boolean {
  // ... 检查 error 本身 ...
  
  // 递归检查 error.cause
  const cause = readErrorCause(error);
  if (!cause || cause === error) return false;
  // 检查 cause 的 code 和 message
}
```

只递归一层（cause 不再检查 cause），避免无限递归。

### 2.3 状态码的多源提取

```typescript
function readErrorStatus(error: unknown): number | undefined {
  // 尝试多个属性名
  for (const value of [record.status, record.statusCode, record.code]) {
    // 数字类型
    if (typeof value === "number" && Number.isInteger(value)) return value;
    // 字符串类型（"500" → 500）
    if (typeof value === "string" && /^\d{3}$/.test(value.trim())) return Number(value.trim());
  }
  return undefined;
}
```

兼容不同 Provider 的错误格式差异。

## 三、安全策略

### 3.1 创建操作不重试

`create` 阶段默认不重试，因为创建操作通常不幂等：

```
重试可能导致：
- 创建两个相同的 Assistant
- 发送两条相同的消息
- 创建两个相同的 Fine-tuning Job
```

如果用户确信操作幂等（如 idempotency-key），可以手动启用重试。

### 3.2 延迟上限

`maxDelayMs` 确保退避不会无限增长：

```
baseDelay=250, maxDelay=1000:
  250 → 500 → 1000 → 1000 → 1000（封顶）
```

### 3.3 尝试次数下限

`resolveTransientProviderAttempts()` 确保至少 1 次尝试：

```typescript
return Math.max(1, Math.round(options.attempts));
```

### 3.4 AbortSignal 检查

在两个关键点检查中止信号：

1. `shouldRetrySameKeyProviderOperation()` — 判断是否重试时
2. `sleep()` — 等待期间

确保用户取消操作后不会继续重试。

## 四、测试策略

### 4.1 可注入的 sleep 函数

```typescript
sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
```

测试中注入自定义 sleep：

```typescript
const retries: number[] = [];
await executeProviderOperationWithRetry({
  provider: "test",
  stage: "read",
  operation: () => { throw new Error("HTTP 500"); },
  retry: {
    attempts: 3,
    sleep: (ms) => { retries.push(ms); return Promise.resolve(); },
  },
});
// retries = [250, 500]
```

### 4.2 可注入的 shouldRetry

```typescript
shouldRetry?: (params: TransientProviderRetryParams) => boolean;
```

测试中精确控制重试行为：

```typescript
retry: {
  attempts: 10,
  shouldRetry: (params) => params.attemptNumber < 2,  // 只重试 1 次
}
```

## 五、已知边界情况

### 5.1 fetch failed 但无网络信号

```typescript
if (/\bfetch failed\b/i.test(message)) {
  return hasTransientNetworkSignal(error, message);  // 只有伴随网络信号才重试
}
```

`fetch failed` 可能由 DNS 污染、代理错误等引起，需要额外信号确认。

### 5.2 状态码为字符串

某些错误对象的 `code` 属性是字符串 `"500"` 而非数字 `500`，`readErrorStatus()` 同时处理两种格式。

### 5.3 cause 循环引用

```typescript
if (!cause || cause === error) return false;  // 防止循环引用
```

### 5.4 NaN/Infinity 尝试次数

```typescript
return Math.max(1, Math.round(Number.isFinite(options.attempts) ? options.attempts : 1));
```

`NaN` 和 `Infinity` 被安全处理为 1。

### 5.5 baseDelay > maxDelay

```typescript
const maxDelayMs = Math.max(baseDelayMs, ...);  // 确保 max >= base
```

如果用户配置了 `baseDelayMs: 2000, maxDelayMs: 500`，实际 maxDelayMs = 2000。
