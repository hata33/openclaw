# media-understanding — 策略

## 大小限制

媒体文件大小限制，防止内存溢出。

## 超时

媒体处理可能耗时较长。设置合理的超时。

## 降级

无可用 Provider 时，提示用户无法处理该媒体类型。

## CLI 工具

优先使用 API Provider。无 API 时回退到本地 CLI 工具。
