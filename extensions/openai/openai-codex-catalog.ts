/**
 * @fileoverview OpenAI Codex 模型目录配置
 *
 * 定义 Codex Provider 的基础模型目录结构，包括 API 端点和传输协议。
 * Codex 使用独立的后端 API（chatgpt.com/backend-api/codex），
 * 与标准 OpenAI API 不同，因此需要专门的目录配置。
 *
 * 该模块导出的配置被 openai-codex-provider.ts 引用，
 * 用于构建完整的 Codex Provider 插件。
 */

import type { ModelProviderConfig } from "openclaw/plugin-sdk/provider-model-shared";
import { OPENAI_CODEX_RESPONSES_BASE_URL } from "./base-url.js";

/** Codex API 基础 URL，指向 chatgpt.com 的 Codex 后端 */
const OPENAI_CODEX_BASE_URL = OPENAI_CODEX_RESPONSES_BASE_URL;

/**
 * 构建 OpenAI Codex Provider 的基础模型配置
 *
 * 返回一个最小化的 ModelProviderConfig，包含：
 * - baseUrl: Codex API 端点（chatgpt.com/backend-api/codex）
 * - api: 使用 "openai-codex-responses" 传输协议（区别于标准 openai-responses）
 * - models: 空数组（实际模型列表由运行时目录补充）
 *
 * @returns Codex Provider 的模型目录配置
 */
export function buildOpenAICodexProvider(): ModelProviderConfig {
  return {
    baseUrl: OPENAI_CODEX_BASE_URL,
    api: "openai-codex-responses",
    models: [],
  };
}
