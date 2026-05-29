/**
 * @fileoverview OpenAI 推理（Thinking）策略配置
 *
 * 定义 OpenAI 和 Codex Provider 的推理能力等级配置。
 * 推理等级决定了模型在响应前进行的思考深度：
 * - off: 关闭推理
 * - minimal: 最小推理
 * - low: 低推理
 * - medium: 中等推理
 * - high: 高推理
 * - xhigh: 超高推理（仅限支持的模型）
 *
 * 不同模型支持不同的最大推理等级，例如较新的 gpt-5.4/5.5 系列支持 xhigh，
 * 而旧模型不支持。此模块根据模型 ID 动态决定可用的推理等级列表。
 */

import type { ProviderThinkingProfile } from "openclaw/plugin-sdk/plugin-entry";

/** 基础推理等级列表，所有 OpenAI 模型都支持 */
const OPENAI_THINKING_BASE_LEVELS = [
  { id: "off" },
  { id: "minimal" },
  { id: "low" },
  { id: "medium" },
  { id: "high" },
] as const satisfies ProviderThinkingProfile["levels"];

/** 支持 xhigh 推理等级的 OpenAI 直连模型 ID 列表 */
const OPENAI_XHIGH_MODEL_IDS = [
  "gpt-5.5",
  "gpt-5.5-pro",
  "gpt-5.4",
  "gpt-5.4-pro",
  "gpt-5.4-mini",
  "gpt-5.4-nano",
] as const;

/** 支持 xhigh 推理等级的 Codex 模型 ID 列表 */
const OPENAI_CODEX_XHIGH_MODEL_IDS = [
  "gpt-5.5",
  "gpt-5.5-pro",
  "gpt-5.4",
  "gpt-5.4-pro",
  "gpt-5.3-codex-spark",
] as const;

/**
 * 将模型 ID 标准化为小写形式
 */
function normalizeModelId(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * 判断模型 ID 是否精确匹配或以前缀匹配某个已知模型 ID
 *
 * 使用前缀匹配是为了支持版本号后缀场景，如 "gpt-5.4-custom" 应匹配 "gpt-5.4"
 */
function matchesExactOrPrefix(id: string, values: readonly string[]): boolean {
  const normalizedId = normalizeModelId(id);
  return values.some((value) => {
    const normalizedValue = normalizeModelId(value);
    return normalizedId === normalizedValue || normalizedId.startsWith(normalizedValue);
  });
}

/**
 * 构建推理等级配置
 *
 * 根据模型 ID 和支持 xhigh 的模型列表，生成该模型可用的完整推理等级 profile。
 * 如果模型在 xhigh 列表中，则在基础等级之上追加 xhigh 等级。
 */
function buildOpenAIThinkingProfile(params: {
  modelId: string;
  xhighModelIds: readonly string[];
}): ProviderThinkingProfile {
  return {
    levels: [
      ...OPENAI_THINKING_BASE_LEVELS,
      // 仅当模型支持时才追加 xhigh 等级
      ...(matchesExactOrPrefix(params.modelId, params.xhighModelIds)
        ? [{ id: "xhigh" as const }]
        : []),
    ],
  };
}

/**
 * 解析 OpenAI 直连 Provider 的推理等级配置
 *
 * @param modelId - 模型标识符
 * @returns 该模型可用的推理等级配置
 */
export function resolveOpenAIThinkingProfile(modelId: string): ProviderThinkingProfile {
  return buildOpenAIThinkingProfile({ modelId, xhighModelIds: OPENAI_XHIGH_MODEL_IDS });
}

/**
 * 解析 OpenAI Codex Provider 的推理等级配置
 *
 * Codex 模型的 xhigh 支持列表与直连模型略有不同（如包含 codex-spark）
 *
 * @param modelId - 模型标识符
 * @returns 该模型可用的推理等级配置
 */
export function resolveOpenAICodexThinkingProfile(modelId: string): ProviderThinkingProfile {
  return buildOpenAIThinkingProfile({ modelId, xhighModelIds: OPENAI_CODEX_XHIGH_MODEL_IDS });
}
