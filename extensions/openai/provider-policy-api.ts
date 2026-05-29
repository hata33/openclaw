/**
 * @fileoverview Provider 策略 API
 *
 * 提供 Provider 级别的配置规范化和推理策略解析接口。
 * 作为策略层的入口，将具体的策略实现（如 thinking-policy.ts）
 * 与上层 Provider 注册逻辑解耦。
 *
 * 当前实现：
 * - normalizeConfig: 直接透传 Provider 配置（预留扩展点）
 * - resolveThinkingProfile: 根据 Provider ID 路由到对应的推理等级策略
 */

import type { ModelProviderConfig } from "openclaw/plugin-sdk/provider-model-types";
import {
  resolveOpenAICodexThinkingProfile,
  resolveOpenAIThinkingProfile,
} from "./thinking-policy.js";

/**
 * 规范化 Provider 配置
 *
 * 当前为直通实现，保留 Provider 配置原样不变。
 * 设计为扩展点，未来可在此处添加配置清洗或默认值填充逻辑。
 *
 * @param params.provider - Provider 标识符
 * @param params.providerConfig - 原始 Provider 配置
 * @returns 规范化后的 Provider 配置
 */
export function normalizeConfig(params: { provider: string; providerConfig: ModelProviderConfig }) {
  return params.providerConfig;
}

/**
 * 解析指定 Provider 和模型的推理等级配置
 *
 * 根据 provider 名称路由到对应的推理策略：
 * - "openai" → OpenAI 直连推理策略
 * - "openai-codex" → Codex 推理策略
 * - 其他 Provider → 返回 null（不支持推理配置）
 *
 * @param params.provider - Provider 标识符
 * @param params.modelId - 模型 ID
 * @returns 推理等级配置，若 Provider 不支持则返回 null
 */
export function resolveThinkingProfile(params: { provider: string; modelId: string }) {
  switch (params.provider.trim().toLowerCase()) {
    case "openai":
      return resolveOpenAIThinkingProfile(params.modelId);
    case "openai-codex":
      return resolveOpenAICodexThinkingProfile(params.modelId);
    default:
      return null;
  }
}
