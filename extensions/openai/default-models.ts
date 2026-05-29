/**
 * @fileoverview OpenAI 默认模型配置
 *
 * 定义 OpenAI 各类能力的默认模型标识符，以及 Provider 初始化时的配置应用逻辑。
 * 这些默认值被各 Provider 模块引用，确保在用户未显式指定模型时有合理的回退值。
 *
 * 覆盖的能力领域：
 * - 文本生成（GPT 系列）
 * - 图片生成（gpt-image 系列）
 * - 语音合成（TTS 系列）
 * - 音频转录（Whisper/gpt-4o-transcribe）
 * - 文本嵌入（text-embedding 系列）
 */

import { ensureModelAllowlistEntry } from "openclaw/plugin-sdk/provider-onboard";
import {
  applyAgentDefaultModelPrimary,
  type OpenClawConfig,
} from "openclaw/plugin-sdk/provider-onboard";

/** 默认文本生成模型（通过 openai/ 前缀标识 provider 路由） */
export const OPENAI_DEFAULT_MODEL = "openai/gpt-5.5";
/** Codex 默认模型与 OpenAI 主模型保持一致 */
export const OPENAI_CODEX_DEFAULT_MODEL = OPENAI_DEFAULT_MODEL;
/** 默认图片生成模型 */
export const OPENAI_DEFAULT_IMAGE_MODEL = "gpt-image-2";
/** 默认语音合成模型 */
export const OPENAI_DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
/** 默认 TTS 语音音色 */
export const OPENAI_DEFAULT_TTS_VOICE = "alloy";
/** 默认音频转录模型 */
export const OPENAI_DEFAULT_AUDIO_TRANSCRIPTION_MODEL = "gpt-4o-transcribe";
/** 默认文本嵌入模型 */
export const OPENAI_DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * 应用 OpenAI Provider 的基础配置
 *
 * 确保默认模型被加入模型白名单，并为默认模型设置 "GPT" 别名（如果尚未设置）。
 * 这使得用户可以通过 "GPT" 别名快速引用默认模型。
 *
 * @param cfg - 当前的 OpenClaw 配置
 * @returns 更新后的配置（包含模型白名单条目和别名）
 */
export function applyOpenAIProviderConfig(cfg: OpenClawConfig): OpenClawConfig {
  const next = ensureModelAllowlistEntry({
    cfg,
    modelRef: OPENAI_DEFAULT_MODEL,
  });
  const models = { ...next.agents?.defaults?.models };
  models[OPENAI_DEFAULT_MODEL] = {
    ...models[OPENAI_DEFAULT_MODEL],
    // 如果别名尚未设置则使用 "GPT" 作为默认别名
    alias: models[OPENAI_DEFAULT_MODEL]?.alias ?? "GPT",
  };

  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        models,
      },
    },
  };
}

/**
 * 应用完整的 OpenAI 配置（含主模型设置）
 *
 * 在 applyOpenAIProviderConfig 基础上，额外将 OpenAI 默认模型设为代理的主模型。
 * 这确保 OpenAI Provider 注册后，新代理默认使用 OpenAI 模型。
 *
 * @param cfg - 当前的 OpenClaw 配置
 * @returns 完整应用后的配置
 */
export function applyOpenAIConfig(cfg: OpenClawConfig): OpenClawConfig {
  return applyAgentDefaultModelPrimary(applyOpenAIProviderConfig(cfg), OPENAI_DEFAULT_MODEL);
}
