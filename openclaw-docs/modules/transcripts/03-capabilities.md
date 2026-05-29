# transcripts — 能力清单与对外接口

## Provider 类型（provider-types.ts）

```typescript
type TranscriptSourceKind = "live-audio" | "live-caption" | "posthoc-transcript" | "recording-stt";

type TranscriptUtterance = {
  id: string;
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  speakerLabel?: string;
  text: string;
};

type TranscriptSessionDescriptor = {
  sessionId: string;
  title?: string;
  startedAt?: string;
  endedAt?: string;
  participants?: TranscriptParticipant[];
};

type TranscriptSourceProvider = {
  id: string;
  sourceKinds: TranscriptSourceKind[];
  importTranscript(request: TranscriptImportRequest): Promise<TranscriptUtterance[]>;
};
```

## Provider 注册（provider-registry.ts）

```typescript
function listTranscriptSourceProviders(cfg?: OpenClawConfig): TranscriptSourceProvider[]
function getTranscriptSourceProvider(providerId: string, cfg?: OpenClawConfig): TranscriptSourceProvider | undefined
```

## 手动导入（manual-source.ts）

```typescript
const manualTranscriptSourceProvider: TranscriptSourceProvider
// id: "manual-transcript", sourceKinds: ["posthoc-transcript"]
```

## 存储（store.ts）

```typescript
function saveTranscriptSession(entry: TranscriptsSessionEntry): Promise<void>
function loadTranscriptSession(sessionDir: string): Promise<TranscriptsSessionEntry | undefined>
function listTranscriptSessions(): Promise<TranscriptsSessionEntry[]>
```

## 摘要（summary.ts）

```typescript
function renderTranscriptsMarkdown(utterances: TranscriptUtterance[]): TranscriptsSummary

type TranscriptsSummary = {
  sessionId: string;
  title: string;
  generatedAt: string;
  overview: string;
  decisions: string[];
  actionItems: string[];
  risks: string[];
  utteranceCount: number;
};
```

## 配置（config.ts）

```typescript
type TranscriptsConfig = {
  enabled?: boolean;
  maxUtterances?: number;
  autoStart?: TranscriptsAutoStartConfig;
};
```
