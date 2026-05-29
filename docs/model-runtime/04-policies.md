# 04 - 其他特性和策略

> 模型运行时层的各种策略与特殊机制——重放、缓存、重试、安全、流处理等。

---

## 1. 重放策略 (Replay Policy)

### 什么是重放？

LLM 是无状态的。每次请求都需要发送完整的对话历史，这就是"重放"。重放策略决定了：
- 以什么格式发送历史消息
- 如何处理推理/思考过程
- 如何处理超出上下文窗口的历史

### 重放策略族

OpenClaw 按"策略族"组织重放逻辑：

| 策略族 | 适用 Provider | 说明 |
|--------|---------------|------|
| `strict-anthropic` | Anthropic 直连 | 严格遵循 Anthropic 消息格式 |
| `native-anthropic` | Anthropic via Bedrock | Anthropic 原生格式，适配 Bedrock |
| `openai-compatible` | DeepSeek, 大多数 Provider | OpenAI messages 格式 |
| `google-gemini` | Google Gemini | Google 特定格式 |
| `passthrough-gemini` | Google Gemini (直通) | Gemini 格式，带清理 |
| `hybrid-anthropic-openai` | Anthropic via Vertex | 混合格式 |

### 重放策略钩子

```typescript
// ProviderPlugin 中的重放相关钩子
interface ProviderPlugin {
  // 构建重放策略
  buildReplayPolicy?: (ctx: ProviderReplayPolicyContext) => ProviderReplayPolicy;

  // 清理重放历史
  sanitizeReplayHistory?: (ctx: ProviderSanitizeReplayHistoryContext) => ReplaySessionEntry[];

  // 验证重放轮次
  validateReplayTurns?: (ctx: ProviderValidateReplayTurnsContext) => void;

  // 推理输出模式
  resolveReasoningOutputMode?: (ctx) => ProviderReasoningOutputMode;

  // 是否是现代模型引用
  isModernModelRef?: (ctx) => boolean;
}
```

### 重放策略族构建器

```typescript
// 通用 OpenAI 兼容重放策略
buildProviderReplayFamilyHooks({
  family: "openai-compatible",
  dropReasoningFromHistory: false  // 是否从历史中剥离推理过程
});

// Anthropic 原生重放策略
buildNativeAnthropicReplayPolicyForModel(modelId);

// Google Gemini 重放策略
buildGoogleGeminiReplayPolicy();
```

### 推理历史处理

对于支持推理的模型，重放时需要特殊处理推理过程：

| 模型 | 推理字段 | 重放处理 |
|------|----------|----------|
| Claude (thinking) | `thinking` blocks | 可保留或剥离 |
| DeepSeek V4 | `reasoning_content` | `dropReasoningFromHistory: false` |
| GPT-5 | `reasoning` | 根据策略处理 |

---

## 2. 缓存策略 (Cache Strategy)

### Prompt Cache (Anthropic)

Anthropic 的 prompt cache 机制允许缓存频繁使用的 prompt 前缀：

```
请求 1: [系统提示 (10K tokens)] + [用户消息 1]
请求 2: [系统提示 (缓存命中)] + [用户消息 2]
    → 节省 10K tokens 的处理成本
```

### 缓存保留配置

```typescript
// config.yaml 中的缓存配置
models:
  providers:
    anthropic/claude-opus-4-7:
      params:
        cacheRetention: "short"  // 短期缓存（5分钟）
        # cacheRetention: "long"  // 长期缓存（1小时）
```

### 缓存 TTL 资格

```typescript
// Provider 声明是否支持缓存 TTL
isCacheTtlEligible: () => true  // Anthropic: true
```

### 默认缓存策略

| 认证模式 | 默认缓存策略 |
|----------|-------------|
| API Key | `cacheRetention: "short"` |
| OAuth | 不设置（使用 Provider 默认） |

### 缓存目标判断

`isAnthropicCacheRetentionTarget()` 判断哪些模型应该应用缓存策略：
- `anthropic/claude-*` 模型
- `amazon-bedrock/anthropic.claude-*` 模型

---

## 3. 重试策略 (Retry Strategy)

### 重试引擎

`src/provider-runtime/operation-retry.ts` 实现通用重试逻辑：

```typescript
// 重试配置
interface RetryConfig {
  maxRetries: number;        // 最大重试次数
  baseDelay: number;         // 基础延迟（毫秒）
  maxDelay: number;          // 最大延迟
  retryableErrors: string[]; // 可重试错误类型
}
```

### 重试行为

| 错误类型 | 重试策略 | 说明 |
|----------|----------|------|
| **429 Rate Limit** | 等待 `Retry-After` 后重试 | 尊重 Provider 的限流信号 |
| **5xx Server Error** | 指数退避重试 | 服务端临时故障 |
| **网络超时** | 立即重试 | 网络抖动 |
| **上下文溢出** | 触发 context pruning 后重试 | 消息太长 |
| **401/403** | 不重试 | 认证失败，需要用户干预 |

### 指数退避

```
重试 1: 等待 1s
重试 2: 等待 2s
重试 3: 等待 4s
重试 4: 等待 8s
...
最大等待: maxDelay（默认 30s）
```

---

## 4. 模型回退策略 (Model Failover)

### 回退链配置

```yaml
# config.yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-7"
      fallbacks:
        - "openai/gpt-4o"
        - "deepseek/deepseek-v4-pro"
```

### 回退触发条件

```
主模型请求失败
    → 检查错误类型
    → 如果是可回退错误（5xx、超时、限流）
    → 切换到 fallbacks[0]
    → 重试请求
    → 如果仍然失败，继续下一个 fallback
    → 所有 fallback 都失败 → 报错
```

### 不触发回退的错误

- 401/403（认证失败）
- 400 Bad Request（请求格式错误）
- 上下文溢出（触发 context pruning 而非回退）

---

## 5. 安全策略 (Security Policies)

### 5.1 SSRF 防护

`src/plugin-sdk/ssrf-policy.ts` 防止 Server-Side Request Forgery：

- 验证 Provider base URL 的合法性
- 阻止访问内网地址
- 限制重定向次数

### 5.2 API Key 安全

- API Key 存储在 `auth-profiles.json` 中
- 支持 Secret Ref 引用（从外部密钥管理系统读取）
- 日志中自动脱敏（`redact.ts`）

### 5.3 工具边界

`src/tools/boundary.ts` 定义工具的安全沙箱：
- 文件系统访问范围限制
- 命令执行白名单
- 网络访问控制

### 5.4 认证安全

- Token 过期检测
- OAuth token 自动刷新
- 多 Profile 隔离

---

## 6. 流处理策略 (Stream Processing Policies)

### 6.1 Beta Header 注入 (Anthropic)

```typescript
// Anthropic 需要注入 beta headers 来启用特殊功能
const ANTHROPIC_DEFAULT_BETAS = [
  "fine-grained-tool-streaming-2025-05-14",  // 精细工具流
  "interleaved-thinking-2025-05-14",          // 交错推理
];

const ANTHROPIC_OAUTH_BETAS = [
  "claude-code-20250219",  // Claude Code 支持
  "oauth-2025-04-20",      // OAuth 支持
  ...DEFAULT_BETAS,
];
```

### 6.2 Service Tier (Anthropic)

```typescript
type AnthropicServiceTier = "auto" | "standard_only";

// "auto" — 使用最优 tier（可能更快但更贵）
// "standard_only" — 仅使用标准 tier
```

### 6.3 Fast Mode (Anthropic)

`fastMode` 是 service tier 的便捷封装：
- `fastMode: true` → `serviceTier: "auto"`
- `fastMode: false` → `serviceTier: "standard_only"`

### 6.4 Thinking Prefill 处理 (Anthropic)

Anthropic 的扩展推理模式要求对话以 user turn 结束。`createAnthropicThinkingPrefillWrapper()` 自动移除尾部的 assistant prefill 消息：

```
原始: [user, assistant_prefill]
处理后: [user]
```

### 6.5 Payload Patch

`streamWithPayloadPatch()` 允许在发送请求前修改 HTTP payload：

```typescript
// 在保持 StreamFn 接口不变的情况下修改底层 HTTP 请求
streamWithPayloadPatch(baseStreamFn, model, context, options, (payload) => {
  // 修改 payload
  payload.service_tier = "auto";
  return payload;
});
```

### 6.6 Plaintext Tool Call 解析

对于不支持原生 function calling 的模型，解析文本输出中的工具调用：

```typescript
// 检测文本是否包含工具调用
parseStandalonePlainTextToolCallBlocks(text, toolNames);
// 支持的格式:
// 1. JSON 格式: {"name": "tool", "args": {...}}
// 2. XML 格式: <tool_use><name>tool</name>...</tool_use>
// 3. 自定义格式: ```tool_name\n{...}\n```
```

---

## 7. 上下文管理策略 (Context Management)

### 7.1 上下文窗口检测

```typescript
// 检测模型是否支持 1M context
isAnthropicGa1MModel(modelId): boolean;

// 1M context 模型列表
GA_1M_MODEL_PREFIXES = [
  "claude-opus-4-6", "claude-opus-4.6",
  "claude-opus-4-7", "claude-opus-4.7",
  "claude-sonnet-4-6", "claude-sonnet-4.6",
];
```

### 7.2 上下文溢出处理

```
请求超出上下文窗口
    → Provider 返回 context overflow 错误
    → matchesContextOverflowError() 检测
    → 触发 context pruning（修剪历史）
    → 重试请求
```

### 7.3 上下文修剪模式

```yaml
# config.yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"  # 基于缓存 TTL 修剪
      ttl: "1h"          # 保留最近 1 小时的历史
```

---

## 8. 用量与成本策略 (Usage & Cost)

### 用量快照

```typescript
// Provider 声明用量查询能力
fetchUsageSnapshot: async (ctx) => {
  return await fetchClaudeUsage(ctx.token, ctx.timeoutMs, ctx.fetchFn);
};
```

### Token 计数

| Token 类型 | 说明 |
|-----------|------|
| `input_tokens` | 输入 token 数 |
| `output_tokens` | 输出 token 数 |
| `cache_creation_input_tokens` | 缓存创建 token（Anthropic） |
| `cache_read_input_tokens` | 缓存读取 token（Anthropic） |
| `reasoning_tokens` | 推理 token 数（部分模型） |

### 成本计算

```typescript
interface ModelCatalogCost {
  input: number;   // 每百万输入 token 成本
  output: number;  // 每百万输出 token 成本
}
```

---

## 9. 模型前向兼容策略 (Forward Compatibility)

### 问题

新模型发布时（如 Claude Opus 4.7），旧版 OpenClaw 可能不认识新模型 ID。

### 解决方案

`resolveDynamicModel()` 通过模板克隆实现前向兼容：

```
用户请求: claude-opus-4-7
    → 检查是否有已知模板
    → 如果没有，基于 claude-opus-4-6 模板克隆
    → 覆盖模型 ID
    → 返回兼容的模型定义
```

### 模板链

```
claude-opus-4-7 → 基于 claude-opus-4-6 模板
claude-opus-4-6 → 基于 claude-opus-4-5 模板
...
```

---

## 10. 认证诊断策略 (Auth Doctor)

### Doctor Hint

当认证出现问题时，`buildAuthDoctorHint()` 生成诊断信息：

```
Doctor hint (for GitHub issue):
- provider: anthropic
- config: anthropic:default (provider=anthropic, mode=token)
- auth store oauth profiles: anthropic:oauth-xxx
- suggested profile: anthropic:oauth-xxx
Fix: run "openclaw doctor --yes"
```

### OAuth Profile 修复

`oauthProfileIdRepairs` 声明需要修复的旧版 Profile ID：

```typescript
oauthProfileIdRepairs: [
  {
    legacyProfileId: "anthropic:default",
    promptLabel: "Anthropic",
  },
];
```

---

## 11. 配置规范化策略 (Config Normalization)

### Provider 配置规范化

`normalizeConfig()` 规范化 Provider 特定配置：
- 设置默认 API 类型（如 `anthropic-messages`）
- 规范化模型列表
- 处理 Provider 别名（如 `bedrock` → `amazon-bedrock`）

### 默认配置应用

`applyConfigDefaults()` 应用 Provider 特定的默认值：
- 上下文修剪模式（Anthropic: `cache-ttl`）
- 心跳间隔（OAuth: `1h`, API Key: `30m`）
- 缓存保留策略

---

## 12. Web 搜索策略 (Web Search)

### 原生 Web 搜索

部分 Provider 支持原生 web 搜索：
- **OpenAI** — 通过 `web_search` 工具
- **Perplexity** — 内置搜索
- **Brave** — 搜索 API

### 搜索配置

```typescript
// Provider 声明 web 搜索能力
hasNativeWebSearchTool(modelId): boolean;
// 配置搜索参数
resolveWebSearchConfig(config): WebSearchConfig;
```

---

## 策略总览表

| 策略类别 | 策略名称 | 实现位置 | 适用 Provider |
|----------|----------|----------|---------------|
| 重放 | OpenAI 兼容 | `provider-model-shared.ts` | DeepSeek, 大多数 |
| 重放 | Anthropic 原生 | `provider-model-shared.ts` | Anthropic |
| 重放 | Google Gemini | `provider-model-shared.ts` | Google |
| 缓存 | Prompt Cache | `config-defaults.ts` | Anthropic |
| 缓存 | Cache TTL | `register.runtime.ts` | Anthropic |
| 重试 | 指数退避 | `operation-retry.ts` | 所有 |
| 重试 | Rate Limit | `operation-retry.ts` | 所有 |
| 回退 | 模型回退 | Gateway 层 | 所有 |
| 安全 | SSRF 防护 | `ssrf-policy.ts` | 所有 |
| 安全 | Key 脱敏 | `redact.ts` | 所有 |
| 流式 | Beta Headers | `stream-wrappers.ts` | Anthropic |
| 流式 | Service Tier | `stream-wrappers.ts` | Anthropic |
| 流式 | Fast Mode | `stream-wrappers.ts` | Anthropic |
| 流式 | Thinking Prefill | `stream-wrappers.ts` | Anthropic |
| 流式 | V4 Thinking | `extensions/deepseek/stream.ts` | DeepSeek |
| 流式 | Payload Patch | `provider-stream-shared.ts` | 所有 |
| 流式 | Plaintext Tool | `tool-payload.ts` | 不支持原生工具的 |
| 上下文 | 1M Context | `register.runtime.ts` | Anthropic |
| 上下文 | Overflow 检测 | Provider 实现 | 所有 |
| 上下文 | Pruning | Gateway 层 | 所有 |
| 兼容 | 前向兼容 | `register.runtime.ts` | Anthropic |
| 兼容 | 模板克隆 | `provider-model-helpers.ts` | 所有 |
| 诊断 | Auth Doctor | `register.runtime.ts` | Anthropic |
| 搜索 | 原生搜索 | `native-web-search.ts` | OpenAI |
