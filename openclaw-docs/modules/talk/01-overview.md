# talk — 功能定义与设计思想

## 这个模块解决什么问题？

实时语音对话比文本交互复杂得多：需要管理音频流、处理打断、协调 Agent Loop 和语音 Provider。talk 模块解决的核心问题：

1. **实时语音交互** — 双向音频流，低延迟对话
2. **Provider 抽象** — 统一不同语音 Provider 的接口
3. **Turn 管理** — 对话轮次的创建、追踪和取消
4. **打断控制** — 用户可以在 Agent 说话时打断
5. **工具调用** — 语音对话中调用 Agent 的文本工具

## 设计思想

### 1. Voice Bridge 模式

Voice Bridge 是语音 Provider 和音频 I/O 之间的桥梁：

```
用户麦克风 → Voice Bridge → Provider API
Provider API → Voice Bridge → 用户扬声器
```

Bridge 接口统一了不同 Provider 的差异（WebSocket、HTTP Streaming 等）。

### 2. 音频格式

支持两种音频格式：

```typescript
type RealtimeVoiceAudioFormat =
  | { encoding: "g711_ulaw"; sampleRateHz: 8000; channels: 1 }   // 电话
  | { encoding: "pcm16"; sampleRateHz: 24000; channels: 1 };    // 高质量
```

`audio-codec.ts` 提供格式转换（G.711 μ-law ↔ PCM16），支持电话和高品质场景。

### 3. 事件驱动

30+ 事件类型覆盖完整的语音对话生命周期：

```typescript
const TALK_EVENT_TYPES = [
  "session.started", "session.ready", "session.closed", "session.error",
  "turn.started", "turn.ended", "turn.cancelled",
  "capture.started", "capture.stopped", "capture.cancelled",
  "input.audio.delta", "input.audio.committed",
  "transcript.delta", "transcript.done",
  "output.text.delta", "output.text.done",
  "output.audio.started", "output.audio.delta", "output.audio.done",
  // ...更多
];
```

### 4. Agent Consult

语音对话中可能需要调用 Agent 的文本能力（如搜索、代码执行）：

```typescript
const REALTIME_VOICE_AGENT_CONSULT_TOOL_NAME = "openclaw_agent_consult";

type RealtimeVoiceAgentConsultArgs = {
  question: string;        // 要咨询的问题
  context?: string;        // 上下文
  responseStyle?: string;  // 回复风格（简洁/详细）
};
```

这允许语音对话中的 Agent 委托任务给文本 Agent。

### 5. 激活名称（唤醒词）

```typescript
type RealtimeVoiceActivationNameMatchKind = "exact" | "fuzzy";

function detectActivationName(text: string, activationName: string): 
  | { allowed: true; text: string; match: "exact" | "fuzzy" }
  | { allowed: false; text: string }
```

支持精确匹配和模糊匹配，最多 2 个单词的激活名称。

### 6. Barge-in（打断）

用户可以在 Agent 说话时打断：

```typescript
type RealtimeVoiceBargeInOptions = {
  enabled: boolean;
  mode: "immediate" | "graceful";
};
```

- `immediate` — 立即停止 Agent 输出
- `graceful` — 等待当前句子结束后停止

### 7. Turn 上下文追踪

`turn-context-tracker.ts` 追踪每个 Turn 的上下文：

```
Turn 1: 用户问天气 → Agent 回答
Turn 2: 用户追问明天呢？ → 上下文包含 Turn 1
```

## Provider 注册

与 tts 类似，语音 Provider 通过插件系统注册：

```
插件定义 realtimeVoiceProviders capability
  → provider-registry.ts 收集
    → provider-resolver.ts 选择
      → 创建 Voice Bridge
```

## 会话模式

```typescript
type TalkMode = "duplex" | "push-to-talk" | "vox";
```

| 模式 | 说明 |
|------|------|
| `duplex` | 全双工（同时说和听） |
| `push-to-talk` | 按键说话 |
| `vox` | 声控（检测到声音时自动开始） |
