/**
 * @fileoverview Anthropic 配置默认值（Config Defaults）
 *
 * 本文件负责为 Anthropic Provider 应用合理的默认配置值。
 * 当用户配置了 Anthropic 认证（API key 或 OAuth/CLI）但未显式指定某些配置项时，
 * 此模块会自动填充最佳默认值，减少用户的手动配置工作。
 *
 * 核心默认值策略：
 *
 * 1. 上下文修剪（Context Pruning）
 *    - 默认启用 cache-ttl 模式，TTL 为 1 小时
 *    - 利用 Anthropic 的 prompt caching 特性优化 token 使用
 *
 * 2. 心跳间隔（Heartbeat）
 *    - OAuth 模式（Claude CLI）：1 小时（因为 CLI 认证有更长的有效期）
 *    - API key 模式：30 分钟（更频繁地检查状态）
 *
 * 3. 缓存保留策略（Cache Retention）
 *    - 仅对 API key 模式生效
 *    - 为所有 Anthropic/Claude 模型设置 cacheRetention: "short"
 *    - 这确保 prompt cache 在短时间内可用，优化响应速度
 *
 * 4. Claude CLI 运行时标记
 *    - 当使用 OAuth 模式且检测到 Claude CLI 模型选择时，
 *      自动为模型条目添加 claude-cli 运行时标记
 *
 * 为什么需要这个模块：
 * Anthropic 有不同的认证模式（API key vs OAuth/CLI），每种模式的最佳配置不同。
 * 此模块根据实际使用的认证模式自动选择最合适的默认值，
 * 避免用户需要手动配置这些技术细节。
 */

import type { OpenClawConfig } from "openclaw/plugin-sdk/plugin-entry";
import {
  isRecord,
  normalizeLowercaseStringOrEmpty,
} from "openclaw/plugin-sdk/string-coerce-runtime";
import {
  resolveClaudeCliAnthropicModelRefs,
  resolveKnownAnthropicModelRef,
} from "./claude-model-refs.js";
import { CLAUDE_CLI_BACKEND_ID, CLAUDE_CLI_DEFAULT_ALLOWLIST_REFS } from "./cli-constants.js";

/** Anthropic Messages API 标识符，用于自动补全 api 字段 */
const ANTHROPIC_PROVIDER_API = "anthropic-messages";
/**
 * API key 模式下的默认允许列表
 * 当使用 API key 认证时，至少需要有一个 Anthropic 模型可用
 */
const ANTHROPIC_API_KEY_DEFAULT_ALLOWLIST_REFS = ["anthropic/claude-sonnet-4-6"] as const;

/**
 * 标准化 Provider ID
 *
 * 处理别名：
 * - "bedrock" / "aws-bedrock" → "amazon-bedrock"
 * - 其他 → 小写标准化
 *
 * @param provider - 原始 Provider ID
 * @returns 标准化后的 Provider ID
 */
function normalizeProviderId(provider: string): string {
  const normalized = normalizeLowercaseStringOrEmpty(provider);
  if (normalized === "bedrock" || normalized === "aws-bedrock") {
    return "amazon-bedrock";
  }
  return normalized;
}

/**
 * 解析 Anthropic 的默认认证模式
 *
 * 按优先级确定认证模式：
 * 1. 按 config.auth.order 中的顺序检查配置文件
 * 2. 如果只有 API key 配置 → "api_key"
 * 3. 如果只有 OAuth/token 配置 → "oauth"
 * 4. 检查环境变量 ANTHROPIC_OAUTH_TOKEN 和 ANTHROPIC_API_KEY
 *
 * @param config - OpenClaw 配置
 * @param env - 环境变量
 * @returns 认证模式，无法确定时返回 null
 */
function resolveAnthropicDefaultAuthMode(
  config: OpenClawConfig,
  env: NodeJS.ProcessEnv,
): "api_key" | "oauth" | null {
  const profiles = config.auth?.profiles ?? {};
  /* 筛选所有 Anthropic 相关的配置文件 */
  const anthropicProfiles = Object.entries(profiles).filter(
    ([, profile]) =>
      profile?.provider === "anthropic" || profile?.provider === CLAUDE_CLI_BACKEND_ID,
  );

  /* 按配置文件顺序检查，确定优先使用的认证模式 */
  const order = [
    ...(config.auth?.order?.anthropic ?? []),
    ...((config.auth?.order as Record<string, string[] | undefined> | undefined)?.[
      CLAUDE_CLI_BACKEND_ID
    ] ?? []),
  ];
  for (const profileId of order) {
    const entry = profiles[profileId];
    if (!entry || (entry.provider !== "anthropic" && entry.provider !== CLAUDE_CLI_BACKEND_ID)) {
      continue;
    }
    /* claude-cli Provider 始终视为 OAuth 模式 */
    if (entry.provider === CLAUDE_CLI_BACKEND_ID) {
      return "oauth";
    }
    if (entry.mode === "api_key") {
      return "api_key";
    }
    if (entry.mode === "oauth" || entry.mode === "token") {
      return "oauth";
    }
  }

  /* 如果没有显式顺序，根据配置文件类型推断 */
  const hasApiKey = anthropicProfiles.some(
    ([, profile]) => profile?.provider === "anthropic" && profile?.mode === "api_key",
  );
  const hasOauth = anthropicProfiles.some(
    ([, profile]) =>
      profile?.provider === CLAUDE_CLI_BACKEND_ID ||
      profile?.mode === "oauth" ||
      profile?.mode === "token",
  );
  if (hasApiKey && !hasOauth) {
    return "api_key";
  }
  if (hasOauth && !hasApiKey) {
    return "oauth";
  }

  /* 最后检查环境变量 */
  if (env.ANTHROPIC_OAUTH_TOKEN?.trim()) {
    return "oauth";
  }
  if (env.ANTHROPIC_API_KEY?.trim()) {
    return "api_key";
  }
  return null;
}

/**
 * 从模型配置中提取 primary 值
 *
 * 模型配置可以是字符串或 { primary, fallbacks } 对象，
 * 此函数统一提取 primary 值。
 *
 * @param value - 模型配置
 * @returns primary 模型引用字符串
 */
function resolveModelPrimaryValue(
  value: string | { primary?: string; fallbacks?: string[] } | undefined,
): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  const primary = value?.primary;
  if (typeof primary !== "string") {
    return undefined;
  }
  const trimmed = primary.trim();
  return trimmed || undefined;
}

/**
 * 解析 "provider/model" 格式的模型引用
 *
 * @param raw - 原始模型引用
 * @param defaultProvider - 默认 Provider
 * @returns 解析结果
 */
function parseProviderModelRef(
  raw: string,
  defaultProvider: string,
): { provider: string; model: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const slashIndex = trimmed.indexOf("/");
  if (slashIndex <= 0) {
    return { provider: defaultProvider, model: trimmed };
  }
  const provider = trimmed.slice(0, slashIndex).trim();
  const model = trimmed.slice(slashIndex + 1).trim();
  if (!provider || !model) {
    return null;
  }
  return {
    provider: normalizeProviderId(provider),
    model,
  };
}

/**
 * 判断模型是否为 Anthropic 缓存保留目标
 *
 * 匹配条件：
 * - Provider 为 "anthropic"
 * - 或 Provider 为 "amazon-bedrock" 且模型 ID 包含 "anthropic.claude"（Bedrock 上的 Claude 模型）
 *
 * @param parsed - 解析后的模型引用
 * @returns 是否为缓存保留目标
 */
function isAnthropicCacheRetentionTarget(
  parsed: { provider: string; model: string } | null | undefined,
): parsed is { provider: string; model: string } {
  return Boolean(
    parsed &&
    (parsed.provider === "anthropic" ||
      (parsed.provider === "amazon-bedrock" &&
        normalizeLowercaseStringOrEmpty(parsed.model).includes("anthropic.claude"))),
  );
}

/**
 * 检查配置是否使用 Claude CLI 模型选择
 *
 * 判断逻辑：
 * 1. 默认 agentRuntime 是否为 claude-cli
 * 2. primary 模型是否以 claude-cli/ 开头
 * 3. models 映射中是否有 claude-cli/ 前缀的键或 agentRuntime 为 claude-cli 的条目
 *
 * @param config - OpenClaw 配置
 * @returns 是否使用 Claude CLI 模型选择
 */
function usesClaudeCliModelSelection(config: OpenClawConfig): boolean {
  if (config.agents?.defaults?.agentRuntime?.id === CLAUDE_CLI_BACKEND_ID) {
    return true;
  }
  const primary = resolveModelPrimaryValue(
    config.agents?.defaults?.model as
      | string
      | { primary?: string; fallbacks?: string[] }
      | undefined,
  );
  const parsedPrimary = primary ? parseProviderModelRef(primary, "anthropic") : null;
  if (parsedPrimary?.provider === CLAUDE_CLI_BACKEND_ID) {
    return true;
  }
  return Object.entries(config.agents?.defaults?.models ?? {}).some(([key, entry]) => {
    const parsed = parseProviderModelRef(key, "anthropic");
    if (parsed?.provider === CLAUDE_CLI_BACKEND_ID) {
      return true;
    }
    const runtimeId = isRecord(entry?.agentRuntime) ? entry.agentRuntime.id : undefined;
    return (
      parsed?.provider === "anthropic" &&
      normalizeLowercaseStringOrEmpty(runtimeId) === CLAUDE_CLI_BACKEND_ID
    );
  });
}

/**
 * 检查配置是否选中了 Claude CLI 认证配置文件
 *
 * 按配置文件顺序检查：
 * - 如果首选是 claude-cli 配置文件 → true
 * - 如果首选是 anthropic 配置文件 → false
 * - 如果两者都存在但无显式顺序 → 有 claude-cli 且无 anthropic 时为 true
 *
 * @param config - OpenClaw 配置
 * @returns 是否选中了 Claude CLI 认证
 */
function usesSelectedClaudeCliAuthProfile(config: OpenClawConfig): boolean {
  const profiles = config.auth?.profiles ?? {};
  const orderedProfileIds = [
    ...(config.auth?.order?.anthropic ?? []),
    ...((config.auth?.order as Record<string, string[] | undefined> | undefined)?.[
      CLAUDE_CLI_BACKEND_ID
    ] ?? []),
  ];
  for (const profileId of orderedProfileIds) {
    const provider = profiles[profileId]?.provider;
    if (provider === CLAUDE_CLI_BACKEND_ID) {
      return true;
    }
    if (provider === "anthropic") {
      return false;
    }
  }

  /* 无显式顺序时，根据是否存在 claude-cli 配置文件推断 */
  let hasClaudeCliProfile = false;
  let hasAnthropicProfile = false;
  for (const profile of Object.values(profiles)) {
    if (profile?.provider === CLAUDE_CLI_BACKEND_ID) {
      hasClaudeCliProfile = true;
    }
    if (profile?.provider === "anthropic") {
      hasAnthropicProfile = true;
    }
  }
  return hasClaudeCliProfile && !hasAnthropicProfile;
}

/**
 * 将 claude-cli/* 模型引用转换为 anthropic/* 规范引用
 *
 * @param ref - 原始模型引用
 * @returns 规范化后的模型引用
 */
function toCanonicalAnthropicModelRef(ref: string): string {
  return ref.startsWith(`${CLAUDE_CLI_BACKEND_ID}/`)
    ? `anthropic/${ref.slice(CLAUDE_CLI_BACKEND_ID.length + 1)}`
    : ref;
}

/**
 * 为模型条目添加 Claude CLI 运行时配置
 *
 * 如果已有非 "auto" 的运行时配置则保留，否则添加 claude-cli 运行时。
 *
 * @param entry - 原始模型条目
 * @returns 更新后的模型条目
 */
function modelEntryWithClaudeCliRuntime(entry: unknown): Record<string, unknown> {
  const base = isRecord(entry) ? { ...entry } : {};
  const currentRuntimeId = isRecord(base.agentRuntime) ? base.agentRuntime.id : undefined;
  const currentRuntime = normalizeLowercaseStringOrEmpty(currentRuntimeId);
  if (currentRuntime && currentRuntime !== "auto") {
    return base;
  }
  base.agentRuntime = {
    ...(isRecord(base.agentRuntime) ? base.agentRuntime : {}),
    id: CLAUDE_CLI_BACKEND_ID,
  };
  return base;
}

/**
 * 从模型配置中收集 Claude CLI 运行时引用
 *
 * 遍历模型配置（字符串或 { primary, fallbacks } 对象），
 * 将所有 claude-cli 相关的模型引用收集为运行时引用。
 *
 * @param model - 模型配置
 * @returns 运行时引用列表
 */
function collectClaudeCliRuntimeRefs(
  model: string | { primary?: string; fallbacks?: string[] } | undefined,
): string[] {
  const refs = new Set<string>();
  if (typeof model === "string") {
    for (const ref of resolveClaudeCliAnthropicModelRefs(model)?.runtimeRefs ?? []) {
      refs.add(ref);
    }
    return [...refs];
  }
  if (typeof model?.primary === "string") {
    for (const ref of resolveClaudeCliAnthropicModelRefs(model.primary)?.runtimeRefs ?? []) {
      refs.add(ref);
    }
  }
  for (const fallback of model?.fallbacks ?? []) {
    for (const ref of resolveClaudeCliAnthropicModelRefs(fallback)?.runtimeRefs ?? []) {
      refs.add(ref);
    }
  }
  return [...refs];
}

/**
 * 从模型映射中收集 Claude CLI 运行时引用
 *
 * @param models - 模型映射
 * @returns 运行时引用列表
 */
function collectClaudeCliRuntimeRefsFromModelMap(
  models: Record<string, unknown> | undefined,
): string[] {
  const refs = new Set<string>();
  for (const key of Object.keys(models ?? {})) {
    for (const ref of resolveClaudeCliAnthropicModelRefs(key)?.runtimeRefs ?? []) {
      refs.add(ref);
    }
  }
  return [...refs];
}

/**
 * 从完整配置中收集所有 Claude CLI 运行时引用
 *
 * 遍历配置中的所有模型引用（默认模型、模型映射、agent 级配置），
 * 收集所有与 Claude CLI 相关的运行时引用。
 *
 * @param config - OpenClaw 配置
 * @returns 去重后的运行时引用列表
 */
function collectClaudeCliRuntimeRefsFromConfig(config: OpenClawConfig): string[] {
  const refs = new Set<string>(
    collectClaudeCliRuntimeRefs(
      config.agents?.defaults?.model as
        | string
        | { primary?: string; fallbacks?: string[] }
        | undefined,
    ),
  );
  for (const ref of collectClaudeCliRuntimeRefsFromModelMap(config.agents?.defaults?.models)) {
    refs.add(ref);
  }
  /* 遍历所有 agent 级配置 */
  for (const agent of config.agents?.list ?? []) {
    for (const ref of collectClaudeCliRuntimeRefs(
      agent.model as string | { primary?: string; fallbacks?: string[] } | undefined,
    )) {
      refs.add(ref);
    }
    for (const ref of collectClaudeCliRuntimeRefsFromModelMap(agent.models)) {
      refs.add(ref);
    }
  }
  return [...refs];
}

/**
 * 标准化 Anthropic Provider 配置
 *
 * 当 Provider 配置中没有显式指定 api 字段但有 models 数组时，
 * 自动补全 api 为 "anthropic-messages"。
 *
 * @param providerConfig - Provider 配置
 * @returns 标准化后的 Provider 配置
 */
function normalizeAnthropicProviderConfig<T extends { api?: string; models?: unknown[] }>(
  providerConfig: T,
): T {
  if (
    providerConfig.api ||
    !Array.isArray(providerConfig.models) ||
    providerConfig.models.length === 0
  ) {
    return providerConfig;
  }
  return { ...providerConfig, api: ANTHROPIC_PROVIDER_API };
}

/**
 * 为指定 Provider 标准化 Anthropic 配置
 *
 * 仅对 anthropic 和 claude-cli 两个 Provider 生效。
 *
 * @param params.provider - Provider 标识符
 * @param params.providerConfig - Provider 配置
 * @returns 标准化后的 Provider 配置
 */
export function normalizeAnthropicProviderConfigForProvider<
  T extends { api?: string; models?: unknown[] },
>(params: { provider: string; providerConfig: T }): T {
  const provider = normalizeProviderId(params.provider);
  if (provider !== "anthropic" && provider !== CLAUDE_CLI_BACKEND_ID) {
    return params.providerConfig;
  }
  return normalizeAnthropicProviderConfig(params.providerConfig);
}

/**
 * 应用 Anthropic 配置默认值
 *
 * 这是配置默认值模块的主入口函数。根据检测到的认证模式（API key 或 OAuth），
 * 自动为以下配置项填充合理的默认值：
 *
 * 1. contextPruning.mode = "cache-ttl"（利用 Anthropic prompt caching）
 * 2. contextPruning.ttl = "1h"（缓存有效期 1 小时）
 * 3. heartbeat.every = "1h"（OAuth）或 "30m"（API key）
 * 4. cacheRetention = "short"（API key 模式下的缓存保留策略）
 * 5. Claude CLI 运行时标记（OAuth 模式下自动标记 claude-cli 运行时）
 *
 * @param params.config - OpenClaw 配置
 * @param params.env - 环境变量
 * @returns 应用默认值后的完整配置
 */
export function applyAnthropicConfigDefaults(params: {
  config: OpenClawConfig;
  env: NodeJS.ProcessEnv;
}): OpenClawConfig {
  const defaults = params.config.agents?.defaults;
  if (!defaults) {
    return params.config;
  }

  /* 解析认证模式，如果无法确定则跳过默认值应用 */
  const authMode = resolveAnthropicDefaultAuthMode(params.config, params.env);
  if (!authMode) {
    return params.config;
  }

  let mutated = false;
  const nextDefaults = { ...defaults };
  const contextPruning = defaults.contextPruning ?? {};
  const heartbeat = defaults.heartbeat ?? {};

  /* === 默认值 1: 上下文修剪策略 === */
  if (defaults.contextPruning?.mode === undefined) {
    nextDefaults.contextPruning = {
      ...contextPruning,
      mode: "cache-ttl",   /* 使用缓存 TTL 模式，与 Anthropic prompt caching 配合 */
      ttl: defaults.contextPruning?.ttl ?? "1h", /* 默认缓存 TTL 1 小时 */
    };
    mutated = true;
  }

  /* === 默认值 2: 心跳间隔 === */
  if (defaults.heartbeat?.every === undefined) {
    nextDefaults.heartbeat = {
      ...heartbeat,
      /**
       * OAuth 模式（Claude CLI）使用更长的心跳间隔（1小时），
       * 因为 CLI 认证有更长的有效期且不需要频繁检查。
       * API key 模式使用更短的间隔（30分钟）。
       */
      every: authMode === "oauth" ? "1h" : "30m",
    };
    mutated = true;
  }

  /* === 默认值 3: API key 模式下的缓存保留策略 === */
  if (authMode === "api_key") {
    const nextModels = defaults.models ? { ...defaults.models } : {};
    let modelsMutated = false;

    /* 为现有模型条目添加 cacheRetention: "short" */
    for (const [key, entry] of Object.entries(nextModels)) {
      const parsed = parseProviderModelRef(key, "anthropic");
      if (!isAnthropicCacheRetentionTarget(parsed)) {
        continue;
      }
      const current = entry ?? {};
      const paramsValue = (current as { params?: Record<string, unknown> }).params ?? {};
      /* 如果已设置 cacheRetention，跳过 */
      if (typeof paramsValue.cacheRetention === "string") {
        continue;
      }
      nextModels[key] = {
        ...(current as Record<string, unknown>),
        params: { ...paramsValue, cacheRetention: "short" },
      };
      modelsMutated = true;
    }

    /* 为 primary 模型添加 cacheRetention（如果尚未设置） */
    const primary = resolveKnownAnthropicModelRef(
      resolveModelPrimaryValue(
        defaults.model as string | { primary?: string; fallbacks?: string[] } | undefined,
      ),
    );
    if (primary) {
      const parsedPrimary = parseProviderModelRef(primary, "anthropic");
      if (parsedPrimary && isAnthropicCacheRetentionTarget(parsedPrimary)) {
        const key = `${parsedPrimary.provider}/${parsedPrimary.model}`;
        const entry = nextModels[key];
        const current = entry ?? {};
        const paramsValue = (current as { params?: Record<string, unknown> }).params ?? {};
        if (typeof paramsValue.cacheRetention !== "string") {
          nextModels[key] = {
            ...(current as Record<string, unknown>),
            params: { ...paramsValue, cacheRetention: "short" },
          };
          modelsMutated = true;
        }
      }
    }

    /* 确保默认允许列表中的模型也有 cacheRetention */
    const hasAnthropicApiKeyModel = Object.keys(nextModels).some((key) =>
      isAnthropicCacheRetentionTarget(parseProviderModelRef(key, "anthropic")),
    );
    if (hasAnthropicApiKeyModel) {
      for (const ref of ANTHROPIC_API_KEY_DEFAULT_ALLOWLIST_REFS) {
        if (ref in nextModels) {
          continue;
        }
        nextModels[ref] = { params: { cacheRetention: "short" } };
        modelsMutated = true;
      }
    }

    if (modelsMutated) {
      nextDefaults.models = nextModels;
      mutated = true;
    }
  }

  /* === 默认值 4: OAuth 模式下的 Claude CLI 运行时标记 === */
  if (
    authMode === "oauth" &&
    (usesClaudeCliModelSelection(params.config) || usesSelectedClaudeCliAuthProfile(params.config))
  ) {
    const nextModels = defaults.models ? { ...defaults.models } : {};
    let modelsMutated = false;
    /* 收集所有 Claude CLI 运行时引用 */
    const runtimeRefs = new Set<string>(collectClaudeCliRuntimeRefsFromConfig(params.config));
    for (const rawRef of CLAUDE_CLI_DEFAULT_ALLOWLIST_REFS) {
      runtimeRefs.add(toCanonicalAnthropicModelRef(rawRef));
    }
    /* 为每个引用添加 claude-cli 运行时标记 */
    for (const ref of runtimeRefs) {
      const current = nextModels[ref];
      const updated = modelEntryWithClaudeCliRuntime(current);
      /* 如果没有变化，跳过 */
      if (JSON.stringify(updated) === JSON.stringify(current ?? {})) {
        continue;
      }
      nextModels[ref] = updated;
      modelsMutated = true;
    }
    if (modelsMutated) {
      nextDefaults.models = nextModels;
      mutated = true;
    }
  }

  /* 如果没有任何修改，返回原始配置 */
  if (!mutated) {
    return params.config;
  }

  return {
    ...params.config,
    agents: {
      ...params.config.agents,
      defaults: nextDefaults,
    },
  };
}
