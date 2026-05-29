# shared — 关键 API

## 类型强转

```typescript
function normalizeOptionalString(value: unknown): string | undefined
function normalizeOptionalLowercaseString(value: unknown): string | undefined
function normalizeLowercaseStringOrEmpty(value: unknown): string
function asFiniteNumber(value: unknown, fallback: number): number
function asOptionalRecord(value: unknown): Record<string, unknown> | undefined
```

## 全局单例

```typescript
function resolveGlobalSingleton<T>(key: string, factory: () => T): T
```

## 文本处理

```typescript
function stripMarkdown(text: string): string
function extractCodeRegions(text: string): CodeRegion[]
function splitTextChunks(text: string, maxTokens: number): string[]
```

## 网络

```typescript
function isPrivateIp(ip: string): boolean
function redactSensitiveUrl(url: string): string
```

## PID

```typescript
function isPidAlive(pid: number): boolean
```
