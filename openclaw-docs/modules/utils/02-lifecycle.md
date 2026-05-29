# utils — 使用场景

## 消息渠道规范化

```
Telegram: "telegram:123456789" → { channel: "telegram", id: "123456789" }
Discord: "discord:user:987654" → { channel: "discord", id: "987654" }
```

## 并发执行

```
批量 API 调用 → runWithConcurrency(tasks, { concurrency: 3 })
→ 最多 3 个并发请求
```

## 投递上下文

消息发送时携带投递上下文（渠道、账户、目标），确保消息正确路由。
