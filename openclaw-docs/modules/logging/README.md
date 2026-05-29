# logging — 日志系统

> 负责 OpenClaw 的结构化日志、敏感信息脱敏、日志级别管理和诊断追踪。
> 基于 tslog 库，提供多传输（文件/控制台）和自动密钥脱敏。

## 文件结构

| 文件 | 职责 |
|------|------|
| `logger.ts` | 日志器主逻辑（tslog 封装、多传输、格式化） |
| `redact.ts` | 敏感信息脱敏（API Key、Token、密码） |
| `redact-bounded.ts` | 有界脱敏（保留首尾字符） |
| `levels.ts` | 日志级别定义（silly/trace/debug/info/warn/error/fatal） |
| `state.ts` | 日志状态管理 |
| `config.ts` | 日志配置读取 |

## 核心概念

- **LogLevel** — 7 级日志（silly → fatal）
- **Redaction** — 自动脱敏敏感信息
- **Transport** — 日志传输（文件、控制台、诊断事件）

## 敏感信息脱敏

`redact.ts` 自动检测并脱敏：

| 模式 | 处理 |
|------|------|
| API Key（sk-xxx） | `sk-proj-...xxxx` |
| Token（长字符串） | `***...xxxx` |
| 密码字段 | `***` |
| 支付信息 | `***` |
| Apple App Password | `xxxx-xxxx-xxxx-xxxx` → `***` |

保留前 6 后 4 字符，中间替换为 `...`。
