# interactive — 策略、配置与边界情况

## 一、渠道兼容策略

### 1.1 按钮数量限制

| 渠道 | 最大按钮数 |
|------|-----------|
| Telegram | 8/行，最多 4 行 |
| Discord | 5/行，最多 5 行 |
| Slack | 25 个 |
| WhatsApp | 3 个 |

超出限制时按 `priority` 截断。

### 1.2 降级策略

不支持的渠道：按钮转为纯文本列表。

## 二、已知边界情况

### 2.1 Web App 仅 Telegram

`webApp` 字段只在 Telegram 中有效，其他渠道忽略。

### 2.2 回调值长度

Telegram callback_data 最长 64 字节。长值需要使用短 ID + 服务端存储。

### 2.3 URL 安全

`url` 应使用 HTTPS。HTTP URL 在某些渠道可能被拒绝。
