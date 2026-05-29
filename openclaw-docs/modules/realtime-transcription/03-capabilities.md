# realtime-transcription — API

```typescript
type SessionCallbacks = {
  onPartial?(partial: string): void;
  onTranscript?(transcript: string): void;
  onSpeechStart?(): void;
  onSpeechEnd?(): void;
  onError?(error: Error): void;
};

interface RealtimeTranscriptionSession {
  sendAudio(buffer: Buffer): void;
  close(): void;
}
```
