# 01 - 功能全局概览

> 模型与运行时层是 OpenClaw 的"大脑"——它将用户的自然语言请求转化为对 LLM 的 API 调用，并将模型的响应流式回传给用户。

---

## 这一层做了什么？

### 一句话描述

**模型与运行时层是 OpenClaw 与 30+ LLM 提供商之间的统一抽象层。** 它屏蔽了不同模型服务商之间的 API 差异、认证方式、流式协议、能力边界，让上层（Gateway、Agent、Session）只需面对一套统一接口。

### 核心职责

```
用户请求（自然语言）
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│              模型与运行时层                                │
│                                                         │
│  1. 认证管理 — 管理 API Key、OAuth、Token 等凭证          │
│  2. 模型选择 — 从 30+ 提供商中选择合适的模型               │
│  3. 请求适配 — 将统一请求格式转换为各提供商的 API 格式      │
│  4. 流式处理 — 处理 SSE/WebSocket 流式响应                │
│  5. 能力协商 — 判断模型支持哪些能力（视觉/工具/推理）       │
│  6. 错误恢复 — 重试、降级、回退到备选模型                  │
│  7. 用量追踪 — 记录 Token 消耗和成本                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
    │
    ▼
LLM API 响应（流式文本/工具调用/推理过程）
```

---

## 能力来源

### 能力从哪里来？

OpenClaw 的模型能力不是自己实现的，而是**代理（proxy）**了各家 LLM 提供商的原生能力：

| 能力 | 来源 | 说明 |
|------|------|------|
| **文本生成** | 所有 Provider | 核心能力，每个 LLM 都提供 |
| **视觉理解** | Anthropic Claude、OpenAI GPT、Google Gemini | 图片/视频输入理解 |
| **工具调用 (Function Calling)** | Anthropic、OpenAI、Google、DeepSeek 等 | Agent 调用外部工具的基础 |
| **推理/思考 (Thinking)** | Anthropic Claude、DeepSeek | 扩展推理、思维链 |
| **流式响应** | 所有 Provider | 实时返回生成内容 |
| **嵌入 (Embedding)** | OpenAI、Ollama | 记忆系统的向量化基础 |
| **图片生成** | OpenAI DALL-E、ComfyUI | 图片创作 |
| **语音合成 (TTS)** | OpenAI、Azure、ElevenLabs | 文字转语音 |
| **实时语音** | OpenAI Realtime | 实时语音对话 |
| **视频生成** | OpenAI Sora、Runway | 视频创作 |
| **Web 搜索** | OpenAI、Perplexity、Brave | 实时信息检索 |
| **音乐生成** | ComfyUI 等 | 音乐创作 |

### 能力如何声明？

每个 Provider 通过 `ProviderPlugin` 接口声明自己的能力：

```typescript
// 简化的 ProviderPlugin 接口
interface ProviderPlugin {
  id: string;                    // "anthropic" / "openai" / "deepseek"
  label: string;                 // 显示名称
  auth: AuthMethod[];            // 支持的认证方式
  catalog: ModelCatalog;         // 提供的模型列表
  wrapStreamFn?: StreamWrapper;  // 流式响应包装器
  resolveThinkingProfile?: ...;  // 推理能力声明
  augmentModelCatalog?: ...;     // 动态扩展模型目录
  fetchUsageSnapshot?: ...;      // 用量查询
}
```

---

## 解决的问题

### 没有这一层会怎样？

| 问题 | 没有抽象层 | 有了抽象层 |
|------|-----------|-----------|
| **API 差异** | 每个 Provider 的 API 格式不同，上层代码要写 30 套适配 | 统一接口，上层只需一套代码 |
| **认证管理** | 每个 Provider 的认证方式不同（API Key / OAuth / Token / CLI） | 统一的 Auth Profile 系统 |
| **模型发现** | 手动维护模型列表，新模型发布后需要手动更新 | 动态模型目录 + 自动发现 |
| **能力差异** | 不同模型支持不同能力（视觉/工具/推理），上层要逐一判断 | 统一的能力协商机制 |
| **流式协议** | Anthropic 用 SSE、OpenAI 用 SSE 但格式不同、部分用 WebSocket | 统一的流式处理管道 |
| **错误处理** | 每个 Provider 的错误码、重试策略不同 | 统一的重试与降级机制 |
| **成本追踪** | 要分别对接每个 Provider 的用量 API | 统一的用量快照接口 |

### 设计哲学

OpenClaw 的模型运行时遵循以下设计哲学：

1. **插件化** — 每个 Provider 是独立的扩展包，可单独安装/卸载
2. **声明式能力** — Provider 声明自己"能做什么"，而非上层去"猜"
3. **统一认证** — 所有 Provider 共享同一套 Auth Profile 系统
4. **流式优先** — 所有请求都支持流式响应，非流式是特殊情况
5. **优雅降级** — 主模型不可用时自动切换备选模型

---

## 架构位置

```
┌──────────────────────────────────────┐
│         Gateway / Agent              │  ← 上层消费者
│    只关心"用什么模型"和"结果"          │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│      模型与运行时层（本层）            │
│  ┌────────────────────────────────┐  │
│  │  Plugin SDK (provider-*.ts)    │  │  ← 框架层：定义接口、提供工具
│  └──────────────┬─────────────────┘  │
│                 │                     │
│  ┌──────────────┴─────────────────┐  │
│  │  Provider Extensions           │  │  ← 实现层：每个 Provider 一个扩展
│  │  (anthropic, openai, deepseek) │  │
│  └──────────────┬─────────────────┘  │
│                 │                     │
│  ┌──────────────┴─────────────────┐  │
│  │  Model Catalog                 │  │  ← 目录层：管理所有可用模型
│  └────────────────────────────────┘  │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│      LLM Providers (外部服务)         │
│  Anthropic / OpenAI / DeepSeek / ... │
└──────────────────────────────────────┘
```

---

## 关键术语

| 术语 | 含义 |
|------|------|
| **Provider** | 模型服务商，如 Anthropic、OpenAI |
| **ProviderPlugin** | Provider 在 OpenClaw 中的插件实现 |
| **Model** | 具体的模型，如 claude-opus-4-7、gpt-4o |
| **Model Catalog** | 所有可用模型的统一目录 |
| **Auth Profile** | 认证配置，存储 API Key / OAuth Token |
| **StreamFn** | 流式响应函数，处理 LLM 的流式输出 |
| **Replay Policy** | 重放策略，管理对话历史的发送方式 |
| **Thinking Profile** | 推理能力配置，控制模型的推理行为 |
| **Cache Retention** | 缓存保留策略，控制 Anthropic 的 prompt cache |
