# utils — 功能定义

## 消息渠道

统一的消息渠道抽象，将不同渠道（Telegram、Discord、WhatsApp 等）的 ID 规范化为统一格式。

## 并发控制

`run-with-concurrency.ts` 限制并发数：

```typescript
runWithConcurrency(tasks, { concurrency: 3 })
```

## 超时包装

`with-timeout.ts` 为异步操作添加超时：

```typescript
withTimeout(promise, 30000, "operation timeout")
```

## API Key 脱敏

`mask-api-key.ts` 将 API Key 脱敏：

```
sk-1234567890abcdef → sk-1234...cdef
```

## CJK 字符

`cjk-chars.ts` 检测中日韩文字，用于 Token 计算优化。

## JSON 安全

`safe-json.ts` 安全解析 JSON，处理异常和截断。
