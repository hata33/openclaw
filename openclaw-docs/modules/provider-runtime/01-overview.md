# provider-runtime — 功能定义与设计思想

## 这个模块解决什么问题？

与外部 AI Provider 交互时，网络波动和服务暂时不可用是常见问题。手动重试既繁琐又容易出错。

provider-runtime 解决的核心问题：

1. **自动重试** — 对瞬态错误自动重试，无需上层代码处理
2. **智能判断** — 只重试值得重试的错误（5xx、网络超时），不重试客户端错误（4xx）
3. **阶段感知** — 不同操作阶段有不同的重试策略
4. **可中止** — 通过 AbortSignal 支持取消等待中的重试

## 设计思想

### 1. 指数退避（Exponential Backoff）

每次重试的延迟按 2^n 增长，避免在服务恢复期间造成请求风暴：

```
第1次重试: 250ms
第2次重试: 500ms
第3次重试: 1000ms
第4次重试: 1000ms（达到上限）
```

### 2. 阶段感知（Stage-Aware）

不同操作阶段有不同特性：

- **read** — 读取操作是幂等的，可以安全重试
- **poll** — 轮询操作本身就是重复性的，重试无害
- **download** — 下载失败通常是网络问题，值得重试
- **create** — 创建操作不幂等！重试可能导致重复创建资源，默认不重试

### 3. 错误分类（Error Classification）

系统将错误分为两类：

**瞬态错误（Transient）** — 可重试：
- HTTP 5xx：服务端错误
- 网络错误：ECONNRESET、ECONNREFUSED、ETIMEDOUT
- DNS 错误：EAI_AGAIN
- 超时：TimeoutError、RequestTimeoutError

**永久错误（Permanent）** — 不重试：
- HTTP 4xx：客户端错误（参数错误、认证失败）
- 认证错误：invalid api key、permission denied
- 资源不存在：model not found
- 参数校验：validation error

### 4. 可配置（Configurable）

重试行为可以通过多种方式配置：

```typescript
// 简单模式
retry: true   // 使用默认选项

// 完全自定义
retry: {
  attempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  signal: abortController.signal,
  shouldRetry: (params) => customLogic(params),
}
```

### 5. 可中止（Abortable）

通过 `AbortSignal` 支持在等待期间取消重试：

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 10000);  // 10秒后取消

await executeProviderOperationWithRetry({
  provider: "openai",
  stage: "read",
  operation: () => fetchModels(),
  retry: { signal: controller.signal },
});
```

## 错误检测的多层策略

系统使用多种方式检测错误类型：

```
1. HTTP Status 检查
   → error.status / error.statusCode / error.code
   → 500/502/503/504 → 瞬态

2. 网络信号检测
   → error.code 包含 ECONNRESET 等
   → error.cause 递归检查

3. 超时信号检测
   → error.name === "TimeoutError"
   → message 包含 "timed out"

4. 消息模式匹配
   → 正则匹配 "HTTP 500"、"fetch failed" 等
```

这种多层检测确保即使在错误对象格式不一致的情况下，也能正确判断错误类型。
