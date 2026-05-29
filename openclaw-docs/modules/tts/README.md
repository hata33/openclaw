# tts — 文本转语音（Text-to-Speech）

> 负责 Agent 回复的语音合成，支持多种 TTS Provider、Persona 系统、自动模式和指令解析。
> 将文本回复转换为语音消息发送给用户。

## 文件结构

| 文件 | 行数 | 职责 |
|------|------|------|
| `tts.ts` | 42 | 公共 API 导出入口 |
| `tts-core.ts` | 159 | 核心逻辑：文本摘要、语音合成调度 |
| `tts-config.ts` | 212 | 配置解析：合并多源配置、上下文解析 |
| `tts-types.ts` | 29 | 类型定义（ResolvedTtsConfig） |
| `tts-auto-mode.ts` | 15 | 自动模式规范化（off/always/inbound/tagged） |
| `directives.ts` | 368 | TTS 指令解析：从回复文本中提取语音指令 |
| `provider-types.ts` | 149 | Provider 类型定义（配置、覆盖、策略） |
| `provider-registry.ts` | 54 | Provider 注册表（插件 + 内置） |
| `provider-registry-core.ts` | 58 | Provider 注册表核心逻辑 |
| `openai-compatible-speech-provider.ts` | 402 | OpenAI 兼容语音 Provider 实现 |
| `status-config.ts` | 253 | TTS 状态配置（用户偏好持久化） |
| `tts-provider-helpers.ts` | 57 | Provider 辅助工具（参数校验、临时文件清理） |
| `tts.runtime.ts` | 1 | 运行时入口标记 |

## 核心概念

- **TTS Provider** — 语音合成服务（OpenAI TTS、ElevenLabs、自定义）
- **Persona** — 语音角色（声音、风格、语速等预设）
- **Auto Mode** — 自动语音模式（何时自动将回复转为语音）
- **Directive** — 文本中的语音指令（控制何时/如何转语音）
- **Summarization** — 长文本摘要后再转语音

## 与其他模块的关系

```
plugins (插件系统)
    ↓ 注册 Speech Provider
tts ← 本模块
    ↓ 语音合成
channels (渠道层)
    ↓ 发送语音消息
agents (Agent 运行时)
    ↓ 回复文本 → 语音
talk (语音对话，可选前置）
```
