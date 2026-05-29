# realtime-transcription — 策略

## 连接管理

WebSocket 断开后由调用方负责重连。

## 延迟

实时转录要求低延迟。使用二进制 WebSocket 减少序列化开销。
