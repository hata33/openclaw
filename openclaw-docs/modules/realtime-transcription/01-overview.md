# realtime-transcription — 功能定义

## 流式转录

音频数据实时发送到 Provider，Provider 返回部分和最终转录结果。

## Provider 插件

支持多种实时转录 Provider（如 Deepgram），通过插件系统注册。

## WebSocket 连接

使用 WebSocket 双向通信，支持二进制音频数据传输。
