/**
 * @fileoverview Anthropic Provider 策略 API（Provider Policy API）
 *
 * 本文件暴露 Anthropic Provider 的策略层接口，供外部模块调用。
 * "策略"是指在不依赖完整 Provider 运行时的情况下，对 Provider 配置进行标准化
 * 和默认值应用的能力。
 *
 * 与 register.runtime.ts 的区别：
 * - register.runtime.ts 注册完整的 Provider 运行时（包含认证、模型解析、流式处理等）
 * - 本文件仅暴露配置标准化和默认值应用的纯函数，用于测试和外部集成
 *
 * 导出的函数：
 * - normalizeConfig: 标准化 Provider 配置（如自动补全 API 类型）
 * - applyConfigDefaults: 应用 Anthropic 特有的配置默认值（如缓存策略、心跳间隔）
 * - resolveThinkingProfile: 解析 Claude 模型的思考配置（thinking profile）
 */

import { resolveClaudeThinkingProfile } from "openclaw/plugin-sdk/provider-model-shared";
import type { ModelProviderConfig } from "openclaw/plugin-sdk/provider-model-types";
import {
  applyAnthropicConfigDefaults,
  normalizeAnthropicProviderConfigForProvider,
} from "./config-defaults.js";

/**
 * 标准化 Anthropic Provider 配置
 *
 * 对 Provider 配置进行规范化处理，如自动补全 API 类型为 "anthropic-messages"。
 * 只对 anthropic 和 claude-cli 两个 Provider 生效。
 *
 * @param params.provider - Provider 标识符
 * @param params.providerConfig - 原始 Provider 配置
 * @returns 标准化后的 Provider 配置
 */
export function normalizeConfig(params: { provider: string; providerConfig: ModelProviderConfig }) {
  return normalizeAnthropicProviderConfigForProvider(params);
}

/**
 * 应用 Anthropic 配置默认值
 *
 * 根据认证模式（API key 或 OAuth）自动填充合理的默认配置，
 * 包括上下文修剪策略、心跳间隔、缓存保留策略等。
 *
 * @param params - 包含 OpenClaw 配置和环境变量
 * @returns 应用默认值后的完整配置
 */
export function applyConfigDefaults(params: Parameters<typeof applyAnthropicConfigDefaults>[0]) {
  return applyAnthropicConfigDefaults(params);
}

/**
 * 解析 Claude 模型的思考配置（Thinking Profile）
 *
 * 根据 Provider 和模型 ID 解析对应的思考模式配置。
 * 仅对 anthropic 和 claude-cli 两个 Provider 生效。
 *
 * @param params.provider - Provider 标识符
 * @param params.modelId - 模型 ID
 * @returns 思考配置对象，不支持时返回 null
 */
export function resolveThinkingProfile(params: { provider: string; modelId: string }) {
  switch (params.provider.trim().toLowerCase()) {
    case "anthropic":
    case "claude-cli":
      return resolveClaudeThinkingProfile(params.modelId);
    default:
      return null;
  }
}
