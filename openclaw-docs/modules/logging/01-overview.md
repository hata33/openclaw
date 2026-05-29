# logging — 功能定义与设计思想

## 这个模块解决什么问题？

AI 助手在日志中会接触大量敏感信息：API Key、用户消息、OAuth Token。日志系统需要在不泄露敏感信息的前提下提供足够的调试信息。

核心问题：

1. **结构化日志** — 统一的日志格式，便于解析和分析
2. **自动脱敏** — 日志中的敏感信息自动替换
3. **级别控制** — 根据场景调整日志详细程度
4. **多传输** — 同时输出到文件和控制台

## 日志级别

```typescript
type LogLevel = "silly" | "trace" | "debug" | "info" | "warn" | "error" | "fatal";
```

| 级别 | 用途 |
|------|------|
| `silly` | 极度详细的内部状态 |
| `trace` | 函数调用追踪 |
| `debug` | 调试信息 |
| `info` | 正常运行信息 |
| `warn` | 警告（可恢复的问题） |
| `error` | 错误（需要关注） |
| `fatal` | 致命错误（进程退出） |

## 脱敏策略

### 结构化字段检测

```typescript
const STRUCTURED_SECRET_FIELD_RE = /(?:api_key|apiKey|token|secret|password|accessToken|refreshToken|clientSecret|...)/i;
```

匹配到这些字段名的值自动脱敏。

### 有界脱敏

```typescript
// 默认：保留前 6 后 4 字符
"sk-proj-abc123456789xyz" → "sk-pro...xyz"
```

### 支付信息

支付相关字段（cardNumber、CVC 等）完全脱敏。

### App-Specific Password

Apple 的应用专用密码格式 `xxxx-xxxx-xxxx-xxxx` 被检测并脱敏。

## 设计思想

### 1. 零配置安全

默认启用脱敏，即使没有配置也会自动处理常见的敏感模式。

### 2. 配置驱动

```yaml
logging:
  level: "info"
  redact:
    mode: "tools"    # off | tools
    minLength: 18
    keepStart: 6
    keepEnd: 4
```

### 3. 环境变量覆盖

```typescript
OPENCLAW_LOG_LEVEL=debug  → 覆盖日志级别
```

### 4. 文件日志

日志自动写入文件：

```
<state-dir>/logs/openclaw.log
```

使用 `appendRegularFileSync` 原子追加，防止并发冲突。

### 5. 诊断事件

日志事件同时发送到诊断系统，供实时监控和分析。
