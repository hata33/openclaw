# media — 能力清单与对外接口

## 常量（constants.ts）

```typescript
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;    // 6 MB
const MAX_AUDIO_BYTES = 16 * 1024 * 1024;   // 16 MB
const MAX_VIDEO_BYTES = 16 * 1024 * 1024;   // 16 MB
const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024; // 100 MB

type MediaKind = "image" | "audio" | "video" | "document";

function mediaKindFromMime(mime?: string): MediaKind | undefined
```

## MIME 检测（mime.ts）

```typescript
function detectMime(buffer: Buffer): string | null
function mimeTypeFromFilePath(filePath: string): string | null
function extensionForMime(mime: string): string
function getFileExtension(path: string): string
function normalizeMimeType(mime: string): string
```

## 媒体存储（store.ts）

```typescript
function saveMediaBuffer(buffer: Buffer, options?: { mimeType?: string }): Promise<SavedMedia>
function saveMediaStream(stream: Readable, options?: { mimeType?: string }): Promise<SavedMedia>
function getMediaDir(): string
function resolveMediaBufferPath(mediaId: string): string
```

### SavedMedia

```typescript
type SavedMedia = {
  path: string;
  mediaId: string;
  mimeType: string;
  size: number;
};
```

## 远程抓取（fetch.ts）

```typescript
function fetchMedia(url: string, options?: {
  maxBytes?: number;
  signal?: AbortSignal;
  retries?: RetryOptions;
}): Promise<FetchMediaResult>
```

### FetchMediaResult

```typescript
type FetchMediaResult = {
  buffer: Buffer;
  mimeType: string;
  size: number;
  saved?: SavedMedia;
};
```

## 媒体引用（media-reference.ts）

```typescript
function resolveMediaReference(ref: string, options?: { workspaceDir?: string }): Promise<{
  path: string;
  mimeType?: string;
  exists: boolean;
}>

class MediaReferenceError extends Error {
  code: "invalid-path" | "path-not-allowed";
}
```

## 音频（audio.ts, audio-transcode.ts）

```typescript
// 类型判断
function isVoiceMessageCompatibleAudio(opts: { contentType?: string; fileName?: string }): boolean

// 转码
function transcodeToOpus(params: {
  inputPath: string;
  outputPath?: string;
}): Promise<string>
```

## 图片操作（image-ops.ts）

```typescript
function readImageMetadata(buffer: Buffer): Promise<ImageMetadata>
function cropImage(buffer: Buffer, region: { x: number; y: number; width: number; height: number }): Promise<Buffer>
function resizeImage(buffer: Buffer, dimensions: { width: number; height: number }): Promise<Buffer>
```

## PDF 提取（pdf-extract.ts）

```typescript
function extractPdfContent(params: {
  buffer: Buffer;
  maxPages: number;
  maxPixels: number;
  minTextChars: number;
  pageNumbers?: number[];
}): Promise<PdfExtractedContent>
```

## FFmpeg 封装（ffmpeg-exec.ts）

```typescript
function runFfmpeg(args: string[], options?: MediaExecOptions): Promise<{ stdout: string; stderr: string }>
function runFfprobe(args: string[], options?: MediaExecOptions): Promise<{ stdout: string; stderr: string }>
```

## QR 码（qr-image.ts, qr-terminal.ts）

```typescript
function generateQrImage(data: string, options?: { width?: number }): Promise<Buffer>
function renderQrTerminal(data: string): string
```

## 限流读取

```typescript
function readResponseWithLimit(response: Response, maxBytes: number): Promise<Buffer>
function readByteStreamWithLimit(stream: ReadableStream, maxBytes: number): Promise<Buffer>
```

## Base64（base64.ts）

```typescript
function encodeBase64(buffer: Buffer): string
function decodeBase64(encoded: string): Buffer
```

## 文件名处理（file-name.ts）

```typescript
function sanitizeFileName(name: string): string
function basenameFromAnyPath(filePath: string): string
function extnameFromAnyPath(filePath: string): string
```
