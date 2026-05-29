/**
 * @fileoverview OpenAI 传输策略
 *
 * 管理 OpenAI/Codex/Azure Provider 的 HTTP 传输状态和 WebSocket 会话策略。
 * 主要职责：
 *
 * 1. 请求头注入（resolveOpenAITransportTurnState）
 *    - 为每次 API 调用注入会话追踪头（x-openclaw-session-id, x-openclaw-turn-id 等）
 *    - 仅对已知的 OpenAI 原生路由生效（避免向第三方代理泄露追踪信息）
 *    - 这些头信息用于 OpenAI 端的请求关联和调试
 *
 * 2. WebSocket 会话策略（resolveOpenAIWebSocketSessionPolicy）
 *    - 为长连接（如 Realtime API）定义降级冷却时间
 *    - 当 WebSocket 连接失败时，冷却期内不会尝试重连，避免频繁失败
 *    - 默认冷却时间 60 秒，兼顾响应速度和资源保护
 */

import type {
  ProviderResolveTransportTurnStateContext,
  ProviderResolveWebSocketSessionPolicyContext,
  ProviderTransportTurnState,
  ProviderWebSocketSessionPolicy,
} from "openclaw/plugin-sdk/plugin-entry";
import { normalizeProviderId } from "openclaw/plugin-sdk/provider-model-shared";
import { normalizeLowercaseStringOrEmpty } from "openclaw/plugin-sdk/string-coerce-runtime";
import { isOpenAIApiBaseUrl, isOpenAICodexBaseUrl } from "./base-url.js";

/** WebSocket 降级冷却时间（毫秒），连接失败后在此期间不重试 */
const DEFAULT_OPENAI_WS_DEGRADE_COOLDOWN_MS = 60_000;
/** 已知的 Azure OpenAI Provider ID 集合 */
const AZURE_PROVIDER_IDS = new Set(["azure-openai", "azure-openai-responses"]);
const OPENAI_CODEX_PROVIDER_ID = "openai-codex";

/**
 * 判断 URL 是否为 Azure OpenAI 端点
 * 通过主机名后缀匹配 *.openai.azure.com
 */
function isAzureOpenAIBaseUrl(baseUrl?: string): boolean {
  const trimmed = baseUrl?.trim();
  if (!trimmed) {
    return false;
  }
  try {
    return normalizeLowercaseStringOrEmpty(new URL(trimmed).hostname).endsWith(".openai.azure.com");
  } catch {
    return false;
  }
}

/**
 * 规范化标识符值：去除首尾空白、合并换行为空格、截断超长值
 * 用于确保注入到请求头中的标识符是干净的单行字符串
 */
function normalizeIdentityValue(value: string, maxLength = 160): string {
  const trimmed = value.trim().replace(/[\r\n]+/g, " ");
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

/**
 * 判断请求是否通过已知的原生 OpenAI 路由
 *
 * "原生路由"指的是 OpenAI 官方 API 端点、Azure OpenAI 端点或 Codex 端点，
 * 而非第三方代理或自定义端点。这决定了是否应该注入追踪头信息。
 * 原因：向第三方代理发送 OpenAI 特定的追踪头可能泄露内部信息或导致兼容性问题。
 */
function usesKnownNativeOpenAIRoute(provider: string, baseUrl?: string): boolean {
  const normalizedProvider = normalizeProviderId(provider);
  if (!normalizedProvider) {
    return false;
  }
  // OpenAI 直连：无自定义 baseUrl 或 baseUrl 为官方端点
  if (normalizedProvider === "openai") {
    return !baseUrl || isOpenAIApiBaseUrl(baseUrl);
  }
  // Azure OpenAI：baseUrl 必须匹配 Azure 主机名
  if (AZURE_PROVIDER_IDS.has(normalizedProvider)) {
    return !baseUrl || isAzureOpenAIBaseUrl(baseUrl);
  }
  // Codex：支持 OpenAI 官方和 Codex 专用端点
  if (normalizedProvider === OPENAI_CODEX_PROVIDER_ID) {
    return !baseUrl || isOpenAIApiBaseUrl(baseUrl) || isOpenAICodexBaseUrl(baseUrl);
  }
  return false;
}

/**
 * 构建会话级别的请求头
 *
 * 为已知原生路由注入 x-client-request-id 和 x-openclaw-session-id，
 * 用于 OpenAI 端的请求关联和调试追踪。
 */
function resolveSessionHeaders(params: {
  provider: string;
  baseUrl?: string;
  sessionId?: string;
}): Record<string, string> | undefined {
  if (!params.sessionId || !usesKnownNativeOpenAIRoute(params.provider, params.baseUrl)) {
    return undefined;
  }
  const sessionId = normalizeIdentityValue(params.sessionId);
  if (!sessionId) {
    return undefined;
  }
  return {
    "x-client-request-id": sessionId,
    "x-openclaw-session-id": sessionId,
  };
}

/**
 * 解析 OpenAI 传输轮次状态
 *
 * 为每次 API 调用构建带有追踪信息的请求头，包括：
 * - 会话 ID（跨请求关联）
 * - 轮次 ID（单次对话轮次标识）
 * - 重试次数（用于调试重试场景）
 *
 * @param ctx - 包含 provider、model、sessionId、turnId、attempt 等上下文
 * @returns 带有追踪头和元数据的传输状态，非原生路由返回 undefined
 */
export function resolveOpenAITransportTurnState(
  ctx: ProviderResolveTransportTurnStateContext,
): ProviderTransportTurnState | undefined {
  const sessionHeaders = resolveSessionHeaders({
    provider: ctx.provider,
    baseUrl: ctx.model?.baseUrl,
    sessionId: ctx.sessionId,
  });
  if (!sessionHeaders) {
    return undefined;
  }

  const turnId = normalizeIdentityValue(ctx.turnId);
  const attempt = String(Math.max(1, ctx.attempt));

  return {
    headers: {
      ...sessionHeaders,
      "x-openclaw-turn-id": turnId,
      "x-openclaw-turn-attempt": attempt,
    },
    metadata: {
      openclaw_session_id: sessionHeaders["x-openclaw-session-id"] ?? "",
      openclaw_turn_id: turnId,
      openclaw_turn_attempt: attempt,
      openclaw_transport: ctx.transport,
    },
  };
}

/**
 * 解析 OpenAI WebSocket 会话策略
 *
 * 为 WebSocket 长连接（如 Realtime Voice API）定义：
 * - 会话追踪头：与 HTTP 请求一致的追踪信息
 * - 降级冷却时间：连接失败后的等待时间，避免频繁重连
 *
 * @param ctx - 包含 provider、model、sessionId 等上下文
 * @returns WebSocket 会话策略，非原生路由返回 undefined
 */
export function resolveOpenAIWebSocketSessionPolicy(
  ctx: ProviderResolveWebSocketSessionPolicyContext,
): ProviderWebSocketSessionPolicy | undefined {
  if (!usesKnownNativeOpenAIRoute(ctx.provider, ctx.model?.baseUrl)) {
    return undefined;
  }
  return {
    headers: resolveSessionHeaders({
      provider: ctx.provider,
      baseUrl: ctx.model?.baseUrl,
      sessionId: ctx.sessionId,
    }),
    degradeCooldownMs: DEFAULT_OPENAI_WS_DEGRADE_COOLDOWN_MS,
  };
}
