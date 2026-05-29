# tts — 功能定义与设计思想

## 这个模块解决什么问题？

用户可能希望以语音方式接收 Agent 的回复（如在开车、做饭时）。tts 模块将文本回复转为语音消息。

解决的核心问题：

1. **多 Provider 支持** — OpenAI TTS、ElevenLabs 等多种语音服务
2. **自动模式** — 根据场景自动决定是否转语音
3. **指令控制** — 文本中的特殊标记控制语音行为
4. **Persona 系统** — 预设不同的语音风格

## Auto Mode — 自动模式

```typescript
type TtsAutoMode = "off" | "always" | "inbound" | "tagged";
```

| 模式 | 行为 |
|------|------|
| `off` | 不自动转语音，只在显式请求时转 |
| `always` | 所有回复都转语音 |
| `inbound` | 入站消息是语音时，回复也用语音 |
| `tagged` | 只转带有语音标记的回复 |

## Persona — 语音角色

```typescript
type ResolvedTtsPersona = {
  provider?: string;    // Provider ID
  voice: string;        // 声音名称
  model?: string;       // 模型 ID
  speed?: number;       // 语速
  instructions?: string; // 风格指令
};
```

用户可以配置多个 Persona（如"温柔女声"、"活泼男声"），通过 `/voice` 命令切换。

## Directive — 语音指令

`directives.ts` 从回复文本中解析语音控制指令：

```
[[audio_as_voice]]       → 标记此消息应转语音
[[voice:nova]]           → 指定声音
[[speed:1.5]]            → 指定语速
```

指令以 `[[...]]` 格式嵌入文本中，解析后从文本中移除。

## 设计思想

### 1. 配置多层合并

TTS 配置来自多个来源，按优先级合并：

```
会话级覆盖（用户通过 /voice 切换）
  > Agent 级配置
    > 全局配置
      > 默认值
```

### 2. 上下文感知

配置解析考虑上下文（agentId、channelId、accountId）：

```typescript
type TtsConfigResolutionContext = {
  agentId?: string;
  channelId?: string;
  accountId?: string;
};
```

不同渠道可以有不同 TTS 配置（如电话用高音质，Telegram 用低延迟）。

### 3. 文本摘要

长文本先摘要再转语音，节省 Token 和时间：

```typescript
isSummarizationEnabled() → 控制是否启用
summaryModel → 指定摘要用的模型
```

### 4. OpenAI 兼容协议

`openai-compatible-speech-provider.ts` 实现了 OpenAI 兼容的语音合成 API：

```
POST /v1/audio/speech
Body: { model, voice, input, speed, response_format }
```

任何兼容此协议的服务都可以作为 Provider 使用。

### 5. 临时文件自动清理

```typescript
const TEMP_FILE_CLEANUP_DELAY_MS = 5 * 60 * 1000;  // 5 分钟后清理

function scheduleCleanup(filePath: string): void {
  setTimeout(() => { rmSync(filePath, { force: true }); }, TEMP_FILE_CLEANUP_DELAY_MS);
}
```

## Provider 注册

Provider 通过插件系统注册：

```
插件定义 speechProviders capability
  → provider-registry.ts 收集
    → 按 Provider ID 查找
      → 调用 synthesize() 合成语音
```

内置 Provider：
- OpenAI TTS（通过 openai-compatible-speech-provider）

插件 Provider：
- ElevenLabs（通过插件注册）
- 其他第三方服务
