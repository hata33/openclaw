# logging — 策略、配置与边界情况

## 一、脱敏策略

### 1.1 检测模式

| 模式 | 示例 | 脱敏结果 |
|------|------|----------|
| OpenAI Key | `sk-proj-abc123...` | `sk-pro...xxxx` |
| Bearer Token | `Bearer eyJhbGci...` | `Bearer ey...xxxx` |
| 密码字段 | `{ password: "secret" }` | `{ password: "***" }` |
| App Password | `abcd-efgh-ijkl-mnop` | `***` |

### 1.2 最小长度

```typescript
DEFAULT_REDACT_MIN_LENGTH = 18  // 短于 18 字符的字符串不脱敏
```

避免误脱敏短字符串。

### 1.3 保留字符

```typescript
DEFAULT_REDACT_KEEP_START = 6
DEFAULT_REDACT_KEEP_END = 4
```

## 二、性能策略

### 2.1 级别过滤

低于当前级别的日志在格式化前就被丢弃，不进行字符串拼接。

### 2.2 文件追加

使用 `appendRegularFileSync` 追加写入，避免频繁的文件打开/关闭。

### 2.3 同步写入

日志写入是同步的，确保进程崩溃时日志不丢失。

## 三、已知边界情况

### 3.1 误脱敏

包含 "token" 的非敏感文本可能被误脱敏。`BENIGN_APP_PASSWORD_WORDS` 集合排除常见误报。

### 3.2 高频日志

silly/trace 级别可能产生大量日志。生产环境应使用 info 或 warn 级别。

### 3.3 日志文件增长

日志文件持续增长，需要外部日志轮转（logrotate）管理。
