# terminal — 策略

## 安全

所有用户输入通过 `sanitizeTerminalText` 过滤后再显示。

## 兼容

自动检测 `TERM`、`COLORTERM`、`NO_COLOR` 环境变量。

## 日志安全

`sanitizeForLog` 移除 ANSI 转义序列，确保日志文件可读。
