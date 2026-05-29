# utils — API

```typescript
// 并发
function runWithConcurrency<T>(tasks: (() => Promise<T>)[], options: { concurrency: number }): Promise<T[]>

// 超时
function withTimeout<T>(promise: Promise<T>, ms: number, label?: string): Promise<T>

// API Key
function maskApiKey(key: string): string

// CJK
function containsCjkChars(text: string): boolean

// JSON
function safeJsonParse(text: string, fallback?: unknown): unknown

// 消息渠道
function normalizeMessageChannelId(id: string): NormalizedChannelId

// 分块
function chunkItems<T>(items: T[], size: number): T[][]
```
