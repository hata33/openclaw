/**
 * Ollama Provider 策略 API
 *
 * 本文件提供 Ollama 提供者的策略层面功能：
 * 1. normalizeConfig：规范化 Ollama 提供者配置
 *    - 当 baseUrl 缺失时自动填充本地默认地址（http://127.0.0.1:11434）
 *    - 当 models 未定义时设为空数组，表示需要动态发现
 * 2. resolveThinkingProfile：根据模型是否支持推理返回对应的思考配置
 *    - 推理模型：支持 off/low/medium/high/max 五级推理，默认关闭
 *    - 非推理模型：仅支持 off 级别
 *
 * "策略 API"在配置加载和规范化阶段被调用，确保 Ollama 配置的完整性。
 */
import type { ProviderThinkingProfile } from "openclaw/plugin-sdk/plugin-entry";
import type { ModelProviderConfig } from "openclaw/plugin-sdk/provider-model-types";
import { OLLAMA_DEFAULT_BASE_URL } from "./src/defaults.js";

type OllamaProviderConfigDraft = Partial<ModelProviderConfig>;

const OLLAMA_REASONING_THINKING_PROFILE = {
  levels: [{ id: "off" }, { id: "low" }, { id: "medium" }, { id: "high" }, { id: "max" }],
  defaultLevel: "off",
} satisfies ProviderThinkingProfile;

const OLLAMA_NON_REASONING_THINKING_PROFILE = {
  levels: [{ id: "off" }],
  defaultLevel: "off",
} satisfies ProviderThinkingProfile;

/**
 * Provider policy surface for Ollama: normalize provider configs used by
 * core defaults/normalizers. This runs during config defaults application and
 * normalization paths (not Zod validation).
 */
export function normalizeConfig({
  provider,
  providerConfig,
}: {
  provider: string;
  providerConfig: OllamaProviderConfigDraft;
}): OllamaProviderConfigDraft {
  if (!providerConfig || typeof providerConfig !== "object") {
    return providerConfig;
  }

  const normalizedProviderId = (provider ?? "").trim().toLowerCase();
  if (normalizedProviderId !== "ollama") {
    return providerConfig;
  }

  const next: OllamaProviderConfigDraft = { ...providerConfig };

  // If baseUrl is missing, empty, or whitespace-only, default to local Ollama host.
  if (typeof next.baseUrl !== "string" || !next.baseUrl.trim()) {
    next.baseUrl = OLLAMA_DEFAULT_BASE_URL;
  }

  // If models is missing/not an array, default to empty array to signal discovery.
  if (!Array.isArray(next.models)) {
    next.models = [];
  }

  return next;
}

export function resolveThinkingProfile({
  reasoning,
}: {
  reasoning?: boolean;
}): ProviderThinkingProfile {
  return reasoning ? OLLAMA_REASONING_THINKING_PROFILE : OLLAMA_NON_REASONING_THINKING_PROFILE;
}
