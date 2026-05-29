/**
 * Amazon Bedrock Provider 策略 API
 *
 * 本文件提供 Bedrock 提供者的策略接口，
 * 用于在配置规范化阶段解析模型的思考/推理配置。
 */
import { normalizeProviderId } from "openclaw/plugin-sdk/provider-model-shared";
import { resolveBedrockClaudeThinkingProfile } from "./thinking-policy.js";

export function resolveThinkingProfile(params: { provider: string; modelId: string }) {
  if (normalizeProviderId(params.provider) !== "amazon-bedrock") {
    return null;
  }
  return resolveBedrockClaudeThinkingProfile(params.modelId);
}
