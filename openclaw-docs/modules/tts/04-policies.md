# tts — 策略、配置与边界情况

## 一、自动模式策略

### 1.1 四种模式

| 模式 | 触发条件 | 适用场景 |
|------|----------|----------|
| `off` | 从不自动转语音 | 用户只用文字交流 |
| `always` | 所有回复都转语音 | 语音优先用户（如开车时） |
| `inbound` | 入站是语音时回复语音 | 镜像模式：你发语音我回语音 |
| `tagged` | 只转带标记的回复 | 选择性语音，Agent 自主决定 |

### 1.2 tagged 模式下的指令

```
Agent 回复: "这是一个语音回复 [[audio_as_voice]]"
→ shouldSpeak = true
→ 清理后文本: "这是一个语音回复"
→ 转语音并发送
```

## 二、配置合并策略

### 2.1 合并优先级

```
用户运行时偏好（tts-prefs.json）
  > 会话级覆盖（/voice 命令）
    > Agent 级配置
      > 渠道级配置
        > 全局配置
          > 默认值
```

### 2.2 深度合并

```typescript
function deepMergeDefined(base, override) {
  // 只合并非 undefined 的值
  // 跳过 __proto__, prototype, constructor
  const BLOCKED_MERGE_KEYS = new Set(["__proto__", "prototype", "constructor"]);
}
```

### 2.3 上下文感知

不同上下文可以有不同的 TTS 配置：

```yaml
# 全局默认
tts:
  provider: openai
  voice: alloy

# 电话渠道用高音质
channels:
  twilio:
    tts:
      voice: nova
      speed: 0.9
```

## 三、文本摘要策略

### 3.1 触发条件

```
文本长度 > maxTextLength（默认 1500）
  && summarizationEnabled（默认 true）
  → 先摘要再转语音
```

### 3.2 摘要模型

```typescript
config.summaryModel → 默认使用轻量模型
```

使用较小的模型做摘要，节省成本。

### 3.3 摘要长度

摘要后的文本控制在 `maxTextLength` 以内。

## 四、Provider 策略

### 4.1 OpenAI 兼容协议

默认 Provider 使用 OpenAI 兼容协议：

```
POST /v1/audio/speech
{
  "model": "tts-1",
  "voice": "alloy",
  "input": "Hello!",
  "speed": 1.0,
  "response_format": "mp3"
}
```

支持任何兼容此 API 的服务（如 Azure OpenAI）。

### 4.2 Provider 优先级

```typescript
resolveTtsProviderOrder() → string[]
```

返回 Provider 的优先级列表，第一个可用的被使用。

### 4.3 凭证配置

```typescript
type OpenAiCompatibleSpeechProviderBaseConfig = {
  apiKey?: string;
  baseUrl?: string;    // 默认 https://api.openai.com/v1
  model: string;       // tts-1 或 tts-1-hd
  voice: string;       // alloy, echo, fable, onyx, nova, shimmer
  speed?: number;      // 0.25 - 4.0
  responseFormat?: string;  // mp3, opus, aac, flac, wav
};
```

## 五、临时文件策略

### 5.1 清理延迟

```typescript
const TEMP_FILE_CLEANUP_DELAY_MS = 5 * 60 * 1000;  // 5 分钟
```

语音文件发送后延迟 5 分钟删除，确保渠道有足够时间读取文件。

### 5.2 强制删除

```typescript
rmSync(filePath, { force: true });
```

即使文件已被删除也不报错。

## 六、安全策略

### 6.1 参数校验

```typescript
requireInRange(speed, 0.25, 4.0, "speed");
```

速度、采样率等参数必须在有效范围内。

### 6.2 语言代码校验

```typescript
if (!/^[a-z]{2}$/.test(normalized)) {
  throw new Error("languageCode must be a 2-letter ISO 639-1 code");
}
```

### 6.3 配置合并安全

```typescript
const BLOCKED_MERGE_KEYS = new Set(["__proto__", "prototype", "constructor"]);
```

防止原型污染攻击。

## 七、已知边界情况

### 7.1 空文本

空文本不应转语音。调用方在调用 `maybeApplyTtsToPayload` 前检查文本长度。

### 7.2 Provider 不可用

Provider API 可能失败（网络错误、配额耗尽）。错误向上传播，Agent 回退到纯文本回复。

### 7.3 流式输出中的指令清理

`TtsDirectiveTextStreamCleaner` 用于流式输出中实时清理指令标记：

```typescript
const cleaner = createTextStreamCleaner();
for (const chunk of stream) {
  const cleaned = cleaner.push(chunk);
  // cleaned 中不包含 [[...]] 指令
}
const remaining = cleaner.flush();
```

### 7.4 多声音切换

Persona 切换只在下次回复生效，不影响当前正在生成的回复。

### 7.5 超时控制

```typescript
config.timeoutMs → 语音合成超时时间
```

超时后取消合成，Agent 回退到纯文本回复。
