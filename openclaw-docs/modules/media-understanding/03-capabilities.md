# media-understanding — API

```typescript
function resolveMediaUnderstandingScope(config: OpenClawConfig): MediaUnderstandingScope
function resolveMediaUnderstandingProvider(kind: MediaKind): MediaUnderstandingProvider | null
function processImage(params: ImageParams): Promise<string>
function processAudio(params: AudioParams): Promise<string>
function processVideo(params: VideoParams): Promise<string>
function processDocument(params: DocumentParams): Promise<string>
```
