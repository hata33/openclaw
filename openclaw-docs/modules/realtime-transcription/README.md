# realtime-transcription — 实时语音转录

> 实时语音转文字，通过 WebSocket 连接 Provider（如 Deepgram）实现流式转录。
> 用于语音对话场景。

## 文件结构

| 文件 | 职责 |
|------|------|
| `provider-types.ts` | Provider 类型定义（会话、回调） |
| `provider-registry.ts` | Provider 注册表 |
| `websocket-session.ts` | WebSocket 转录会话 |

## 核心概念

### 转录会话

```typescript
interface RealtimeTranscriptionSession {
  sendAudio(buffer: Buffer): void;
  close(): void;
}
```

### 回调

```typescript
type SessionCallbacks = {
  onPartial?(partial: string): void;    // 部分转录
  onTranscript?(transcript: string): void; // 最终转录
  onSpeechStart?(): void;               // 检测到语音
  onSpeechEnd?(): void;                 // 语音结束
  onError?(error: Error): void;         // 错误
};
```

### WebSocket 传输

`websocket-session.ts` 实现 WebSocket 传输层：

```
音频流 → WebSocket → Provider → 转录结果 → 回调
```
