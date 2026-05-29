# 03 - 运行时能力清单与来源

> 每一个运行时能力由哪个组件提供、如何声明、如何使用。

---

## 能力分类总览

OpenClaw 的模型运行时能力分为 6 大类：

```
┌─────────────────────────────────────────────────────┐
│                 运行时能力体系                        │
├──────────┬──────────┬──────────┬──────────┬─────────┤
│ 认证能力  │ 模型能力  │ 流式能力  │ 推理能力  │ 媒体能力 │
├──────────┴──────────┴──────────┴──────────┴─────────┤
│                   工具与集成能力                      │
└─────────────────────────────────────────────────────┘
```

---

## 1. 认证能力 (Authentication Capabilities)

### 1.1 API Key 认证

| 属性 | 值 |
|------|-----|
| **提供者** | 所有 Provider |
| **声明位置** | `ProviderPlugin.auth[]` |
| **实现位置** | `src/plugin-sdk/provider-api-key-auth.ts` |
| **存储位置** | `~/.openclaw/auth-profiles.json` |

**工作流程：**
```
用户输入 API Key → validateApiKeyInput() → buildApiKeyCredential()
    → upsertAuthProfileWithLock() → 存储到 auth-profiles.json
    → 后续请求从 Profile 读取
```

**支持的 Provider：**
- OpenAI (`sk-...`)
- DeepSeek (`sk-...`)
- Anthropic API Key (`sk-ant-api03-...`)
- Groq、Mistral、Fireworks、Together 等

### 1.2 OAuth / Token 认证

| 属性 | 值 |
|------|-----|
| **提供者** | Anthropic (setup-token) |
| **声明位置** | `extensions/anthropic/register.runtime.ts` |
| **实现位置** | `runAnthropicSetupTokenAuth()` |

**工作流程：**
```
用户提供 setup-token → validateAnthropicSetupToken() → 格式验证
    → resolveAnthropicSetupTokenProfileId() → 生成 Profile ID
    → resolveAnthropicSetupTokenExpiry() → 计算过期时间
    → 存储到 auth-profiles.json
```

**特殊处理：**
- Token 格式验证（去除空格、trim）
- 过期时间计算（支持 `7d`、`30d` 等格式）
- Profile ID 命名（支持自定义或默认 `anthropic:default`）

### 1.3 CLI 复用认证

| 属性 | 值 |
|------|-----|
| **提供者** | Anthropic (Claude CLI), OpenAI (Codex CLI) |
| **声明位置** | `extensions/anthropic/cli-auth-seam.ts` |
| **实现位置** | `readClaudeCliCredentialsForRuntime()` |

**工作流程：**
```
检测本地 Claude CLI → 读取 ~/.claude/credentials
    → 解析 OAuth token 或 API key
    → 构建 synthetic auth（虚拟认证）
    → 无需用户额外配置
```

**支持的 CLI：**
- Claude CLI (`claude auth login`)
- Codex CLI (`codex auth login`)

---

## 2. 模型能力 (Model Capabilities)

### 2.1 文本生成 (Text Generation)

| 属性 | 值 |
|------|-----|
| **提供者** | 所有 Provider |
| **声明位置** | `ProviderPlugin.catalog.models[]` |
| **使用方式** | 默认能力，无需声明 |

### 2.2 视觉理解 (Vision / Image Input)

| 属性 | 值 |
|------|-----|
| **提供者** | Anthropic Claude, OpenAI GPT, Google Gemini |
| **声明位置** | `normalizeResolvedModel()` → `model.input = ["text", "image"]` |
| **实现位置** | `applyAnthropicImageInputCapability()` (Anthropic) |

**能力声明：**
```typescript
{
  input: ["text", "image"],  // 支持文本和图片输入
  mediaInput: {
    image: {
      maxSidePx: 2576,      // 最大图片边长 (Opus 4.7)
      preferredSidePx: 2576,
      tokenMode: "provider"  // 由 Provider 计算图片 token
    }
  }
}
```

**图片尺寸限制：**
- Claude Opus 4.7: 2576px
- 其他 Claude 模型: 1568px
- OpenAI GPT: 根据模型自动选择
- Google Gemini: 根据模型自动选择

### 2.3 工具调用 (Function Calling)

| 属性 | 值 |
|------|-----|
| **提供者** | Anthropic, OpenAI, Google, DeepSeek, 大多数 Provider |
| **声明位置** | `ProviderPlugin` 的工具相关钩子 |
| **实现位置** | `src/plugin-sdk/provider-tools.ts` |

**工具调用模式：**
- **原生工具调用** — 通过 API 的 `tools` 参数传递工具定义
- **Plaintext 工具调用** — 不支持原生调用的模型，通过文本输出工具调用
- **工具兼容层** — `buildProviderToolCompatFamilyHooks()` 处理不同 Provider 的工具格式差异

### 2.4 嵌入 (Embeddings)

| 属性 | 值 |
|------|-----|
| **提供者** | OpenAI, Ollama |
| **声明位置** | `api.registerMemoryEmbeddingProvider()` |
| **实现位置** | `extensions/openai/embedding-provider.ts` |

**用途：** 记忆系统的向量化搜索

### 2.5 图片生成 (Image Generation)

| 属性 | 值 |
|------|-----|
| **提供者** | OpenAI (DALL-E), ComfyUI, Fal |
| **声明位置** | `api.registerImageGenerationProvider()` |
| **实现位置** | `extensions/openai/image-generation-provider.ts` |

### 2.6 语音合成 (TTS / Speech)

| 属性 | 值 |
|------|-----|
| **提供者** | OpenAI, Azure Speech, ElevenLabs, Local CLI |
| **声明位置** | `api.registerSpeechProvider()` |
| **实现位置** | `extensions/openai/speech-provider.ts`, `extensions/azure-speech/` |

### 2.7 实时语音 (Realtime Voice)

| 属性 | 值 |
|------|-----|
| **提供者** | OpenAI |
| **声明位置** | `api.registerRealtimeVoiceProvider()` |
| **实现位置** | `extensions/openai/realtime-voice-provider.ts` |

### 2.8 实时转录 (Realtime Transcription)

| 属性 | 值 |
|------|-----|
| **提供者** | OpenAI |
| **声明位置** | `api.registerRealtimeTranscriptionProvider()` |
| **实现位置** | `extensions/openai/realtime-transcription-provider.ts` |

### 2.9 视频生成 (Video Generation)

| 属性 | 值 |
|------|-----|
| **提供者** | OpenAI (Sora), Runway, Pixverse |
| **声明位置** | `api.registerVideoGenerationProvider()` |
| **实现位置** | `extensions/openai/video-generation-provider.ts` |

### 2.10 媒体理解 (Media Understanding)

| 属性 | 值 |
|------|-----|
| **提供者** | Anthropic, OpenAI, OpenAI Codex |
| **声明位置** | `api.registerMediaUnderstandingProvider()` |
| **实现位置** | `extensions/anthropic/media-understanding-provider.ts` |

---

## 3. 流式能力 (Streaming Capabilities)

### 3.1 流式响应包装 (Stream Wrappers)

| 能力 | 提供者 | 实现位置 |
|------|--------|----------|
| **Beta Header 注入** | Anthropic | `stream-wrappers.ts` → `createAnthropicBetaHeadersWrapper()` |
| **Service Tier** | Anthropic | `stream-wrappers.ts` → `createAnthropicServiceTierWrapper()` |
| **Fast Mode** | Anthropic | `stream-wrappers.ts` → `createAnthropicFastModeWrapper()` |
| **Thinking Prefill** | Anthropic | `stream-wrappers.ts` → `createAnthropicThinkingPrefillWrapper()` |
| **V4 Thinking** | DeepSeek | `extensions/deepseek/stream.ts` → `createDeepSeekV4ThinkingWrapper()` |
| **Payload Patch** | 通用 | `src/plugin-sdk/provider-stream-shared.ts` → `streamWithPayloadPatch()` |

### 3.2 流式事件类型

```typescript
// 所有 Provider 最终产生这些标准事件
type StreamEvent =
  | { type: "text"; text: string }           // 文本片段
  | { type: "tool_use"; ... }                // 工具调用
  | { type: "tool_result"; ... }             // 工具结果
  | { type: "thinking"; text: string }       // 推理过程
  | { type: "usage"; ... }                   // Token 用量
  | { type: "done" }                         // 完成
  | { type: "error"; error: Error }          // 错误
```

### 3.3 流式组合 (Stream Composition)

`composeProviderStreamWrappers()` 允许链式组合多个流包装器：

```typescript
// 最终的 StreamFn 由多个包装器组合而成
const finalStream = composeProviderStreamWrappers(
  baseStreamFn,
  betaHeadersWrapper,     // 注入 Anthropic beta headers
  serviceTierWrapper,     // 设置 service tier
  fastModeWrapper,        // 设置 fast mode
  thinkingPrefillWrapper  // 处理 thinking prefill
);
```

---

## 4. 推理能力 (Reasoning / Thinking Capabilities)

### 4.1 Anthropic Extended Thinking

| 属性 | 值 |
|------|-----|
| **模型** | Claude Opus 4.6+, Sonnet 4.6+ |
| **声明** | `resolveThinkingProfile()` → `resolveClaudeThinkingProfile()` |
| **输出模式** | `resolveReasoningOutputMode()` → `"native"` |
| **特殊处理** | Thinking prefill 去除、thinking 内容提取 |

### 4.2 DeepSeek V4 Thinking

| 属性 | 值 |
|------|-----|
| **模型** | deepseek-v4-pro, deepseek-v4-flash |
| **声明** | `resolveDeepSeekV4ThinkingProfile()` |
| **实现** | `createDeepSeekV4ThinkingWrapper()` |
| **特殊处理** | `reasoning_content` 字段解析 |

### 4.3 推理输出模式

```typescript
type ProviderReasoningOutputMode =
  | "native"       // 原生推理输出（Anthropic、DeepSeek）
  | "tagged"       // 标签推理输出（通过特殊标签包裹）
  | "hidden"       // 隐藏推理过程
  | undefined;     // 不支持推理
```

---

## 5. 模型目录能力 (Model Catalog Capabilities)

### 5.1 静态目录

| 来源 | 说明 | 示例 |
|------|------|------|
| `openclaw.plugin.json` | 扩展包内嵌的模型清单 | DeepSeek 模型列表 |
| `config.yaml` | 用户配置中的模型定义 | 自定义模型 |

### 5.2 动态目录

| 来源 | 说明 | 触发方式 |
|------|------|----------|
| Claude CLI | 从本地 Claude CLI 读取 | `augmentModelCatalog()` |
| Codex CLI | 从本地 Codex CLI 读取 | `augmentModelCatalog()` |
| Ollama | 从本地 Ollama 服务查询 | `augmentModelCatalog()` |
| 配置文件 | `config.yaml` 中的 `models.providers` | `readConfiguredProviderCatalogEntries()` |

### 5.3 模板克隆

`cloneFirstTemplateModel()` 允许从已知模型模板创建新模型定义：
- 基于已有模型的能力声明
- 覆盖模型 ID 和特定参数
- 用于前向兼容（新模型 ID 基于旧模型模板）

---

## 6. 工具与集成能力 (Tool & Integration Capabilities)

### 6.1 工具兼容层

| 能力 | 提供者 | 实现 |
|------|--------|------|
| **OpenAI 兼容** | DeepSeek, 大多数 Provider | `buildProviderToolCompatFamilyHooks("openai-compatible")` |
| **Anthropic 兼容** | Anthropic | `buildProviderToolCompatFamilyHooks("anthropic")` |
| **Google 兼容** | Google Gemini | `buildProviderToolCompatFamilyHooks("google")` |

### 6.2 Web 搜索集成

| 属性 | 值 |
|------|-----|
| **提供者** | OpenAI (native web search), Perplexity, Brave |
| **声明位置** | `hasNativeWebSearchTool()` |
| **实现位置** | `extensions/openai/native-web-search.ts` |

### 6.3 Prompt Overlay (系统提示增强)

| 属性 | 值 |
|------|-----|
| **提供者** | OpenAI (GPT-5 friendly prompt), Anthropic |
| **声明位置** | `resolveSystemPromptContribution()` |
| **实现位置** | `extensions/openai/prompt-overlay.ts` |

---

## 能力来源映射表

| 能力 | Plugin SDK 方法 | Provider 实现 | 扩展包 |
|------|----------------|---------------|--------|
| API Key 认证 | `createProviderApiKeyAuthMethod()` | `auth[]` | 所有 Provider |
| OAuth 认证 | `runAnthropicSetupTokenAuth()` | `auth[]` | anthropic |
| CLI 复用 | `readClaudeCliCredentialsForRuntime()` | `resolveSyntheticAuth()` | anthropic, openai |
| 模型目录 | `buildSingleProviderApiKeyCatalog()` | `catalog` | 所有 Provider |
| 动态模型 | `cloneFirstTemplateModel()` | `resolveDynamicModel()` | anthropic |
| 模型规范化 | - | `normalizeResolvedModel()` | anthropic |
| 流式包装 | `composeProviderStreamWrappers()` | `wrapStreamFn()` | anthropic, deepseek |
| 推理能力 | `resolveClaudeThinkingProfile()` | `resolveThinkingProfile()` | anthropic, deepseek |
| 重放策略 | `buildOpenAICompatibleReplayPolicy()` | `buildReplayPolicy()` | 所有 Provider |
| 用量查询 | `fetchClaudeUsage()` | `fetchUsageSnapshot()` | anthropic, openai |
| 媒体理解 | - | `registerMediaUnderstandingProvider()` | anthropic, openai |
| 图片生成 | - | `registerImageGenerationProvider()` | openai |
| 语音合成 | - | `registerSpeechProvider()` | openai, azure-speech |
| 视频生成 | - | `registerVideoGenerationProvider()` | openai |
| 嵌入 | - | `registerMemoryEmbeddingProvider()` | openai |
| 实时语音 | - | `registerRealtimeVoiceProvider()` | openai |
| 实时转录 | - | `registerRealtimeTranscriptionProvider()` | openai |
