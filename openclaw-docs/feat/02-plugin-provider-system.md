# 02 — 插件与 Provider 系统

> OpenClaw 的插件系统是整个项目的骨架。Provider（模型提供商）、渠道、工具、记忆、
> 语音——几乎一切都是插件。本文档剖析插件系统和 Provider 子系统的核心实现。

## 插件系统概览

OpenClaw 有两种插件风格：

1. **Code Plugin（代码插件）** — 运行时加载，通过 SDK 注册钩子、Provider、工具等
2. **Bundle Plugin（打包插件）** — 打包技能、MCP 服务器等静态资源，接口更简单

### 插件加载流程

```
Gateway 启动
  → 扫描 extensions/ 目录（本地插件）
  → 扫描 npm 安装的插件包
  → 解析每个插件的 manifest.json
  → 注册 Provider / Channel / Tool / Hook
  → 插件激活（activation）
  → Gateway 就绪
```

### 插件注册入口

每个插件通过 `index.ts` 暴露注册入口：

```typescript
// extensions/anthropic/index.ts
import { defineSingleProviderPluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default defineSingleProviderPluginEntry({
  id: "anthropic",
  label: "Anthropic",
  register: registerAnthropicPlugin,
});
```

`defineSingleProviderPluginEntry` 和 `definePluginEntry` 是插件 SDK 的核心函数（定义在 `src/plugin-sdk/plugin-entry.ts`），它们：

1. 定义插件的元数据（ID、标签、文档路径）
2. 声明插件提供的能力（Provider、Channel、Tool 等）
3. 提供注册回调，让插件在运行时向 Gateway 注册自己

## ProviderPlugin 接口

Provider 是 OpenClaw 最核心的插件类型。每个 LLM 提供商（Anthropic、OpenAI、DeepSeek 等）都实现 `ProviderPlugin` 接口：

```typescript
interface ProviderPlugin {
  id: string;                              // "anthropic"
  label: string;                           // "Anthropic"
  auth: AuthMethod[];                      // 认证方式列表
  normalizeConfig(params): void;           // 规范化配置
  applyConfigDefaults(params): void;       // 应用默认配置
  resolveDynamicModel(ctx): RuntimeModel | undefined;  // 动态模型解析
  normalizeResolvedModel(ctx): RuntimeModel | undefined;  // 模型规范化
  resolveSyntheticAuth(ctx): SyntheticAuth | undefined;   // 合成认证
  augmentModelCatalog(): CatalogEntry[];   // 模型目录扩展
  buildReplayPolicy(): ReplayPolicy;       // 重放策略
  isModernModelRef(params): boolean;       // 是否为现代模型
  resolveReasoningOutputMode(): string;    // 推理输出模式
  resolveThinkingProfile(params): ThinkingProfile;  // 推理配置
  wrapStreamFn(ctx): StreamFn;             // 流式包装
  resolveUsageAuth(ctx): Promise<string>;  // 用量查询认证
  fetchUsageSnapshot(ctx): Promise<UsageSnapshot>;  // 用量快照
  isCacheTtlEligible(): boolean;           // 是否启用缓存 TTL
  buildAuthDoctorHint(ctx): string;        // 认证诊断提示
}
```

这个接口看似复杂，但每个方法都有明确的职责，可以按需实现（大部分可选）。

## 三种认证方式

OpenClaw 支持三种 Provider 认证方式：

### 1. API Key（最常见）
```typescript
createProviderApiKeyAuthMethod({
  providerId: "anthropic",
  envVar: "ANTHROPIC_API_KEY",
  promptMessage: "Enter Anthropic API key",
  defaultModel: "anthropic/claude-opus-4-7",
});
```

### 2. OAuth（OpenAI、Google 等）
```typescript
// 通过 OAuth 流程获取 token
// 支持 token 刷新和 profile 管理
```

### 3. CLI 复用（Anthropic Claude CLI）
```typescript
// 读取本地 Claude CLI 的认证凭证
// 零配置，直接复用已有的登录状态
```

### Auth Profile 系统

所有认证凭证都存储在 Auth Profile Store 中：

```
~/.openclaw/state/auth-profiles.json
{
  "anthropic:default": {
    "type": "token",
    "provider": "anthropic",
    "token": "sk-...",
    "expires": 1735689600000
  },
  "openai:oauth": {
    "type": "oauth",
    "provider": "openai",
    "accessToken": "ey...",
    "refreshToken": "..."
  }
}
```

支持多 Profile 并存、自动轮转和故障转移。

## 模型目录与动态解析

### 静态模型目录

每个 Provider 在代码中定义支持的模型（在 Provider 文件中，如 `extensions/openai/openai-provider.ts`）：

```typescript
const MODEL_CATALOG = [
  {
    id: "gpt-5.5",
    contextWindow: 1_048_576,
    maxOutput: 32768,
    input: ["text", "image"],
    cost: { input: 2.5, output: 10.0 },
    supportsReasoning: true,
  },
  // ...
];
```

### 动态模型解析（前向兼容）

当用户请求一个未知的模型 ID 时，Provider 通过**模板克隆**实现前向兼容：

```
用户请求: "claude-opus-4-7"
  → 检查静态目录 → 未找到
  → resolveDynamicModel() 尝试模板匹配
  → 从 "claude-opus-4-6" 克隆定义
  → 替换模型 ID，保留其他参数
  → 返回克隆后的模型定义
```

这确保用户在 OpenClaw 更新前就能使用新模型。

### 模型规范化

模型解析后，`normalizeResolvedModel()` 会补充隐含能力：

```
原始定义: { id: "claude-opus-4-7", contextWindow: 200000 }
  → 补充图片输入: input = ["text", "image"]
  → 扩展上下文窗口: contextWindow = 1_048_576
  → 设置图片最大尺寸: maxSidePx = 2576
```

## 流式处理管道

Provider 的流式处理通过**包装器链**实现：

```
原始流 → Beta Headers → Service Tier → Fast Mode → Thinking Prefill → 最终输出
```

每个包装器是一个函数，接收基础流函数，返回增强后的流函数：

```typescript
// 简化示意
type WrapStreamFn = (baseStream: StreamFn) => StreamFn;

// 包装器链组合
const finalStream = compose(
  betaHeadersWrapper,
  serviceTierWrapper,
  fastModeWrapper,
  thinkingPrefillWrapper,
)(rawStreamFn);
```

这种模式允许灵活组合，不同 Provider 可以选择不同的包装器组合。

## 模型选择与故障转移

### Primary + Fallback 模型

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-7"
      fallbacks:
        - "openai/gpt-5.5"
        - "google/gemini-2.5-pro"
```

当 Primary 模型不可用时，自动切换到 Fallback。

### 模型选择优先级

```
1. 用户显式指定（--model xxx）
2. Session 级别的 model override
3. Agent 配置的 primary model
4. Provider 的默认模型
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/plugin-sdk/plugin-entry.ts` | `definePluginEntry` / `defineSingleProviderPluginEntry` 定义 |
| `src/plugin-sdk/provider-stream-shared.ts` | 流式处理共享逻辑 |
| `src/plugin-sdk/provider-auth.ts` | 认证框架 |
| `src/plugin-sdk/provider-model-shared.ts` | 模型共享逻辑（模板克隆等） |
| `src/model-catalog/` | 模型目录系统 |
| `src/plugins/plugin-registry.ts` | 插件注册中心 |
| `src/plugins/loader.ts` | 插件加载器 |
| `extensions/anthropic/register.runtime.ts` | Anthropic Provider 完整实现 |

## 总结

OpenClaw 的插件与 Provider 系统有以下特点：

1. **接口统一** — 所有 Provider 实现同一个 `ProviderPlugin` 接口
2. **认证灵活** — API Key、OAuth、CLI 复用三种方式，支持多 Profile
3. **前向兼容** — 模板克隆机制让旧版 OpenClaw 支持新模型
4. **流式包装** — 装饰器模式组合流式处理管道
5. **能力协商** — 模型能力（图片、推理、1M 上下文）通过规范化自动补充
