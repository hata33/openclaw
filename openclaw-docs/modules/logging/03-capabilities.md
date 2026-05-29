# logging — 能力清单与对外接口

## 日志函数（logger.ts）

```typescript
function logInfo(message: string, ...args: unknown[]): void
function logDebug(message: string, ...args: unknown[]): void
function logWarn(message: string, ...args: unknown[]): void
function logError(message: string, ...args: unknown[]): void
function logFatal(message: string, ...args: unknown[]): void

// 条件日志
function shouldLogDebug(): boolean
function shouldLogVerbose(): boolean

// 子日志器
function getChildLogger(moduleName: string): Logger
```

## 脱敏（redact.ts）

```typescript
function redactSecrets(input: string, config?: LoggingConfig): string
function redactSensitiveText(text: string, mode?: RedactSensitiveMode): string
```

## 日志级别（levels.ts）

```typescript
type LogLevel = "silly" | "trace" | "debug" | "info" | "warn" | "error" | "fatal";

function normalizeLogLevel(value: unknown): LogLevel
function levelToMinLevel(level: LogLevel): number
```

## 配置（config.ts）

```typescript
function readLoggingConfig(cfg: OpenClawConfig): LoggingConfig
function shouldSkipMutatingLoggingConfigRead(): boolean
```
