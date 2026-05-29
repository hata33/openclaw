/**
 * DeepSeek 模型定义文件
 *
 * 本文件负责定义 DeepSeek 提供者的模型配置，包括：
 * 1. 从插件清单（openclaw.plugin.json）中解析模型目录，获取模型列表和 baseUrl
 * 2. 提供模型定义构建函数，为每个模型指定使用 "openai-completions" API
 * 3. 定义 DeepSeek V4 模型集合，用于识别支持推理/思考能力的 V4 系列模型
 * 4. 提供模型 ID 和模型引用的判断函数，用于流式处理和思考能力的路由
 *
 * DeepSeek 模型使用 OpenAI 兼容 API，因此 api 字段统一设为 "openai-completions"。
 * V4 系列模型（deepseek-v4-flash、deepseek-v4-pro）支持 Thinking（推理）能力。
 */
import { buildManifestModelProviderConfig } from "openclaw/plugin-sdk/provider-catalog-shared";
import type { ModelDefinitionConfig } from "openclaw/plugin-sdk/provider-model-shared";
import manifest from "./openclaw.plugin.json" with { type: "json" };

const DEEPSEEK_MANIFEST_PROVIDER = buildManifestModelProviderConfig({
  providerId: "deepseek",
  catalog: manifest.modelCatalog.providers.deepseek,
});

export const DEEPSEEK_BASE_URL = DEEPSEEK_MANIFEST_PROVIDER.baseUrl;

export const DEEPSEEK_MODEL_CATALOG: ModelDefinitionConfig[] = DEEPSEEK_MANIFEST_PROVIDER.models;

export function buildDeepSeekModelDefinition(
  model: (typeof DEEPSEEK_MODEL_CATALOG)[number],
): ModelDefinitionConfig {
  return {
    ...model,
    api: "openai-completions",
  };
}

const DEEPSEEK_V4_MODEL_IDS = new Set(["deepseek-v4-flash", "deepseek-v4-pro"]);

export function isDeepSeekV4ModelId(modelId: string): boolean {
  return DEEPSEEK_V4_MODEL_IDS.has(modelId.toLowerCase());
}

export function isDeepSeekV4ModelRef(model: { provider?: string; id?: unknown }): boolean {
  return (
    model.provider === "deepseek" && typeof model.id === "string" && isDeepSeekV4ModelId(model.id)
  );
}
