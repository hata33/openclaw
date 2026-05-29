# link-understanding — 策略

## 一、安全策略

### SSRF 防护

使用 `isBlockedHostnameOrIp` 过滤内网地址，防止 SSRF 攻击。

### 大小限制

`readResponseWithLimit` 限制读取内容大小，防止内存溢出。

## 二、性能策略

### 最大链接数

默认最多处理 3 个链接，避免过多抓取。

### 超时

每个链接抓取超时 30 秒。

## 三、降级策略

抓取失败时跳过该链接，不影响其他链接处理。
