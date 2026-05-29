/**
 * Google Provider 策略 API
 *
 * 本文件提供 Google Gemini 提供者的策略层面接口：
 * 1. normalizeConfig: 规范化 Google Provider 配置
 * 2. resolveThinkingProfile: 解析模型的思考/推理配置
 *
 * 这些函数是 Provider 策略的标准接口，由插件系统在配置加载阶段调用。
 */
import type { ProviderDefaultThinkingPolicyContext } from "openclaw/plugin-sdk/core";
import type { ModelProviderConfig } from "openclaw/plugin-sdk/provider-model-types";
import { normalizeGoogleProviderConfig, resolveGoogleThinkingProfile } from "./provider-policy.js";

export function normalizeConfig(params: { provider: string; providerConfig: ModelProviderConfig }) {
  return normalizeGoogleProviderConfig(params.provider, params.providerConfig);
}

export function resolveThinkingProfile(context: ProviderDefaultThinkingPolicyContext) {
  return resolveGoogleThinkingProfile(context);
}
