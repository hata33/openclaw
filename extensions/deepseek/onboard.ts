/**
 * DeepSeek Onboard 配置
 *
 * 本文件处理 DeepSeek 提供者的初始化配置（Onboard），负责：
 * 1. 定义默认模型引用（deepseek/deepseek-v4-flash）
 * 2. 应用 DeepSeek 的提供者配置，包括 baseUrl、API 格式、模型目录
 * 3. 将默认模型设置为 Agent 的主模型
 *
 * Onboard 流程在用户首次配置 DeepSeek 或通过向导添加 DeepSeek 时触发，
 * 确保配置文件中包含正确的提供者信息和模型列表。
 *
 * 导出的 applyDeepSeekConfig 函数被 index.ts 的认证配置引用，
 * 在用户输入 API Key 后自动应用默认配置。
 */
import {
  applyAgentDefaultModelPrimary,
  applyProviderConfigWithModelCatalog,
  type OpenClawConfig,
} from "openclaw/plugin-sdk/provider-onboard";
import { buildDeepSeekModelDefinition, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL_CATALOG } from "./api.js";

export const DEEPSEEK_DEFAULT_MODEL_REF = "deepseek/deepseek-v4-flash";

function applyDeepSeekProviderConfig(cfg: OpenClawConfig): OpenClawConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[DEEPSEEK_DEFAULT_MODEL_REF] = {
    ...models[DEEPSEEK_DEFAULT_MODEL_REF],
    alias: models[DEEPSEEK_DEFAULT_MODEL_REF]?.alias ?? "DeepSeek",
  };

  return applyProviderConfigWithModelCatalog(cfg, {
    agentModels: models,
    providerId: "deepseek",
    api: "openai-completions",
    baseUrl: DEEPSEEK_BASE_URL,
    catalogModels: DEEPSEEK_MODEL_CATALOG.map(buildDeepSeekModelDefinition),
  });
}

export function applyDeepSeekConfig(cfg: OpenClawConfig): OpenClawConfig {
  return applyAgentDefaultModelPrimary(
    applyDeepSeekProviderConfig(cfg),
    DEEPSEEK_DEFAULT_MODEL_REF,
  );
}
