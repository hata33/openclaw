/**
 * @fileoverview Anthropic 流式处理包装器（Stream Wrappers）
 *
 * 本文件实现了 Anthropic Provider 的流式处理包装器链。
 * 流式处理包装器是一种装饰器模式，每个包装器在基础流式函数之上添加特定功能，
 * 多个包装器按顺序组合形成完整的流式处理管道。
 *
 * 包装器链（按组合顺序）：
 *
 * 1. Beta Headers 包装器（createAnthropicBetaHeadersWrapper）
 *    - 自动注入 Anthropic API 的 beta 功能头
 *    - 默认启用：fine-grained-tool-streaming、interleaved-thinking
 *    - OAuth 模式额外启用：claude-code、oauth beta
 *    - 自动移除已废弃的 context-1m beta（4.x 版本已 GA）
 *
 * 2. Service Tier 包装器（createAnthropicServiceTierWrapper）
 *    - 控制 Anthropic API 的服务层级
 *    - "auto"：允许自动选择（可能使用更快的 tier）
 *    - "standard_only"：仅使用标准层级
 *    - OAuth 模式下跳过（不支持 service tier）
 *
 * 3. Fast Mode 包装器（createAnthropicFastModeWrapper）
 *    - 快速模式的简化接口，内部映射到 service tier
 *    - true → "auto"（允许快速 tier）
 *    - false → "standard_only"
 *
 * 4. Thinking Prefill 包装器（createAnthropicThinkingPrefillWrapper）
 *    - 处理扩展思考（extended thinking）场景下的助手消息前缀
 *    - 当对话末尾有 assistant prefill 消息但启用了 thinking 时，
 *      自动移除这些 prefill 消息（Anthropic 要求 thinking 模式下以 user 消息结尾）
 *
 * 为什么使用包装器模式：
 * - 每个关注点独立，便于测试和维护
 * - 包装器可以灵活组合，不需要修改基础流式函数
 * - 新增功能只需添加新的包装器，不影响现有逻辑
 */

import type { StreamFn } from "@earendil-works/pi-agent-core";
import { streamSimple } from "@earendil-works/pi-ai";
import type { ProviderWrapStreamFnContext } from "openclaw/plugin-sdk/plugin-entry";
import {
  applyAnthropicPayloadPolicyToParams,
  composeProviderStreamWrappers,
  createAnthropicThinkingPrefillPayloadWrapper,
  resolveAnthropicPayloadPolicy,
  stripTrailingAnthropicAssistantPrefillWhenThinking,
  streamWithPayloadPatch,
} from "openclaw/plugin-sdk/provider-stream-shared";
import { createSubsystemLogger } from "openclaw/plugin-sdk/runtime-env";
import {
  normalizeFastMode,
  normalizeLowercaseStringOrEmpty,
  normalizeStringEntries,
  readStringValue,
  uniqueStrings,
} from "openclaw/plugin-sdk/string-coerce-runtime";

/** 子系统日志记录器，用于 Anthropic 流式处理模块的日志输出 */
const log = createSubsystemLogger("anthropic-stream");

/**
 * 已废弃的 1M 上下文 beta 标识
 * Claude 4.x 的 1M 上下文已 GA（Generally Available），
 * 不再需要通过 beta 标识启用。
 */
const ANTHROPIC_CONTEXT_1M_BETA_LEGACY = "context-1m-2025-08-07";

/**
 * 支持 GA 1M 上下文的模型前缀列表
 * 这些模型原生支持 1M tokens 上下文窗口，无需 beta 标识
 */
const ANTHROPIC_GA_1M_MODEL_PREFIXES = [
  "claude-opus-4-6",
  "claude-opus-4.6",
  "claude-opus-4-7",
  "claude-opus-4.7",
  "claude-sonnet-4-6",
  "claude-sonnet-4.6",
] as const;

/**
 * Pi-AI 默认启用的 Anthropic beta 功能
 * - fine-grained-tool-streaming: 细粒度工具流式输出
 * - interleaved-thinking: 交错式思考（在工具调用之间插入思考过程）
 */
const PI_AI_DEFAULT_ANTHROPIC_BETAS = [
  "fine-grained-tool-streaming-2025-05-14",
  "interleaved-thinking-2025-05-14",
] as const;

/**
 * OAuth 模式下额外启用的 beta 功能
 * 除了默认 beta 外，OAuth 模式还需要：
 * - claude-code: Claude Code 特定功能
 * - oauth: OAuth 认证相关功能
 */
const PI_AI_OAUTH_ANTHROPIC_BETAS = [
  "claude-code-20250219",
  "oauth-2025-04-20",
  ...PI_AI_DEFAULT_ANTHROPIC_BETAS,
] as const;

/**
 * Anthropic 服务层级类型
 * - "auto": 允许 API 自动选择（可能使用更快的层级）
 * - "standard_only": 仅使用标准层级
 */
type AnthropicServiceTier = "auto" | "standard_only";

/**
 * 判断模型是否支持 GA 1M 上下文
 *
 * @param modelId - 模型 ID
 * @returns 是否支持 GA 1M 上下文
 */
function isAnthropic1MModel(modelId: string): boolean {
  const normalized = normalizeLowercaseStringOrEmpty(modelId);
  return ANTHROPIC_GA_1M_MODEL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/**
 * 解析逗号分隔的 header 值列表
 *
 * @param value - 逗号分隔的字符串
 * @returns 解析后的字符串数组
 */
function parseHeaderList(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }
  return normalizeStringEntries(value.split(","));
}

/**
 * 合并 Anthropic Beta 请求头
 *
 * 将新的 beta 标识合并到已有的 anthropic-beta 请求头中。
 * 自动去重，保持已有的 header 键名（大小写不敏感查找）。
 *
 * @param headers - 已有的请求头
 * @param betas - 要添加的 beta 标识列表
 * @returns 合并后的请求头
 */
function mergeAnthropicBetaHeader(
  headers: Record<string, string> | undefined,
  betas: string[],
): Record<string, string> {
  const merged = { ...headers };
  /* 大小写不敏感查找已有的 anthropic-beta header */
  const existingKey = Object.keys(merged).find(
    (key) => normalizeLowercaseStringOrEmpty(key) === "anthropic-beta",
  );
  const existing = existingKey ? parseHeaderList(merged[existingKey]) : [];
  const values = uniqueStrings([...existing, ...betas]);
  const key = existingKey ?? "anthropic-beta";
  merged[key] = values.join(",");
  return merged;
}

/**
 * 判断 API key 是否为 OAuth 类型
 *
 * OAuth key 包含 "sk-ant-oat" 标识。
 * 这很重要，因为 OAuth key 需要额外的 beta 功能。
 *
 * @param apiKey - API key
 * @returns 是否为 OAuth key
 */
function isAnthropicOAuthApiKey(apiKey: unknown): boolean {
  return typeof apiKey === "string" && apiKey.includes("sk-ant-oat");
}

/**
 * 将快速模式启用标志转换为服务层级
 *
 * @param enabled - 是否启用快速模式
 * @returns 服务层级
 */
function resolveAnthropicFastServiceTier(enabled: boolean): AnthropicServiceTier {
  return enabled ? "auto" : "standard_only";
}

/**
 * 标准化服务层级值
 *
 * @param value - 原始值
 * @returns 标准化后的服务层级，无效值返回 undefined
 */
function normalizeAnthropicServiceTier(value: unknown): AnthropicServiceTier | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = normalizeLowercaseStringOrEmpty(value);
  if (normalized === "auto" || normalized === "standard_only") {
    return normalized;
  }
  return undefined;
}

/**
 * 检查是否已配置了自定义 Anthropic beta
 *
 * @param extraParams - 额外参数
 * @returns 是否已配置自定义 beta
 */
function hasConfiguredAnthropicBeta(extraParams: Record<string, unknown> | undefined): boolean {
  const configured = extraParams?.anthropicBeta;
  if (typeof configured === "string") {
    return configured.trim().length > 0;
  }
  if (!Array.isArray(configured)) {
    return false;
  }
  return configured.some((beta) => typeof beta === "string" && beta.trim().length > 0);
}

/**
 * 解析 Anthropic beta 功能列表
 *
 * 从用户配置的 extraParams 中提取自定义 beta 标识。
 * 自动移除已废弃的 context-1m beta（Claude 4.x 已 GA）。
 *
 * @param extraParams - 额外参数（来自模型配置）
 * @param _modelId - 模型 ID（预留参数，当前未使用）
 * @returns beta 标识列表，无自定义 beta 时返回 undefined
 */
export function resolveAnthropicBetas(
  extraParams: Record<string, unknown> | undefined,
  _modelId: string,
): string[] | undefined {
  const betas = new Set<string>();
  const configured = extraParams?.anthropicBeta;
  /* 解析字符串形式的 beta 配置 */
  if (typeof configured === "string" && configured.trim()) {
    for (const beta of parseHeaderList(configured)) {
      betas.add(beta);
    }
  } else if (Array.isArray(configured)) {
    /* 解析数组形式的 beta 配置 */
    for (const beta of configured) {
      if (typeof beta === "string" && beta.trim()) {
        for (const betaValue of parseHeaderList(beta)) {
          betas.add(betaValue);
        }
      }
    }
  }

  // Newer Claude 4.x 1M context is GA. Keep context1m as a context-sizing
  // opt-in, but do not send the retired beta even if it remains in older config.
  /* 移除已废弃的 1M 上下文 beta（Claude 4.x 已 GA） */
  betas.delete(ANTHROPIC_CONTEXT_1M_BETA_LEGACY);

  return betas.size > 0 ? [...betas] : undefined;
}

/**
 * 创建 Anthropic Beta 请求头包装器
 *
 * 在流式请求中自动注入 Anthropic API 的 beta 功能头。
 * 根据 API key 类型（OAuth 或普通）自动选择需要的 beta 功能集。
 *
 * @param baseStreamFn - 基础流式函数
 * @param betas - 用户自定义的 beta 标识列表
 * @returns 添加了 beta 头的流式函数
 */
export function createAnthropicBetaHeadersWrapper(
  baseStreamFn: StreamFn | undefined,
  betas: string[],
): StreamFn {
  const underlying = baseStreamFn ?? streamSimple;
  return (model, context, options) => {
    const isOauth = isAnthropicOAuthApiKey(options?.apiKey);
    /* 过滤掉已废弃的 beta */
    const effectiveBetas = betas.filter((beta) => beta !== ANTHROPIC_CONTEXT_1M_BETA_LEGACY);

    /* 根据 API key 类型选择基础 beta 集 */
    const piAiBetas = isOauth
      ? (PI_AI_OAUTH_ANTHROPIC_BETAS as readonly string[])
      : (PI_AI_DEFAULT_ANTHROPIC_BETAS as readonly string[]);
    const allBetas = uniqueStrings([...piAiBetas, ...effectiveBetas]);
    return underlying(model, context, {
      ...options,
      headers: mergeAnthropicBetaHeader(options?.headers, allBetas),
    });
  };
}

/**
 * 创建 Anthropic 快速模式包装器
 *
 * 快速模式是 service tier 的简化接口：
 * - enabled: true → service tier "auto"（允许快速层级）
 * - enabled: false → service tier "standard_only"（仅标准层级）
 *
 * @param baseStreamFn - 基础流式函数
 * @param enabled - 是否启用快速模式
 * @returns 应用了快速模式的流式函数
 */
export function createAnthropicFastModeWrapper(
  baseStreamFn: StreamFn | undefined,
  enabled: boolean,
): StreamFn {
  return createAnthropicServiceTierWrapper(baseStreamFn, resolveAnthropicFastServiceTier(enabled));
}

/**
 * 创建 Anthropic 服务层级包装器
 *
 * 在流式请求的 payload 中注入 service_tier 参数。
 * OAuth 模式下跳过（不支持 service tier）。
 *
 * @param baseStreamFn - 基础流式函数
 * @param serviceTier - 服务层级
 * @returns 应用了服务层级的流式函数
 */
export function createAnthropicServiceTierWrapper(
  baseStreamFn: StreamFn | undefined,
  serviceTier: AnthropicServiceTier,
): StreamFn {
  const underlying = baseStreamFn ?? streamSimple;
  return (model, context, options) => {
    /* OAuth 模式下不支持 service tier，直接透传 */
    if (isAnthropicOAuthApiKey(options?.apiKey)) {
      return underlying(model, context, options);
    }

    /* 解析 payload 策略，判断是否允许设置 service tier */
    const payloadPolicy = resolveAnthropicPayloadPolicy({
      provider: readStringValue(model.provider),
      api: readStringValue(model.api),
      baseUrl: readStringValue(model.baseUrl),
      serviceTier,
    });
    if (!payloadPolicy.allowsServiceTier) {
      return underlying(model, context, options);
    }

    /* 使用 payload patch 注入 service tier 参数 */
    return streamWithPayloadPatch(underlying, model, context, options, (payloadObj) =>
      applyAnthropicPayloadPolicyToParams(payloadObj, payloadPolicy),
    );
  };
}

/**
 * 创建 Anthropic 思考前缀包装器
 *
 * 处理扩展思考（extended thinking）场景下的助手消息前缀问题。
 * Anthropic 要求启用 thinking 时对话必须以 user 消息结尾，
 * 如果对话末尾有 assistant prefill 消息，需要自动移除。
 *
 * @param baseStreamFn - 基础流式函数
 * @returns 处理了思考前缀的流式函数
 */
export function createAnthropicThinkingPrefillWrapper(
  baseStreamFn: StreamFn | undefined,
): StreamFn {
  return createAnthropicThinkingPrefillPayloadWrapper(baseStreamFn, (stripped) => {
    log.warn(
      `removed ${stripped} trailing assistant prefill message${stripped === 1 ? "" : "s"} because Anthropic extended thinking requires conversations to end with a user turn`,
    );
  });
}

/**
 * 解析快速模式配置
 *
 * 从 extraParams 中读取 fastMode 或 fast_mode 参数。
 * 支持两种键名格式（camelCase 和 snake_case）。
 *
 * @param extraParams - 额外参数
 * @returns 快速模式启用状态，未配置时返回 undefined
 */
export function resolveAnthropicFastMode(
  extraParams: Record<string, unknown> | undefined,
): boolean | undefined {
  return normalizeFastMode(
    (extraParams?.fastMode ?? extraParams?.fast_mode) as string | boolean | null | undefined,
  );
}

/**
 * 解析服务层级配置
 *
 * 从 extraParams 中读取 serviceTier 或 service_tier 参数。
 * 如果值无效，记录警告日志。
 *
 * @param extraParams - 额外参数
 * @returns 服务层级，未配置或无效时返回 undefined
 */
export function resolveAnthropicServiceTier(
  extraParams: Record<string, unknown> | undefined,
): AnthropicServiceTier | undefined {
  const raw = extraParams?.serviceTier ?? extraParams?.service_tier;
  const normalized = normalizeAnthropicServiceTier(raw);
  /* 值存在但无效时记录警告 */
  if (raw !== undefined && normalized === undefined) {
    const rawSummary = typeof raw === "string" ? raw : typeof raw;
    log.warn(`ignoring invalid Anthropic service tier param: ${rawSummary}`);
  }
  return normalized;
}

/**
 * 包装 Anthropic Provider 流式函数
 *
 * 这是流式包装器的主入口函数，根据配置组合所有必要的包装器：
 * 1. Beta 请求头包装器（如果有自定义 beta 或需要 1M 上下文）
 * 2. 服务层级包装器（如果配置了 service tier）
 * 3. 快速模式包装器（如果配置了 fast mode）
 * 4. 思考前缀包装器（始终应用）
 *
 * @param ctx - 流式函数包装上下文
 * @returns 组合后的流式函数，无包装器时返回 undefined
 */
export function wrapAnthropicProviderStream(
  ctx: ProviderWrapStreamFnContext,
): StreamFn | undefined {
  const anthropicBetas = resolveAnthropicBetas(ctx.extraParams, ctx.modelId);
  /* 判断是否需要 beta 包装器 */
  const needsAnthropicBetaWrapper =
    anthropicBetas !== undefined ||
    hasConfiguredAnthropicBeta(ctx.extraParams) ||
    (ctx.extraParams?.context1m === true && isAnthropic1MModel(ctx.modelId));
  const serviceTier = resolveAnthropicServiceTier(ctx.extraParams);
  const fastMode = resolveAnthropicFastMode(ctx.extraParams);

  /**
   * 使用 composeProviderStreamWrappers 组合包装器
   * 按顺序应用：beta → service tier → fast mode → thinking prefill
   */
  return composeProviderStreamWrappers(
    ctx.streamFn,
    needsAnthropicBetaWrapper
      ? (streamFn) => createAnthropicBetaHeadersWrapper(streamFn, anthropicBetas ?? [])
      : undefined,
    serviceTier
      ? (streamFn) => createAnthropicServiceTierWrapper(streamFn, serviceTier)
      : undefined,
    fastMode !== undefined
      ? (streamFn) => createAnthropicFastModeWrapper(streamFn, fastMode)
      : undefined,
    (streamFn) => createAnthropicThinkingPrefillWrapper(streamFn),
  );
}

/**
 * 测试辅助导出
 * 暴露内部工具函数和日志记录器，仅用于单元测试
 */
export const testing = {
  log,
  stripTrailingAssistantPrefillWhenThinking: stripTrailingAnthropicAssistantPrefillWhenThinking,
};
export { testing as __testing };
