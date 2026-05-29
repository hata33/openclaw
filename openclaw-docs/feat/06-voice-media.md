# 06 — 语音与媒体处理管线

> OpenClaw 不只是文本助手。它支持语音唤醒、实时对话、TTS 朗读、
> 图片理解、文档解析等多模态能力。本文档剖析语音和媒体处理的实现原理。

## 语音系统架构

OpenClaw 的语音系统分为三个子系统：

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Voice Wake  │  │  Talk Mode   │  │  TTS 朗读    │
│  语音唤醒    │  │  实时对话    │  │  文本转语音  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       └────────┬────────┘                  │
                │                           │
         ASR（语音识别）              TTS Provider
                │                           │
         文本输出 ──→ Agent ──→ 文本回复 ──→ 语音输出
```

### 语音唤醒（Voice Wake）

在 macOS/iOS 上，用户可以通过唤醒词（类似 "Hey Siri"）激活 Agent：

```
麦克风持续监听
  → 检测到唤醒词
  → 激活 Talk Mode
  → 开始录音
  → 语音识别 → 文本
  → 发送到 Agent
```

实现位置：`extensions/` 中的节点扩展（macOS/iOS/Android）。

### Talk Mode（实时对话）

Talk Mode 是连续语音对话模式：

```
用户说话
  → ASR 实时识别
  → 识别完成 → 发送到 Agent
  → Agent 处理 → 生成回复文本
  → TTS 合成语音
  → 播放语音
  → 回到"用户说话"（循环）
```

核心代码在 `src/talk/`，包括：

| 文件 | 职责 |
|------|------|
| `activation-name.ts` | 唤醒词管理 |
| `agent-consult-runtime.ts` | Agent 语音咨询运行时 |
| `agent-run-control.ts` | Agent 运行控制（暂停/继续） |
| `audio-codec.ts` | 音频编解码 |
| `consult-question.ts` | 语音问答 |
| `event-metrics.ts` | 事件指标 |

### TTS（文本转语音）

OpenClaw 支持多种 TTS 后端：

```typescript
// TTS Provider 架构
interface TtsProvider {
  id: string;
  synthesize(text: string, options?: TtsOptions): Promise<AudioBuffer>;
}
```

支持的后端：
1. **ElevenLabs** — 高质量 AI 语音
2. **Azure Speech** — 微软语音服务
3. **本地 TTS** — 系统原生 TTS（fallback）
4. **其他 Provider** — 通过插件扩展

TTS 的使用场景：
- Agent 主动朗读回复（`[[audio_as_voice]]` 指令）
- Talk Mode 中的语音输出
- 用户显式请求 `tts` 工具

## 媒体处理管线

### 媒体理解（Media Understanding）

当用户发送图片或文档时，OpenClaw 需要理解其内容：

```
用户发送图片
  → 渠道插件接收媒体文件
  → 媒体理解 Provider 处理
  → 提取文本/描述图片内容
  → 结果注入 Agent 上下文
```

媒体理解 Provider 是插件化的（`extensions/media-understanding-core/`），支持：
- **图片理解** — 通过 LLM 的视觉能力描述图片
- **文档提取** — 从 PDF/DOCX 等提取文本
- **音频转录** — 将语音消息转为文本

### 图片生成

Agent 可以生成图片：

```
用户: "画一只猫"
  → LLM 返回: tool_call(image_generate, { prompt: "a cat" })
  → 图片生成 Provider 处理
  → 返回图片 URL
  → 投递到渠道
```

图片生成 Provider 支持多种后端：
- **OpenAI DALL-E** — `extensions/openai/image-generation-provider.ts`
- **其他 Provider** — 通过插件扩展

### 视频生成

类似图片生成，OpenClaw 也支持视频生成：
- **Runway** — `extensions/runway/`
- **PixVerse** — `extensions/pixverse/`

### 文档提取

文档提取（`extensions/document-extract/`）支持从多种格式提取文本：

| 格式 | 处理方式 |
|------|----------|
| PDF | 文本提取或 OCR |
| DOCX | XML 解析 |
| 纯文本 | 直接读取 |
| 图片 | OCR |

## 编解码

### 音频编解码

音频处理需要支持多种格式：

```typescript
// src/talk/audio-codec.ts
// 处理 Opus、PCM、WAV 等格式的编解码
```

不同渠道使用不同的音频格式：
- **WhatsApp** — Opus
- **Telegram** — OGG/Opus
- **Discord** — PCM
- **WebRTC** — Opus/PCM

## 关键代码入口

| 文件/目录 | 职责 |
|-----------|------|
| `src/talk/` | Talk Mode 核心逻辑 |
| `src/tts/` | TTS 框架 |
| `src/media/` | 媒体处理 |
| `src/media-understanding/` | 媒体理解框架 |
| `src/image-generation/` | 图片生成框架 |
| `src/video-generation/` | 视频生成框架 |
| `src/realtime-transcription/` | 实时转录 |
| `extensions/media-understanding-core/` | 媒体理解核心实现 |
| `extensions/speech-core/` | 语音核心实现 |
| `extensions/elevenlabs/` | ElevenLabs TTS |
| `extensions/azure-speech/` | Azure Speech |

## 总结

1. **语音三件套** — 唤醒、实时对话、TTS 朗读
2. **插件化 TTS** — ElevenLabs、Azure、本地等多种后端
3. **媒体理解** — 图片/文档/音频的多模态理解
4. **内容生成** — 图片和视频生成能力
5. **格式适配** — 不同渠道使用不同音频编解码
