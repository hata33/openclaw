# utils — 通用工具函数

> 介于 shared 和业务模块之间的工具层。
> 提供配置、消息渠道、并发、超时等实用工具。

## 文件结构（27 个文件）

### 消息渠道

| 文件 | 职责 |
|------|------|
| `message-channel.ts` | 消息渠道统一接口 |
| `message-channel-core.ts` | 消息渠道核心 |
| `message-channel-normalize.ts` | 渠道 ID 规范化 |
| `message-channel-constants.ts` | 渠道常量 |

### 投递上下文

| 文件 | 职责 |
|------|------|
| `delivery-context.ts` | 消息投递上下文 |
| `delivery-context.shared.ts` | 共享投递上下文 |
| `delivery-context.types.ts` | 投递类型 |

### 并发/超时

| 文件 | 职责 |
|------|------|
| `with-timeout.ts` | 超时包装 |
| `run-with-concurrency.ts` | 并发控制 |
| `queue-helpers.ts` | 队列工具 |
| `timer-delay.ts` | 定时延迟 |

### JSON/解析

| 文件 | 职责 |
|------|------|
| `safe-json.ts` | 安全 JSON 解析 |
| `parse-json-compat.ts` | 兼容 JSON 解析 |
| `zod-parse.ts` | Zod 解析工具 |

### 其他

| 文件 | 职责 |
|------|------|
| `account-id.ts` | 账户 ID 工具 |
| `boolean.ts` | 布尔工具 |
| `chunk-items.ts` | 分块工具 |
| `cjk-chars.ts` | CJK 字符检测 |
| `directive-tags.ts` | 指令标签 |
| `fetch-timeout.ts` | Fetch 超时 |
| `mask-api-key.ts` | API Key 脱敏 |
| `normalize-secret-input.ts` | 密钥输入规范化 |
| `provider-utils.ts` | Provider 工具 |
| `reaction-level.ts` | 反应级别 |
| `shell-argv.ts` | Shell 参数解析 |
| `transcript-tools.ts` | 转录工具 |
| `usage-format.ts` | 用量格式化 |
