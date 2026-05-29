# realtime-transcription — 数据流

```
1. 创建会话
   provider.createSession({ callbacks })

2. WebSocket 连接
   websocket-session.ts → connect(providerUrl)

3. 发送音频
   session.sendAudio(buffer) → WebSocket.send(binary)

4. 接收转录
   WebSocket.onMessage → onPartial / onTranscript

5. 关闭
   session.close() → WebSocket.close()
```
