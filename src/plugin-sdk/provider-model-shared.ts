/**
 * @file Provider 模型共享模块
 *
 * 本文件是 Provider 插件系统的核心共享模块，提供模型相关的重放策略、模板克隆、
 * 思考模式配置等功能。这些功能被多个 Provider 插件共享使用。
 *
 * 主要功能分类：
 * 1. 重放策略（Replay Policy）- 定义如何处理多轮对话中的历史消息
 *    - openai-compatible: OpenAI 兼容格式的重放策略
 *    - anthropic-by-model: 根据 Claude 模型版本选择不同的重放策略
 *    - google-gemini: Google Gemini 格式的重放策略和历史清理
 *    - hybrid-anthropic-openai: 混合格式的重放策略
 *
 * 2. 思考模式（Thinking Profile）- 管理 Claude 模型的思考级别配置
 *    - 不同模型支持不同的思考级别（off/minimal/low/medium/high/adaptive/xhigh/max）
 *    - Opus 4.7 支持最高级别的思考模式
 *
 * 3. 模型辅助工具 - 模型前缀匹配、模板克隆等
 *
 * 设计决策：
 * - 重放策略族（Replay Family）将相似 Provider 的重放逻辑归类，减少重复代码
 * - 思考模式配置与模型 ID 绑定，确保每种模型使用正确的思考级别
 * - 所有 deprecated 标记表示这些函数不应被第三方插件使用，但保留用于内部兼容
 */

// Shared model/catalog helpers for provider plugins.
//
// Keep provider-owned exports out of this subpath so plugin loaders can import it
// without recursing through provider-specific facades.

import {
  buildAnthropicReplayPolicyForModel,
  buildGoogleGeminiReplayPolicy,
  buildHybridAnthropicOrOpenAIReplayPolicy,
  buildNativeAnthropicReplayPolicyForModel,
  buildOpenAICompatibleReplayPolicy,
  buildPassthroughGeminiSanitizingReplayPolicy,
  buildStrictAnthropicReplayPolicy,
  resolveTaggedReasoningOutputMode,
  sanitizeGoogleGeminiReplayHistory,
} from "../plugins/provider-replay-helpers.js";
import type { ProviderPlugin } from "../plugins/types.js";
import type {
  ProviderReasoningOutputModeContext,
  ProviderReplayPolicyContext,
  ProviderSanitizeReplayHistoryContext,
  ProviderThinkingProfile,
} from "./plugin-entry.js";
import {
  normalizeAntigravityPreviewModelId,
  normalizeGooglePreviewModelId,
} from "./provider-model-id-normalize.js";

export type {
  ModelApi,
  ModelProviderDeclarationConfig as ModelProviderConfig,
} from "../config/types.models.js";
export type {
  UnifiedModelCatalogEntry,
  UnifiedModelCatalogKind,
  UnifiedModelCatalogSource,
} from "../model-catalog/types.js";
export type {
  BedrockDiscoveryConfig,
  ModelCompatConfig,
  ModelDefinitionConfig,
} from "../config/types.models.js";
export type {
  ProviderEndpointClass,
  ProviderEndpointResolution,
} from "../agents/provider-attribution.js";
export type {
  ProviderPlugin,
  UnifiedModelCatalogProviderContext,
  UnifiedModelCatalogProviderPlugin,
} from "../plugins/types.js";

export { DEFAULT_CONTEXT_TOKENS } from "../agents/defaults.js";
export {
  GPT5_BEHAVIOR_CONTRACT,
  GPT5_FRIENDLY_CHAT_PROMPT_OVERLAY,
  GPT5_FRIENDLY_PROMPT_OVERLAY,
  GPT5_HEARTBEAT_PROMPT_OVERLAY,
  isGpt5ModelId,
  normalizeGpt5PromptOverlayMode,
  renderGpt5PromptOverlay,
  resolveGpt5PromptOverlayMode,
  resolveGpt5SystemPromptContribution,
  type Gpt5PromptOverlayMode,
} from "../agents/gpt5-prompt-overlay.js";
export { resolveProviderEndpoint } from "../agents/provider-attribution.js";
export {
  applyModelCompatPatch,
  hasToolSchemaProfile,
  hasNativeWebSearchTool,
  normalizeModelCompat,
  resolveUnsupportedToolSchemaKeywords,
  resolveToolCallArgumentsEncoding,
} from "../plugins/provider-model-compat.js";
export { normalizeProviderId } from "../agents/provider-id.js";
export {
  buildAnthropicReplayPolicyForModel,
  buildGoogleGeminiReplayPolicy,
  buildHybridAnthropicOrOpenAIReplayPolicy,
  buildNativeAnthropicReplayPolicyForModel,
  buildOpenAICompatibleReplayPolicy,
  buildPassthroughGeminiSanitizingReplayPolicy,
  resolveTaggedReasoningOutputMode,
  sanitizeGoogleGeminiReplayHistory,
  buildStrictAnthropicReplayPolicy,
};
export {
  createMoonshotThinkingWrapper,
  resolveMoonshotThinkingType,
} from "../agents/pi-embedded-runner/moonshot-thinking-stream-wrappers.js";
export {
  cloneFirstTemplateModel,
  matchesExactOrPrefix,
} from "../plugins/provider-model-helpers.js";
import { normalizeOptionalLowercaseString } from "../shared/string-coerce.js";

const CLAUDE_OPUS_47_MODEL_PREFIXES = ["claude-opus-4-7", "claude-opus-4.7"] as const;
const CLAUDE_ADAPTIVE_THINKING_DEFAULT_MODEL_PREFIXES = [
  "claude-opus-4-6",
  "claude-opus-4.6",
  "claude-sonnet-4-6",
  "claude-sonnet-4.6",
] as const;
const BASE_CLAUDE_THINKING_LEVELS = [
  { id: "off" },
  { id: "minimal" },
  { id: "low" },
  { id: "medium" },
  { id: "high" },
] as const satisfies ProviderThinkingProfile["levels"];

function getModelProviderHint(modelId: string): string | null {
  const trimmed = normalizeOptionalLowercaseString(modelId);
  if (!trimmed) {
    return null;
  }
  const slashIndex = trimmed.indexOf("/");
  if (slashIndex <= 0) {
    return null;
  }
  return trimmed.slice(0, slashIndex) || null;
}

/** @deprecated Proxy provider-owned model helper; do not use from third-party plugins. */
export function isProxyReasoningUnsupportedModelHint(modelId: string): boolean {
  return getModelProviderHint(modelId) === "x-ai";
}

function matchesClaudeModelPrefix(modelId: string, prefixes: readonly string[]): boolean {
  const lower = normalizeOptionalLowercaseString(modelId);
  return Boolean(lower && prefixes.some((prefix) => lower.startsWith(prefix)));
}

function isClaudeOpus47ModelId(modelId: string): boolean {
  return matchesClaudeModelPrefix(modelId, CLAUDE_OPUS_47_MODEL_PREFIXES);
}

/** @deprecated Anthropic provider-owned model helper; do not use from third-party plugins. */
export function isClaudeAdaptiveThinkingDefaultModelId(modelId: string): boolean {
  return matchesClaudeModelPrefix(modelId, CLAUDE_ADAPTIVE_THINKING_DEFAULT_MODEL_PREFIXES);
}

/** @deprecated Anthropic provider-owned model helper; do not use from third-party plugins. */
export function resolveClaudeThinkingProfile(modelId: string): ProviderThinkingProfile {
  if (isClaudeOpus47ModelId(modelId)) {
    return {
      levels: [...BASE_CLAUDE_THINKING_LEVELS, { id: "xhigh" }, { id: "adaptive" }, { id: "max" }],
      defaultLevel: "off",
    };
  }
  if (isClaudeAdaptiveThinkingDefaultModelId(modelId)) {
    return {
      levels: [...BASE_CLAUDE_THINKING_LEVELS, { id: "adaptive" }],
      defaultLevel: "adaptive",
    };
  }
  return { levels: BASE_CLAUDE_THINKING_LEVELS };
}

export { normalizeAntigravityPreviewModelId, normalizeGooglePreviewModelId };

export type ProviderReplayFamily =
  | "openai-compatible"
  | "anthropic-by-model"
  | "native-anthropic-by-model"
  | "google-gemini"
  | "passthrough-gemini"
  | "hybrid-anthropic-openai";

type ProviderReplayFamilyHooks = Pick<
  ProviderPlugin,
  "buildReplayPolicy" | "sanitizeReplayHistory" | "resolveReasoningOutputMode"
>;

type BuildProviderReplayFamilyHooksOptions =
  | {
      family: "openai-compatible";
      sanitizeToolCallIds?: boolean;
      dropReasoningFromHistory?: boolean;
    }
  | { family: "anthropic-by-model" }
  | { family: "native-anthropic-by-model" }
  | { family: "google-gemini" }
  | { family: "passthrough-gemini" }
  | {
      family: "hybrid-anthropic-openai";
      anthropicModelDropThinkingBlocks?: boolean;
    };

export function buildProviderReplayFamilyHooks(
  options: BuildProviderReplayFamilyHooksOptions,
): ProviderReplayFamilyHooks {
  switch (options.family) {
    case "openai-compatible": {
      const policyOptions = {
        sanitizeToolCallIds: options.sanitizeToolCallIds,
        dropReasoningFromHistory: options.dropReasoningFromHistory,
      };
      return {
        buildReplayPolicy: (ctx: ProviderReplayPolicyContext) =>
          buildOpenAICompatibleReplayPolicy(ctx.modelApi, {
            ...policyOptions,
            modelId: ctx.modelId,
          }),
      };
    }
    case "anthropic-by-model":
      return {
        buildReplayPolicy: ({ modelId }: ProviderReplayPolicyContext) =>
          buildAnthropicReplayPolicyForModel(modelId),
      };
    case "native-anthropic-by-model":
      return {
        buildReplayPolicy: ({ modelId }: ProviderReplayPolicyContext) =>
          buildNativeAnthropicReplayPolicyForModel(modelId),
      };
    case "google-gemini":
      return {
        buildReplayPolicy: () => buildGoogleGeminiReplayPolicy(),
        sanitizeReplayHistory: (ctx: ProviderSanitizeReplayHistoryContext) =>
          sanitizeGoogleGeminiReplayHistory(ctx),
        resolveReasoningOutputMode: (_ctx: ProviderReasoningOutputModeContext) =>
          resolveTaggedReasoningOutputMode(),
      };
    case "passthrough-gemini":
      return {
        buildReplayPolicy: ({ modelId }: ProviderReplayPolicyContext) =>
          buildPassthroughGeminiSanitizingReplayPolicy(modelId),
      };
    case "hybrid-anthropic-openai":
      return {
        buildReplayPolicy: (ctx: ProviderReplayPolicyContext) =>
          buildHybridAnthropicOrOpenAIReplayPolicy(ctx, {
            anthropicModelDropThinkingBlocks: options.anthropicModelDropThinkingBlocks,
          }),
      };
  }
  throw new Error("Unsupported provider replay family");
}

/** @deprecated Provider-owned replay hook shortcut; use local provider hooks instead. */
export const OPENAI_COMPATIBLE_REPLAY_HOOKS = buildProviderReplayFamilyHooks({
  family: "openai-compatible",
});

/** @deprecated Anthropic provider-owned replay hook shortcut; use local provider hooks instead. */
export const ANTHROPIC_BY_MODEL_REPLAY_HOOKS = buildProviderReplayFamilyHooks({
  family: "anthropic-by-model",
});

/** @deprecated Anthropic provider-owned replay hook shortcut; use local provider hooks instead. */
export const NATIVE_ANTHROPIC_REPLAY_HOOKS = buildProviderReplayFamilyHooks({
  family: "native-anthropic-by-model",
});

/** @deprecated Google provider-owned replay hook shortcut; use local provider hooks instead. */
export const PASSTHROUGH_GEMINI_REPLAY_HOOKS = buildProviderReplayFamilyHooks({
  family: "passthrough-gemini",
});
