/**
 * @fileoverview OpenAI API 基础 URL 判别工具
 *
 * 提供用于判断给定 URL 是否为 OpenAI 官方 API 或 Codex API 的工具函数。
 * 这些判断在以下场景中至关重要：
 * - 传输策略选择：决定使用标准 OpenAI Responses 协议还是 Codex 专用协议
 * - 安全策略：区分官方端点和第三方代理端点
 * - 认证方式：官方端点支持 OAuth，第三方端点需要 API Key
 *
 * OpenAI 官方 API: https://api.openai.com/v1
 * Codex 后端 API: https://chatgpt.com/backend-api/codex
 */

import { normalizeOptionalString } from "openclaw/plugin-sdk/string-coerce-runtime";

/** Codex Responses API 的标准基础 URL */
export const OPENAI_CODEX_RESPONSES_BASE_URL = "https://chatgpt.com/backend-api/codex";

/**
 * 判断给定 URL 是否为 OpenAI 官方 API 端点
 *
 * 匹配规则：
 * - 协议必须是 http 或 https
 * - 主机名必须是 api.openai.com
 * - 路径可以是根路径或 /v1
 *
 * @param baseUrl - 待检测的 URL
 * @returns 如果是 OpenAI 官方 API 端点则返回 true
 */
export function isOpenAIApiBaseUrl(baseUrl?: string): boolean {
  const trimmed = normalizeOptionalString(baseUrl);
  if (!trimmed) {
    return false;
  }
  return /^https?:\/\/api\.openai\.com(?:\/v1)?\/?$/i.test(trimmed);
}

/**
 * 判断给定 URL 是否为 OpenAI Codex 后端 API 端点
 *
 * 匹配规则：
 * - 协议必须是 http 或 https
 * - 主机名必须是 chatgpt.com
 * - 路径必须以 /backend-api 开头，可选地包含 /codex 或 /v1
 *
 * @param baseUrl - 待检测的 URL
 * @returns 如果是 Codex 后端端点则返回 true
 */
export function isOpenAICodexBaseUrl(baseUrl?: string): boolean {
  const trimmed = normalizeOptionalString(baseUrl);
  if (!trimmed) {
    return false;
  }
  return /^https?:\/\/chatgpt\.com\/backend-api(?:\/codex)?(?:\/v1)?\/?$/i.test(trimmed);
}

/**
 * 将 Codex URL 规范化为标准的 Codex Responses 基础 URL
 *
 * 如果给定的 baseUrl 是 Codex 端点的变体形式（如包含 /v1 后缀），
 * 则统一返回标准的 OPENAI_CODEX_RESPONSES_BASE_URL。
 * 如果不是 Codex 端点则原样返回。
 *
 * @param baseUrl - 待规范化的 URL
 * @returns 规范化后的 URL 或 undefined
 */
export function canonicalizeCodexResponsesBaseUrl(baseUrl?: string): string | undefined {
  return isOpenAICodexBaseUrl(baseUrl) ? OPENAI_CODEX_RESPONSES_BASE_URL : baseUrl;
}
