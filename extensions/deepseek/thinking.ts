/**
 * DeepSeek 推理能力配置
 *
 * 本文件定义 DeepSeek V4 模型的 Thinking（推理/思考）能力配置：
 * 1. 定义支持的推理级别（off/minimal/low/medium/high/xhigh/max）
 * 2. 设置默认推理级别为 "high"，提供较强的推理能力
 * 3. 仅对 V4 系列模型启用推理配置，其他模型返回 undefined
 *
 * 推理级别说明：
 * - off: 关闭推理
 * - minimal: 最小推理
 * - low/medium/high: 递增的推理深度
 * - xhigh/max: 最大推理深度，消耗更多 token 但推理更深入
 */
import type { ProviderThinkingProfile } from "openclaw/plugin-sdk/plugin-entry";
import { isDeepSeekV4ModelId } from "./models.js";

const V4_THINKING_LEVEL_IDS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;

function buildDeepSeekV4ThinkingLevel(id: (typeof V4_THINKING_LEVEL_IDS)[number]) {
  return { id };
}

const DEEPSEEK_V4_THINKING_PROFILE = {
  levels: V4_THINKING_LEVEL_IDS.map(buildDeepSeekV4ThinkingLevel),
  defaultLevel: "high",
} satisfies ProviderThinkingProfile;

export function resolveDeepSeekV4ThinkingProfile(
  modelId: string,
): ProviderThinkingProfile | undefined {
  return isDeepSeekV4ModelId(modelId) ? DEEPSEEK_V4_THINKING_PROFILE : undefined;
}
