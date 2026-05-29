/**
 * @fileoverview OpenAI 系统提示增强（Prompt Overlay）
 *
 * 管理 GPT-5 系列模型的系统提示词增强逻辑。
 * "Prompt Overlay" 是一种机制，在基础系统提示之上叠加特定于模型的行为指令，
 * 以引导模型表现出更理想的交互风格。
 *
 * 增强内容包括：
 * - 友好聊天提示（FRIENDLY_PROMPT_OVERLAY）：使模型在对话中更友好自然
 * - 心跳提示（HEARTBEAT_PROMPT_OVERLAY）：指导模型在心跳检测中的行为
 * - 行为契约（BEHAVIOR_CONTRACT）：定义模型必须遵守的行为边界
 *
 * 该机制仅对 GPT-5 系列模型生效（通过 isGpt5ModelId 判断），
 * 并可通过配置禁用或自定义 overlay 模式。
 */

import {
  GPT5_BEHAVIOR_CONTRACT,
  GPT5_FRIENDLY_CHAT_PROMPT_OVERLAY,
  GPT5_HEARTBEAT_PROMPT_OVERLAY,
  isGpt5ModelId,
  resolveGpt5PromptOverlayMode,
  resolveGpt5SystemPromptContribution,
  type Gpt5PromptOverlayMode,
} from "openclaw/plugin-sdk/provider-model-shared";

/** 支持 Prompt Overlay 的 Provider ID 集合 */
const OPENAI_PROVIDER_IDS = new Set(["openai", "openai-codex"]);

/** 友好聊天提示词模板，引导模型以更自然友好的方式对话 */
export const OPENAI_FRIENDLY_PROMPT_OVERLAY = GPT5_FRIENDLY_CHAT_PROMPT_OVERLAY;
/** 心跳检测提示词模板，指导模型在心跳场景下的行为 */
export const OPENAI_HEARTBEAT_PROMPT_OVERLAY = GPT5_HEARTBEAT_PROMPT_OVERLAY;
/** GPT-5 行为契约，定义模型必须遵守的行为边界 */
export const OPENAI_GPT5_BEHAVIOR_CONTRACT = GPT5_BEHAVIOR_CONTRACT;

type OpenAIPromptOverlayMode = Gpt5PromptOverlayMode;

/**
 * 解析 OpenAI Prompt Overlay 的模式
 *
 * 根据插件配置决定 overlay 模式（如 "friendly"、"professional" 等）。
 * 当前委托给 GPT-5 通用解析逻辑，因为 OpenAI 和 GPT-5 共享同一套模式系统。
 *
 * @param pluginConfig - 可选的插件配置对象
 * @returns 解析后的 overlay 模式
 */
export function resolveOpenAIPromptOverlayMode(
  pluginConfig?: Record<string, unknown>,
): OpenAIPromptOverlayMode {
  return resolveGpt5PromptOverlayMode(undefined, pluginConfig);
}

/**
 * 判断是否应对指定模型应用 Prompt Overlay
 *
 * 需同时满足两个条件：
 * 1. Provider 是 OpenAI 或 Codex
 * 2. 模型属于 GPT-5 系列
 *
 * @param params.modelProviderId - Provider 标识符
 * @param params.modelId - 模型标识符
 * @returns 是否应该应用 overlay
 */
export function shouldApplyOpenAIPromptOverlay(params: {
  modelProviderId?: string;
  modelId?: string;
}): boolean {
  return OPENAI_PROVIDER_IDS.has(params.modelProviderId ?? "") && isGpt5ModelId(params.modelId);
}

/**
 * 解析 OpenAI 系统提示贡献内容
 *
 * 这是 Prompt Overlay 机制的核心入口，负责：
 * 1. 判断当前模型是否适用 overlay
 * 2. 解析 overlay 模式
 * 3. 将 overlay 内容注入到系统提示中
 *
 * @param params.config - 全局配置
 * @param params.legacyPluginConfig - 旧版插件配置（兼容性）
 * @param params.mode - overlay 模式
 * @param params.modelProviderId - Provider 标识符
 * @param params.modelId - 模型标识符
 * @param params.trigger - 触发上下文（如 "chat"、"heartbeat"）
 * @returns 系统提示贡献内容，不适用时返回空
 */
export function resolveOpenAISystemPromptContribution(params: {
  config?: Parameters<typeof resolveGpt5SystemPromptContribution>[0]["config"];
  legacyPluginConfig?: Record<string, unknown>;
  mode?: OpenAIPromptOverlayMode;
  modelProviderId?: string;
  modelId?: string;
  trigger?: Parameters<typeof resolveGpt5SystemPromptContribution>[0]["trigger"];
}) {
  return resolveGpt5SystemPromptContribution({
    config: params.config,
    legacyPluginConfig:
      params.mode === undefined ? params.legacyPluginConfig : { personality: params.mode },
    modelId: params.modelId,
    trigger: params.trigger,
    enabled: shouldApplyOpenAIPromptOverlay({
      modelProviderId: params.modelProviderId,
      modelId: params.modelId,
    }),
  });
}
