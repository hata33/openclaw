# tts — 能力清单与对外接口

## tts.ts — 公共 API 导出

### 状态查询

| 函数 | 签名 | 说明 |
|------|------|------|
| `isTtsEnabled` | `() => boolean` | TTS 是否启用 |
| `isTtsProviderConfigured` | `() => boolean` | Provider 是否已配置 |
| `isSummarizationEnabled` | `() => boolean` | 文本摘要是否启用 |
| `getTtsProvider` | `() => string \| undefined` | 当前 Provider ID |
| `getTtsPersona` | `() => string \| undefined` | 当前 Persona |
| `getTtsMaxLength` | `() => number` | 最大文本长度 |
| `getLastTtsAttempt` | `() => ... \| undefined` | 最近一次 TTS 尝试 |

### 状态设置

| 函数 | 说明 |
|------|------|
| `setTtsEnabled(bool)` | 启用/禁用 TTS |
| `setTtsAutoMode(mode)` | 设置自动模式 |
| `setSummarizationEnabled(bool)` | 启用/禁用摘要 |
| `setTtsMaxLength(n)` | 设置最大文本长度 |
| `setLastTtsAttempt(attempt)` | 记录最近 TTS 尝试 |

### 配置解析

| 函数 | 说明 |
|------|------|
| `resolveTtsConfig(context?)` | 解析完整 TTS 配置 |
| `resolveTtsAutoMode()` | 解析当前自动模式 |
| `resolveTtsPrefsPath()` | 解析偏好文件路径 |
| `resolveTtsProviderOrder()` | 解析 Provider 优先级 |
| `resolveExplicitTtsOverrides(args)` | 解析显式覆盖 |

### Provider 相关

| 函数 | 说明 |
|------|------|
| `listSpeechVoices(provider?)` | 列出可用声音 |
| `listTtsPersonas()` | 列出可用 Persona |
| `getResolvedSpeechProviderConfig(providerId)` | 获取 Provider 配置 |

### 语音合成

| 函数 | 说明 |
|------|------|
| `maybeApplyTtsToPayload(payload, ...)` | 将语音应用到消息 payload |
| `buildTtsSystemPromptHint()` | 构建系统提示中的 TTS 提示 |

### 测试

| 函数 | 说明 |
|------|------|
| `testApi(config)` | 测试 TTS API 连通性 |
| `_test(config)` | 内部测试接口 |

## tts-config.ts

### resolveEffectiveTtsConfig

```typescript
function resolveEffectiveTtsConfig(
  context?: TtsConfigResolutionContext
): ResolvedTtsConfig
```

### TtsConfigResolutionContext

```typescript
type TtsConfigResolutionContext = {
  agentId?: string;
  channelId?: string;
  accountId?: string;
};
```

### deepMergeDefined

```typescript
function deepMergeDefined(base: unknown, override: unknown): unknown
```

深度合并配置，跳过 `__proto__` 等危险键。

## tts-auto-mode.ts

### normalizeTtsAutoMode

```typescript
function normalizeTtsAutoMode(value: unknown): TtsAutoMode | undefined
```

- **合法值**：`"off"` | `"always"` | `"inbound"` | `"tagged"`

## directives.ts

### parseTtsDirectives

```typescript
function parseTtsDirectives(text: string, options?: ParseTtsDirectiveOptions): TtsDirectiveParseResult
```

### TtsDirectiveParseResult

```typescript
type TtsDirectiveParseResult = {
  cleanedText: string;           // 清理后的文本
  overrides: TtsDirectiveOverrides;  // 指令覆盖
  shouldSpeak: boolean;          // 是否应转语音
};
```

### TtsDirectiveTextStreamCleaner

```typescript
type TtsDirectiveTextStreamCleaner = {
  push: (text: string) => string;  // 流式文本清理
  flush: () => string;              // 刷新剩余文本
};
```

用于流式输出中实时清理指令标记。

## provider-registry.ts

### listSpeechProviders

```typescript
function listSpeechProviders(cfg?: OpenClawConfig): SpeechProviderPlugin[]
```

### getSpeechProvider

```typescript
function getSpeechProvider(providerId: string, cfg?: OpenClawConfig): SpeechProviderPlugin | undefined
```

## provider-types.ts

### SpeechModelOverridePolicy

```typescript
type SpeechModelOverridePolicy = {
  enabled: boolean;
  allowText: boolean;
  allowProvider: boolean;
  allowVoice: boolean;
  allowModelId: boolean;
  allowVoiceSettings: boolean;
  allowNormalization: boolean;
  allowSeed: boolean;
};
```

### SpeechSynthesisTarget

```typescript
type SpeechSynthesisTarget = "audio-file" | "voice-note" | "telephony";
```

## tts-provider-helpers.ts

| 函数 | 说明 |
|------|------|
| `requireInRange(value, min, max, label)` | 范围校验 |
| `normalizeLanguageCode(code)` | 语言代码规范化（ISO 639-1） |
| `normalizeApplyTextNormalization(mode)` | 文本规范化模式 |
| `normalizeSeed(seed)` | 种子值规范化 |
| `scheduleCleanup(filePath)` | 5 分钟后删除临时文件 |

## status-config.ts

### resolveTtsStatusConfig

```typescript
function resolveTtsStatusConfig(cfg: OpenClawConfig, context?: TtsConfigResolutionContext): TtsStatusConfig
```

解析 TTS 状态配置（用于 /status 显示）。
