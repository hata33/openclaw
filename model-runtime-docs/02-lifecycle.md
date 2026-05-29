# 02 - 完整生命周期

> 从插件注册到模型调用的全链路追踪——一条消息如何从用户到达 LLM 并返回。

---

## 生命周期总览

```
1. 插件注册 → 2. 模型目录构建 → 3. 认证配置 → 4. 模型选择
      ↓              ↓               ↓            ↓
5. 请求构建 → 6. 流式调用 → 7. 流处理管道 → 8. 响应投递
      ↓              ↓               ↓            ↓
9. 用量追踪 → 10. 缓存管理 → 11. 错误恢复 → 12. 会话重放
```

---

## 阶段 1：插件注册 (Plugin Registration)

### 触发时机
Gateway 启动时，扫描 `extensions/` 目录，加载所有扩展包。

### 注册流程

```typescript
// 每个扩展的入口文件 (extensions/anthropic/index.ts)
export default definePluginEntry({
  id: "anthropic",
  name: "Anthropic Provider",
  register(api) {
    // 注册 Provider（模型提供者）
    api.registerProvider(buildAnthropicProvider());
    // 注册 CLI 后端（复用 Claude CLI 认证）
    api.registerCliBackend(buildAnthropicCliBackend());
    // 注册媒体理解 Provider（视觉能力）
    api.registerMediaUnderstandingProvider(anthropicMediaUnderstandingProvider);
  },
});
```

### 注册内容

每个 Provider 在注册时声明：

| 声明项 | 说明 | 示例 |
|--------|------|------|
| `id` | Provider 唯一标识 | `"anthropic"` |
| `auth` | 支持的认证方式列表 | `["cli", "setup-token", "api-key"]` |
| `catalog` | 模型目录（提供的模型列表） | Claude 系列模型 |
| `wrapStreamFn` | 流式响应包装器 | Beta header 注入 |
| `resolveThinkingProfile` | 推理能力解析 | Claude extended thinking |
| `normalizeResolvedModel` | 模型规范化 | 图片能力、上下文窗口 |
| `buildReplayPolicy` | 重放策略构建 | 对话历史处理方式 |
| `augmentModelCatalog` | 动态模型扩展 | Claude CLI 模型 |

---

## 阶段 2：模型目录构建 (Model Catalog)

### 静态目录
每个 Provider 在 `openclaw.plugin.json` 中声明静态模型清单：

```json
{
  "modelCatalog": {
    "providers": {
      "deepseek": {
        "baseUrl": "https://api.deepseek.com/v1",
        "models": [
          { "id": "deepseek-v4-pro", "contextWindow": 131072, "reasoning": true },
          { "id": "deepseek-v4-flash", "contextWindow": 131072, "reasoning": true }
        ]
      }
    }
  }
}
```

### 动态目录
部分 Provider 通过 `augmentModelCatalog()` 动态扩展模型列表：
- **Claude CLI** — 从本地 Claude CLI 读取可用模型
- **OpenAI Codex** — 从 Codex CLI 读取
- **Ollama** — 从本地 Ollama 服务查询已安装模型
- **配置文件** — 用户在 `config.yaml` 中自定义的模型

### 目录规范化
`model-catalog/normalize.ts` 将所有来源的模型信息统一为标准格式：

```typescript
interface ModelCatalogModel {
  id: string;               // 模型 ID
  provider: string;         // Provider ID
  contextWindow: number;    // 上下文窗口大小
  reasoning?: boolean;      // 是否支持推理
  input?: string[];         // 输入类型 (text/image/audio)
  cost?: ModelCatalogCost;  // 定价信息
}
```

---

## 阶段 3：认证配置 (Authentication)

### 认证方式

OpenClaw 支持三种认证模式，每个 Provider 可以支持其中一种或多种：

| 认证方式 | 说明 | 典型 Provider |
|----------|------|---------------|
| **API Key** | 直接使用 API Key | DeepSeek、OpenAI、大多数 |
| **OAuth / Token** | OAuth 流程获取 Token | Anthropic (setup-token) |
| **CLI 复用** | 复用已有 CLI 工具的认证 | Claude CLI、Codex CLI |

### Auth Profile 存储

认证信息存储在 Auth Profile Store 中：

```
~/.openclaw/auth-profiles.json
├── anthropic:default    → { type: "token", token: "sk-ant-..." }
├── openai:default       → { type: "api_key", apiKey: "sk-..." }
├── claude-cli:default   → { type: "oauth", access: "...", expires: ... }
└── deepseek:default     → { type: "api_key", apiKey: "sk-..." }
```

### 认证解析链

```
请求到达 → 检查 Auth Profile → 检查环境变量 → 检查 CLI 凭证 → 提示用户输入
```

---

## 阶段 4：模型选择 (Model Selection)

### 选择流程

```
用户配置 (config.yaml: model.primary)
    │
    ▼
解析模型引用 → "anthropic/claude-opus-4-7"
    │
    ├─ Provider: "anthropic"
    │
    └─ Model ID: "claude-opus-4-7"
         │
         ▼
    resolveDynamicModel() — 处理前向兼容
         │
         ▼
    normalizeResolvedModel() — 规范化能力
         │
         ▼
    最终 ProviderRuntimeModel
```

### 动态模型解析

`resolveDynamicModel()` 处理模型 ID 的前向兼容：

- `claude-opus-4-7` → 4.7 系列模型，基于 4.6 模板构建
- `claude-sonnet-4-6` → Sonnet 4.6 模型
- 未知模型 ID → 尝试从已知模板克隆

### 能力规范化

`normalizeResolvedModel()` 补充模型的隐含能力：
- **图片输入** — 现代 Claude 模型自动添加 `image` 输入能力
- **上下文窗口** — GA 1M 模型自动设置 1,048,576 token 上下文
- **媒体输入参数** — 设置最大图片尺寸（Opus 4.7: 2576px, 其他: 1568px）

---

## 阶段 5：请求构建 (Request Construction)

### Agent Prompt 构建

Gateway 层的 `agent-prompt.ts` 构建完整的 Prompt：
1. 系统提示词（persona、tools、skills）
2. 对话历史（replay policy 决定如何发送）
3. 用户当前消息
4. 工具定义
5. 附件/媒体

### 额外参数准备

`prepareExtraParams()` 注入 Provider 特定参数：
- Anthropic: `serviceTier`, `fastMode`, `anthropicBeta`
- OpenAI: `promptOverlay`, `toolCompat`
- DeepSeek: `thinkingLevel`

---

## 阶段 6：流式调用 (Streaming Invocation)

### StreamFn 统一接口

所有 LLM 调用都通过 `StreamFn` 接口进行：

```typescript
type StreamFn = (
  model: ModelRef,       // 模型引用
  context: Context,      // 对话上下文（消息、工具定义等）
  options: StreamOptions // API Key、额外参数、headers
) => AsyncIterable<StreamEvent>;
```

### 调用链

```
StreamFn (原始)
    → wrapStreamFn()  — Provider 注册的包装器
        → Beta headers 注入
        → Service tier 设置
        → Fast mode 设置
        → Thinking prefill 处理
    → 最终 StreamFn
    → 发送 HTTP 请求到 LLM API
```

---

## 阶段 7：流处理管道 (Stream Processing Pipeline)

### 流式事件类型

```typescript
type StreamEvent =
  | { type: "text"; text: string }          // 文本片段
  | { type: "tool_use"; name: string; ... } // 工具调用
  | { type: "thinking"; text: string }      // 推理过程
  | { type: "usage"; input: number; ... }   // Token 用量
  | { type: "done" }                        // 完成
  | { type: "error"; error: Error }         // 错误
```

### 处理流程

```
LLM API SSE 流
    → 解析 SSE 事件
    → 标准化为 StreamEvent
    → 工具调用检测（plaintext tool call parser）
    → 推理输出提取
    → Token 用量记录
    → 转发到上层（Agent / Talk Runtime）
```

### 特殊处理

- **Plaintext Tool Call** — 部分模型（不支持 function calling）通过文本输出工具调用，需要解析器检测
- **Anthropic Thinking Prefill** — 扩展推理模式需要特殊处理 assistant prefill 消息
- **DeepSeek V4 Thinking** — 通过 `reasoning_content` 字段返回推理过程

---

## 阶段 8：响应投递 (Response Delivery)

```
StreamEvent → Agent Talk Runtime → 渠道格式化 → 用户可见回复
```

- 文本事件 → 直接流式输出到渠道
- 工具调用 → Agent 执行工具后继续对话
- 推理过程 → 可选显示或隐藏
- 错误事件 → 触发错误恢复流程

---

## 阶段 9：用量追踪 (Usage Tracking)

### Token 记录

每次 LLM 调用结束后，记录：
- `input_tokens` — 输入 token 数
- `output_tokens` — 输出 token 数
- `cache_creation_input_tokens` — 缓存创建 token（Anthropic）
- `cache_read_input_tokens` — 缓存读取 token（Anthropic）
- `reasoning_tokens` — 推理 token 数（部分模型）

### 用量查询

`fetchUsageSnapshot()` 从 Provider 查询累计用量：
- Anthropic: 通过 OAuth token 查询使用量 API
- OpenAI: 通过 billing API 查询

---

## 阶段 10：缓存管理 (Cache Management)

### Prompt Cache (Anthropic)

Anthropic 支持 prompt cache，缓存频繁使用的系统提示和对话历史：

- `cacheRetention: "short"` — 短期缓存（5 分钟）
- `cacheRetention: "long"` — 长期缓存（1 小时）
- API Key 模式默认使用 `"short"`
- OAuth 模式默认不设置（使用 Provider 默认）

### 缓存 TTL

`isCacheTtlEligible()` 判断 Provider 是否支持缓存 TTL 管理。

---

## 阶段 11：错误恢复 (Error Recovery)

### 重试策略

`operation-retry.ts` 处理可重试的错误：

| 错误类型 | 策略 |
|----------|------|
| 429 Rate Limit | 等待 Retry-After 后重试 |
| 5xx Server Error | 指数退避重试 |
| 网络超时 | 立即重试 |
| 上下文溢出 | 触发 context pruning 后重试 |

### 模型回退

当主模型不可用时，按 `model.fallbacks` 配置依次尝试备选模型。

### 重放策略

`Replay Policy` 决定对话历史如何发送给 LLM：
- **Anthropic 原生** — 使用 Anthropic 的原生重放格式
- **OpenAI 兼容** — 使用 OpenAI messages 格式
- **Gemini** — Google 特定格式
- **直通** — 原样发送

---

## 阶段 12：会话重放 (Session Replay)

### 为什么需要重放？

LLM 是无状态的，每次请求都需要发送完整的对话历史。重放策略决定：
1. 哪些历史消息需要发送
2. 如何格式化（特别是推理/思考过程的处理）
3. 如何处理超出上下文窗口的历史

### 重放策略类型

| 策略 | 说明 | 使用场景 |
|------|------|----------|
| `strict-anthropic` | 严格 Anthropic 格式 | Claude 直连 |
| `native-anthropic` | Anthropic 原生格式 | Claude via Bedrock |
| `openai-compatible` | OpenAI 兼容格式 | DeepSeek、大多数 Provider |
| `google-gemini` | Google 格式 | Gemini |
| `hybrid` | 混合格式 | Anthropic via Vertex |

### 推理历史处理

对于支持推理的模型（Claude thinking、DeepSeek reasoning），重放时需要特殊处理推理过程的保留或剥离。
