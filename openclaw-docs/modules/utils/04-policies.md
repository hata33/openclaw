# utils — 策略

## 一、依赖层级

utils 依赖 shared，但不依赖业务模块。比 shared 更高层级，涉及消息渠道等概念。

## 二、安全

`mask-api-key.ts` 确保日志中不泄露完整 API Key。

## 三、并发

`run-with-concurrency` 使用信号量模式控制并发数。
