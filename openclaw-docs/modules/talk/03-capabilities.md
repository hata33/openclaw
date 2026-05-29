# talk — 能力清单与对外接口

## 事件类型（talk-events.ts）

### TALK_EVENT_TYPES

```typescript
const TALK_EVENT_TYPES = [
  // 会话生命周期
  "session.started", "session.ready", "session.closed", "session.error", "session.replaced",
  // Turn 管理
  "turn.started", "turn.ended", "turn.cancelled",
  // 音频捕获
  "capture.started", "capture.stopped", "capture.cancelled", "capture.once",
  // 输入音频
  "input.audio.delta", "input.audio.committed",
  // 转录
  "transcript.delta", "transcript.done",
  // 输出文本
  "output.text.delta", "output.text.done",
  // 输出音频
  "output.audio.started", "output.audio.delta", "output.audio.done",
  // 工具调用
  "tool.call.started", "tool.call.result",
];
```

## 会话控制器（talk-session-controller.ts）

### TalkSessionController

```typescript
type TalkTurnSuccess = { event: TalkEvent; ok: true; turnId: string; };
type TalkTurnFailureReason = "no_active_turn" | "stale_turn";
```

管理语音对话的 Turn 生命周期和事件序列化。

## 会话运行时（session-runtime.ts）

### RealtimeVoiceAudioSink

```typescript
type RealtimeVoiceAudioSink = {
  isOpen?: () => boolean;
  sendAudio: (audio: Buffer) => void;
  clearAudio?: () => void;
  sendMark?: (markName: string) => void;
};
```

音频输出目标（如扬声器、电话线路）。

## Provider 类型（provider-types.ts）

### RealtimeVoiceBridge

```typescript
type RealtimeVoiceBridge = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendAudio: (audio: Buffer) => void;
  onEvent: (handler: (event: RealtimeVoiceBridgeEvent) => void) => void;
};
```

### RealtimeVoiceAudioFormat

```typescript
type RealtimeVoiceAudioFormat =
  | { encoding: "g711_ulaw"; sampleRateHz: 8000; channels: 1 }
  | { encoding: "pcm16"; sampleRateHz: 24000; channels: 1 };
```

### RealtimeVoiceBargeInOptions

```typescript
type RealtimeVoiceBargeInOptions = {
  enabled: boolean;
  mode: "immediate" | "graceful";
};
```

### RealtimeVoiceTool

```typescript
type RealtimeVoiceTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<string>;
};
```

## Provider 注册（provider-registry.ts）

### listRealtimeVoiceProviders

```typescript
function listRealtimeVoiceProviders(cfg?: OpenClawConfig): RealtimeVoiceProviderPlugin[]
```

### getRealtimeVoiceProvider

```typescript
function getRealtimeVoiceProvider(providerId: string, cfg?: OpenClawConfig): RealtimeVoiceProviderPlugin | undefined
```

## Provider 解析（provider-resolver.ts）

### resolveConfiguredRealtimeVoiceProvider

```typescript
function resolveConfiguredRealtimeVoiceProvider(params: ResolveConfiguredRealtimeVoiceProviderParams):
  | ResolvedRealtimeVoiceProvider
  | undefined
```

### ResolvedRealtimeVoiceProvider

```typescript
type ResolvedRealtimeVoiceProvider = {
  provider: RealtimeVoiceProviderPlugin;
  providerConfig: RealtimeVoiceProviderConfig;
};
```

## Agent Consult Tool（agent-consult-tool.ts）

### REALTIME_VOICE_AGENT_CONSULT_TOOL_NAME

```typescript
const REALTIME_VOICE_AGENT_CONSULT_TOOL_NAME = "openclaw_agent_consult";
```

### RealtimeVoiceAgentConsultArgs

```typescript
type RealtimeVoiceAgentConsultArgs = {
  question: string;
  context?: string;
  responseStyle?: string;
};
```

### RealtimeVoiceAgentConsultToolPolicy

```typescript
type RealtimeVoiceAgentConsultToolPolicy = "safe-read-only" | "owner" | "none";
```

## 音频编解码（audio-codec.ts）

### resamplePcm16ToTelephony

```typescript
function resamplePcm16ToTelephony(pcm24k: Buffer): Buffer
```

PCM16 24kHz → G.711 μ-law 8kHz

### resampleTelephonyToPcm16

```typescript
function resampleTelephonyToPcm16(ulaw8k: Buffer): Buffer
```

G.711 μ-law 8kHz → PCM16 24kHz

## 激活名称（activation-name.ts）

### detectActivationName

```typescript
function detectActivationName(text: string, activationName: string):
  | { allowed: true; text: string; match: "exact" | "fuzzy"; edge: "leading" | "trailing" }
  | { allowed: false; text: string }
```

### REALTIME_VOICE_ACTIVATION_NAME_MAX_WORDS

```typescript
const REALTIME_VOICE_ACTIVATION_NAME_MAX_WORDS = 2;
```

## Agent 运行控制（agent-run-control.ts）

### resolveRealtimeVoiceAgentControlIntent

```typescript
function resolveRealtimeVoiceAgentControlIntent(event: TalkEvent): RealtimeVoiceAgentControlResult
```

### abortCurrentAgentRun

```typescript
function abortCurrentAgentRun(): void
```
