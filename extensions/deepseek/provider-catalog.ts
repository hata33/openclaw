/**
 * DeepSeek Provider 目录构建器
 *
 * 本文件负责构建 DeepSeek 提供者的模型目录配置。
 * 它将 models.ts 中定义的模型列表和 baseUrl 组合为完整的 Provider 配置，
 * 供上层注册系统使用。
 *
 * 返回的 ModelProviderConfig 包含：
 * - baseUrl: DeepSeek API 的基础 URL
 * - api: 使用的 API 格式（"openai-completions"）
 * - models: 经过 buildDeepSeekModelDefinition 处理后的模型定义数组
 */
import type { ModelProviderConfig } from "openclaw/plugin-sdk/provider-model-shared";
import {
  buildDeepSeekModelDefinition,
  DEEPSEEK_BASE_URL,
  DEEPSEEK_MODEL_CATALOG,
} from "./models.js";

export function buildDeepSeekProvider(): ModelProviderConfig {
  return {
    baseUrl: DEEPSEEK_BASE_URL,
    api: "openai-completions",
    models: DEEPSEEK_MODEL_CATALOG.map(buildDeepSeekModelDefinition),
  };
}
