/**
 * @fileoverview Anthropic Provider 运行时注册核心文件
 *
 * 本文件是 Anthropic Provider 扩展的核心，负责将 Anthropic 作为模型提供商注册到
 * OpenClaw 的插件系统中。它定义了 Provider 的全部运行时行为，包括：
 *
 * 1. 认证管理
 *    - setup-token 认证：Anthropic 特有的 token 认证方式
 *    - API Key 认证：标准 API Key 方式
 *    - CLI 复用认证：复用本地 Claude CLI 的认证凭证
 *    - 多 Profile 支持：支持多个认证配置并存
 *
 * 2. 模型目录与解析
 *    - 静态模型目录：Claude 系列模型的规格定义
 *    - 动态模型解析：前向兼容新模型（如 claude-opus-4-7 基于 4-6 模板）
 *    - 模型能力规范化：自动补充图片输入、1M 上下文等隐含能力
 *
 * 3. 流式处理
 *    - 流式包装器注册：Beta headers、service tier、fast mode、thinking prefill
 *    - 推理能力配置：Claude extended thinking 的 profile 解析
 *
 * 4. 重放策略
 *    - Anthropic 原生重放格式
 *    - 推理历史处理（保留或剥离 thinking 内容）
 *
 * 5. 用量与缓存
 *    - OAuth 用量查询（fetchUsageSnapshot）
 *    - Prompt cache TTL 管理
 *    - 缓存保留策略（short/long）
 *
 * 6. 配置规范化
 *    - 默认配置应用（上下文修剪、心跳间隔等）
 *    - Provider 特定参数注入
 *
 * 关键设计决策：
 * - 优先使用 CLI 复用认证（减少用户配置负担）
 * - 模板克隆实现前向兼容（新模型自动从旧模型继承能力）
 * - OAuth 和 API Key 的缓存策略差异（OAuth 不设 cacheRetention）
 *
 * 依赖：
 * - cli-auth-seam.ts: CLI 认证接缝
 * - cli-backend.ts: CLI 后端定义
 * - cli-catalog.ts: CLI 模型目录
 * - config-defaults.ts: 配置默认值
 * - stream-wrappers.ts: 流式处理包装器
 * - replay-policy.ts: 重放策略
 * - media-understanding-provider.ts: 媒体理解
 */

import { formatCliCommand, parseDurationMs } from "openclaw/plugin-sdk/cli-runtime";
import type {
  OpenClawPluginApi,
  ProviderAuthContext,
  ProviderAuthMethodNonInteractiveContext,
  ProviderResolveDynamicModelContext,
  ProviderNormalizeResolvedModelContext,
  ProviderRuntimeModel,
} from "openclaw/plugin-sdk/plugin-entry";
import {
  applyAuthProfileConfig,
  type AuthProfileStore,
  buildTokenProfileId,
  createProviderApiKeyAuthMethod,
  listProfilesForProvider,
  type OpenClawConfig as ProviderAuthConfig,
  type ProviderAuthResult,
  suggestOAuthProfileIdForLegacyDefault,
  upsertAuthProfileWithLock,
  validateAnthropicSetupToken,
} from "openclaw/plugin-sdk/provider-auth";
import {
  cloneFirstTemplateModel,
  type ProviderPlugin,
  resolveClaudeThinkingProfile,
} from "openclaw/plugin-sdk/provider-model-shared";
import { fetchClaudeUsage } from "openclaw/plugin-sdk/provider-usage";
import { normalizeLowercaseStringOrEmpty } from "openclaw/plugin-sdk/string-coerce-runtime";
import * as claudeCliAuth from "./cli-auth-seam.js";
import { buildAnthropicCliBackend } from "./cli-backend.js";
import { buildClaudeCliCatalogEntries } from "./cli-catalog.js";
import { buildAnthropicCliMigrationResult } from "./cli-migration.js";
import {
  CLAUDE_CLI_BACKEND_ID,
  CLAUDE_CLI_DEFAULT_ALLOWLIST_REFS,
  CLAUDE_CLI_DEFAULT_MODEL_REF,
} from "./cli-shared.js";
import {
  applyAnthropicConfigDefaults,
  normalizeAnthropicProviderConfigForProvider,
} from "./config-defaults.js";
import { anthropicMediaUnderstandingProvider } from "./media-understanding-provider.js";
import { buildAnthropicReplayPolicy } from "./replay-policy.js";
import { wrapAnthropicProviderStream } from "./stream-wrappers.js";

// ============================================================
// 常量定义
// ============================================================

/** Anthropic Provider 的唯一标识符，用于插件系统中注册和查找 */
const PROVIDER_ID = "anthropic";
type UpsertAuthProfileParams = Parameters<typeof upsertAuthProfileWithLock>[0];

/** 默认模型：当用户未指定模型时使用 Opus 4.7 */
const DEFAULT_ANTHROPIC_MODEL = "anthropic/claude-opus-4-7";

// --- 模型 ID 常量 ---
// 支持连字符和点号两种格式（claude-opus-4-7 / claude-opus-4.7）
const ANTHROPIC_OPUS_47_MODEL_ID = "claude-opus-4-7";
const ANTHROPIC_OPUS_47_DOT_MODEL_ID = "claude-opus-4.7";

/** 1M 上下文窗口大小（1,048,576 tokens），GA 1M 模型使用 */
const ANTHROPIC_GA_1M_CONTEXT_TOKENS = 1_048_576;
const ANTHROPIC_OPUS_46_MODEL_ID = "claude-opus-4-6";
const ANTHROPIC_OPUS_46_DOT_MODEL_ID = "claude-opus-4.6";

/**
 * Opus 4.7 的模板模型 ID 列表
 * 当系统不识别 claude-opus-4-7 时，会基于这些模板克隆模型定义
 * 这是前向兼容机制的核心：新模型自动从旧模型继承能力
 */
const ANTHROPIC_OPUS_47_TEMPLATE_MODEL_IDS = [
  ANTHROPIC_OPUS_46_MODEL_ID,
  ANTHROPIC_OPUS_46_DOT_MODEL_ID,
] as const;
const ANTHROPIC_SONNET_46_MODEL_ID = "claude-sonnet-4-6";
const ANTHROPIC_SONNET_46_DOT_MODEL_ID = "claude-sonnet-4.6";

/**
 * 支持 GA 1M 上下文窗口的模型前缀列表
 * 这些模型的上下文窗口会自动设置为 1,048,576 tokens
 * 用于 normalizeResolvedModel() 中判断是否需要扩展上下文窗口
 */
const ANTHROPIC_GA_1M_MODEL_PREFIXES = [
  ANTHROPIC_OPUS_46_MODEL_ID,
  ANTHROPIC_OPUS_46_DOT_MODEL_ID,
  ANTHROPIC_OPUS_47_MODEL_ID,
  ANTHROPIC_OPUS_47_DOT_MODEL_ID,
  ANTHROPIC_SONNET_46_MODEL_ID,
  ANTHROPIC_SONNET_46_DOT_MODEL_ID,
] as const;
const ANTHROPIC_MODERN_MODEL_PREFIXES = [
  "claude-opus-4-7",
  "claude-opus-4.7",
  "claude-opus-4-6",
  "claude-opus-4.6",
  "claude-sonnet-4-6",
  "claude-sonnet-4.6",
] as const;
const ANTHROPIC_SETUP_TOKEN_NOTE_LINES = [
  "Anthropic setup-token auth is supported in OpenClaw.",
  "OpenClaw prefers Claude CLI reuse when it is available on the host.",
  "Anthropic staff told us this OpenClaw path is allowed again.",
  `If you want a direct API billing path instead, use ${formatCliCommand("openclaw models auth login --provider anthropic --method api-key --set-default")} or ${formatCliCommand("openclaw models auth login --provider anthropic --method cli --set-default")}.`,
] as const;

const CLAUDE_CLI_CANONICAL_ALLOWLIST_REFS = CLAUDE_CLI_DEFAULT_ALLOWLIST_REFS.map((ref) =>
  ref.startsWith(`${CLAUDE_CLI_BACKEND_ID}/`)
    ? `anthropic/${ref.slice(CLAUDE_CLI_BACKEND_ID.length + 1)}`
    : ref,
);

/**
 * Auth Profile 更新的安全封装
 * 使用文件锁保证并发安全，失败时抛出异常（而非静默返回 false）
 * 用于 CLI 和非交互式认证流程中
 */
async function upsertAuthProfileWithLockOrThrow(params: UpsertAuthProfileParams): Promise<void> {
  const updated = await upsertAuthProfileWithLock(params);
  if (!updated) {
    throw new Error(
      "Failed to update auth profile store; the auth store lock may be busy. Wait a moment and retry.",
    );
  }
}
const CLAUDE_CLI_CANONICAL_DEFAULT_MODEL_REF = CLAUDE_CLI_DEFAULT_MODEL_REF.startsWith(
  `${CLAUDE_CLI_BACKEND_ID}/`,
)
  ? `anthropic/${CLAUDE_CLI_DEFAULT_MODEL_REF.slice(CLAUDE_CLI_BACKEND_ID.length + 1)}`
  : CLAUDE_CLI_DEFAULT_MODEL_REF;

/**
 * 规范化 setup-token 输入：移除所有空白字符并 trim
 * Anthropic 的 setup-token 可能包含空格（如从网页复制时），需要清理
 */
function normalizeAnthropicSetupTokenInput(value: string): string {
  return value.replaceAll(/\s+/g, "").trim();
}

/**
 * 解析 setup-token 认证的 Profile ID
 * 优先使用用户指定的 profileId，否则使用默认值 "anthropic:default"
 * 自动添加 "anthropic:" 前缀（如果用户只提供了名称部分）
 */
function resolveAnthropicSetupTokenProfileId(rawProfileId?: unknown): string {
  if (typeof rawProfileId === "string") {
    const trimmed = rawProfileId.trim();
    if (trimmed.length > 0) {
      if (trimmed.startsWith(`${PROVIDER_ID}:`)) {
        return trimmed;
      }
      return buildTokenProfileId({ provider: PROVIDER_ID, name: trimmed });
    }
  }
  return `${PROVIDER_ID}:default`;
}

/**
 * 解析 setup-token 的过期时间
 * 支持 "7d"、"30d" 等相对时间格式，默认单位为天
 * 返回绝对时间戳（毫秒），未指定则返回 undefined（不过期）
 */
function resolveAnthropicSetupTokenExpiry(rawExpiresIn?: unknown): number | undefined {
  if (typeof rawExpiresIn !== "string" || rawExpiresIn.trim().length === 0) {
    return undefined;
  }
  return Date.now() + parseDurationMs(rawExpiresIn.trim(), { defaultUnit: "d" });
}

/**
 * 执行 Anthropic setup-token 交互式认证流程
 *
 * 流程：
 * 1. 如果命令行已提供 token，直接使用；否则提示用户粘贴
 * 2. 验证 token 格式
 * 3. 解析 profile ID 和过期时间
 * 4. 返回认证结果（profiles + 默认模型 + 提示信息）
 *
 * 注意：此函数只返回认证结果，不写入持久化存储
 * 实际存储由上层的 auth framework 完成
 */
async function runAnthropicSetupTokenAuth(ctx: ProviderAuthContext): Promise<ProviderAuthResult> {
  const providedToken =
    typeof ctx.opts?.token === "string" && ctx.opts.token.trim().length > 0
      ? normalizeAnthropicSetupTokenInput(ctx.opts.token)
      : undefined;
  const token =
    providedToken ??
    normalizeAnthropicSetupTokenInput(
      await ctx.prompter.text({
        message: "Paste Anthropic setup-token",
        validate: (value) => validateAnthropicSetupToken(normalizeAnthropicSetupTokenInput(value)),
      }),
    );
  const tokenError = validateAnthropicSetupToken(token);
  if (tokenError) {
    throw new Error(tokenError);
  }

  const profileId = resolveAnthropicSetupTokenProfileId(ctx.opts?.tokenProfileId);
  const expires = resolveAnthropicSetupTokenExpiry(ctx.opts?.tokenExpiresIn);

  return {
    profiles: [
      {
        profileId,
        credential: {
          type: "token",
          provider: PROVIDER_ID,
          token,
          ...(expires ? { expires } : {}),
        },
      },
    ],
    defaultModel: DEFAULT_ANTHROPIC_MODEL,
    notes: [...ANTHROPIC_SETUP_TOKEN_NOTE_LINES],
  };
}

/**
 * 执行 Anthropic setup-token 非交互式认证流程
 *
 * 与 runAnthropicSetupTokenAuth 的区别：
 * - 不会提示用户输入（适用于 CI/CD、脚本自动化）
 * - token 必须通过 --token 参数提供
 * - 直接写入 auth profile store
 * - 返回更新后的 OpenClaw 配置
 *
 * 失败时直接调用 ctx.runtime.exit(1) 终止进程
 */
async function runAnthropicSetupTokenNonInteractive(
  ctx: ProviderAuthMethodNonInteractiveContext,
): Promise<ProviderAuthConfig | null> {
  const rawToken =
    typeof ctx.opts.token === "string" ? normalizeAnthropicSetupTokenInput(ctx.opts.token) : "";
  const tokenError = validateAnthropicSetupToken(rawToken);
  if (tokenError) {
    ctx.runtime.error(
      ["Anthropic setup-token auth requires --token with a valid setup-token.", tokenError].join(
        "\n",
      ),
    );
    ctx.runtime.exit(1);
    return null;
  }

  const profileId = resolveAnthropicSetupTokenProfileId(ctx.opts.tokenProfileId);
  const expires = resolveAnthropicSetupTokenExpiry(ctx.opts.tokenExpiresIn);
  await upsertAuthProfileWithLockOrThrow({
    profileId,
    credential: {
      type: "token",
      provider: PROVIDER_ID,
      token: rawToken,
      ...(expires ? { expires } : {}),
    },
    agentDir: ctx.agentDir,
  });

  ctx.runtime.log(ANTHROPIC_SETUP_TOKEN_NOTE_LINES[0]);
  ctx.runtime.log(ANTHROPIC_SETUP_TOKEN_NOTE_LINES[1]);

  const withProfile = applyAuthProfileConfig(ctx.config, {
    profileId,
    provider: PROVIDER_ID,
    mode: "token",
  });
  const existingModelConfig =
    withProfile.agents?.defaults?.model && typeof withProfile.agents.defaults.model === "object"
      ? withProfile.agents.defaults.model
      : {};
  return {
    ...withProfile,
    agents: {
      ...withProfile.agents,
      defaults: {
        ...withProfile.agents?.defaults,
        model: {
          ...existingModelConfig,
          primary: DEFAULT_ANTHROPIC_MODEL,
        },
      },
    },
  };
}

/**
 * Claude 4.6 模型的前向兼容解析
 *
 * 当用户请求一个未知的模型 ID（如未来发布的 claude-opus-4-7 的某个变体）时，
 * 尝试从已知的 4.6 模板克隆模型定义，实现前向兼容。
 *
 * 逻辑：
 * 1. 检查模型 ID 是否匹配 4.6 系列模式
 * 2. 如果是新变体（如 claude-opus-4-7-turbo），从 claude-opus-4-6 模板克隆
 * 3. 如果是已知 ID，使用标准模板
 * 4. 返回克隆后的模型定义，或 undefined（不匹配）
 *
 * 为什么需要这个机制？
 * LLM 提供商频繁发布新模型版本，但 OpenClaw 的发布周期较慢。
 * 前向兼容确保用户在 OpenClaw 更新前就能使用新模型。
 */
function resolveAnthropic46ForwardCompatModel(params: {
  ctx: ProviderResolveDynamicModelContext;
  dashModelId: string;
  dotModelId: string;
  dashTemplateId: string;
  dotTemplateId: string;
  fallbackTemplateIds: readonly string[];
}): ProviderRuntimeModel | undefined {
  const trimmedModelId = params.ctx.modelId.trim();
  const lower = normalizeLowercaseStringOrEmpty(trimmedModelId);
  if (trimmedModelId !== lower) {
    return undefined;
  }
  const is46Model =
    lower === params.dashModelId ||
    lower === params.dotModelId ||
    lower.startsWith(`${params.dashModelId}-`) ||
    lower.startsWith(`${params.dotModelId}-`);
  if (!is46Model) {
    return undefined;
  }

  const templateIds: string[] = [];
  if (lower.startsWith(params.dashModelId)) {
    templateIds.push(lower.replace(params.dashModelId, params.dashTemplateId));
  }
  if (lower.startsWith(params.dotModelId)) {
    templateIds.push(lower.replace(params.dotModelId, params.dotTemplateId));
  }
  templateIds.push(...params.fallbackTemplateIds);

  return cloneFirstTemplateModel({
    providerId: PROVIDER_ID,
    modelId: trimmedModelId,
    templateIds,
    ctx: params.ctx,
    patch:
      normalizeLowercaseStringOrEmpty(params.ctx.provider) === CLAUDE_CLI_BACKEND_ID
        ? { provider: CLAUDE_CLI_BACKEND_ID }
        : undefined,
  });
}

/**
 * Anthropic 前向兼容模型解析（统一入口）
 *
 * 依次尝试以下模板匹配：
 * 1. claude-opus-4-7 系列 → 基于 claude-opus-4-6 模板
 * 2. claude-opus-4-6 系列 → 基于 claude-opus-4-7 模板（反向兼容）
 * 3. claude-sonnet-4-6 系列 → 基于自身模板
 *
 * 为什么是双向的？
 * - 4.7 可能基于 4.6 模板（正常前向兼容）
 * - 4.6 也可能需要 4.7 的某些特性（反向增强）
 */
function resolveAnthropicForwardCompatModel(
  ctx: ProviderResolveDynamicModelContext,
): ProviderRuntimeModel | undefined {
  return (
    resolveAnthropic46ForwardCompatModel({
      ctx,
      dashModelId: ANTHROPIC_OPUS_47_MODEL_ID,
      dotModelId: ANTHROPIC_OPUS_47_DOT_MODEL_ID,
      dashTemplateId: ANTHROPIC_OPUS_46_MODEL_ID,
      dotTemplateId: ANTHROPIC_OPUS_46_DOT_MODEL_ID,
      fallbackTemplateIds: ANTHROPIC_OPUS_47_TEMPLATE_MODEL_IDS,
    }) ??
    resolveAnthropic46ForwardCompatModel({
      ctx,
      dashModelId: ANTHROPIC_OPUS_46_MODEL_ID,
      dotModelId: ANTHROPIC_OPUS_46_DOT_MODEL_ID,
      dashTemplateId: ANTHROPIC_OPUS_47_MODEL_ID,
      dotTemplateId: ANTHROPIC_OPUS_46_MODEL_ID,
      fallbackTemplateIds: ANTHROPIC_OPUS_47_TEMPLATE_MODEL_IDS,
    }) ??
    resolveAnthropic46ForwardCompatModel({
      ctx,
      dashModelId: ANTHROPIC_SONNET_46_MODEL_ID,
      dotModelId: ANTHROPIC_SONNET_46_DOT_MODEL_ID,
      dashTemplateId: ANTHROPIC_SONNET_46_MODEL_ID,
      dotTemplateId: ANTHROPIC_SONNET_46_MODEL_ID,
      fallbackTemplateIds: [ANTHROPIC_SONNET_46_MODEL_ID, ANTHROPIC_SONNET_46_DOT_MODEL_ID],
    })
  );
}

/**
 * 判断模型是否支持 GA 1M 上下文窗口
 * 匹配 claude-opus-4-6/4-7 和 claude-sonnet-4-6 系列
 */
function isAnthropicGa1MModel(modelId: string): boolean {
  const normalized = normalizeLowercaseStringOrEmpty(modelId);
  return ANTHROPIC_GA_1M_MODEL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/**
 * 检查用户是否在配置中手动设置了模型的上下文窗口
 * 如果用户已配置，则不自动覆盖（尊重用户意图）
 */
function hasConfiguredModelContextOverride(
  config: ProviderNormalizeResolvedModelContext["config"],
  provider: string,
  modelId: string,
): boolean {
  const providers = config?.models?.providers;
  if (!providers || typeof providers !== "object") {
    return false;
  }
  const normalizedProvider = normalizeLowercaseStringOrEmpty(provider);
  const normalizedModelId = normalizeLowercaseStringOrEmpty(modelId);
  for (const [providerId, providerConfig] of Object.entries(providers)) {
    if (normalizeLowercaseStringOrEmpty(providerId) !== normalizedProvider) {
      continue;
    }
    if (!Array.isArray(providerConfig?.models)) {
      continue;
    }
    for (const model of providerConfig.models) {
      if (
        normalizeLowercaseStringOrEmpty(typeof model?.id === "string" ? model.id : "") !==
        normalizedModelId
      ) {
        continue;
      }
      if (
        (typeof model?.contextTokens === "number" && model.contextTokens > 0) ||
        (typeof model?.contextWindow === "number" && model.contextWindow > 0)
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 为 GA 1M 模型自动扩展上下文窗口
 *
 * 触发条件：
 * - 模型 ID 匹配 GA 1M 前缀列表
 * - 用户未手动配置上下文窗口
 *
 * 将 contextWindow 和 contextTokens 都设置为 1,048,576
 */
function applyAnthropicGa1MContextWindow(params: {
  config?: ProviderNormalizeResolvedModelContext["config"];
  provider: string;
  modelId: string;
  model: ProviderRuntimeModel;
}): ProviderRuntimeModel | undefined {
  if (!isAnthropicGa1MModel(params.modelId)) {
    return undefined;
  }
  if (hasConfiguredModelContextOverride(params.config, params.provider, params.modelId)) {
    return undefined;
  }
  const nextContextWindow = Math.max(
    params.model.contextWindow ?? 0,
    ANTHROPIC_GA_1M_CONTEXT_TOKENS,
  );
  const nextContextTokens =
    typeof params.model.contextTokens === "number"
      ? Math.max(params.model.contextTokens, ANTHROPIC_GA_1M_CONTEXT_TOKENS)
      : ANTHROPIC_GA_1M_CONTEXT_TOKENS;
  if (
    nextContextWindow === params.model.contextWindow &&
    nextContextTokens === params.model.contextTokens
  ) {
    return undefined;
  }
  return {
    ...params.model,
    contextWindow: nextContextWindow,
    contextTokens: nextContextTokens,
  };
}

/**
 * 判断模型是否为 Anthropic 现代模型
 * 现代模型支持图片输入等高级能力
 */
function matchesAnthropicModernModel(modelId: string): boolean {
  const lower = normalizeLowercaseStringOrEmpty(modelId);
  return ANTHROPIC_MODERN_MODEL_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function hasImageInput(input: unknown): boolean {
  return Array.isArray(input) && input.includes("image");
}

/**
 * 判断模型是否支持 Anthropic 图片输入
 * 通过检查模型 ID 和名称是否匹配现代模型前缀
 */
function supportsAnthropicImageInput(modelId: string, modelName?: string): boolean {
  return [modelId, modelName]
    .filter((value): value is string => typeof value === "string")
    .some((candidate) => matchesAnthropicModernModel(candidate));
}

/**
 * 解析 Anthropic 图片媒体输入参数
 *
 * 根据模型类型设置不同的最大图片尺寸：
 * - Opus 4.7: 2576px（支持更高分辨率）
 * - 其他现代模型: 1568px
 *
 * tokenMode 设为 "provider" 表示图片 token 由 Anthropic 自己计算
 */
function resolveAnthropicImageMediaInput(modelId: string, modelName?: string) {
  if (!supportsAnthropicImageInput(modelId, modelName)) {
    return undefined;
  }
  const refs = [modelId, modelName].filter((value): value is string => typeof value === "string");
  const opus47 = refs.some((ref) =>
    [ANTHROPIC_OPUS_47_MODEL_ID, ANTHROPIC_OPUS_47_DOT_MODEL_ID].some((prefix) =>
      normalizeLowercaseStringOrEmpty(ref).startsWith(prefix),
    ),
  );
  return {
    image: {
      maxSidePx: opus47 ? 2576 : 1568,
      preferredSidePx: opus47 ? 2576 : 1568,
      tokenMode: "provider" as const,
    },
  };
}

/**
 * 应用 Anthropic 图片输入能力
 * 如果模型尚未声明图片输入能力，且匹配现代模型，则自动添加
 */
function applyAnthropicImageInputCapability(params: {
  modelId: string;
  model: ProviderRuntimeModel;
}): ProviderRuntimeModel | undefined {
  if (hasImageInput(params.model.input)) {
    return undefined;
  }
  if (!supportsAnthropicImageInput(params.modelId, params.model.name)) {
    return undefined;
  }
  return {
    ...params.model,
    input: ["text", "image"],
  };
}

/**
 * Anthropic 模型规范化入口函数
 *
 * 按顺序应用以下规范化：
 * 1. 图片输入能力：现代模型自动添加 image 输入
 * 2. 图片媒体参数：设置最大图片尺寸
 * 3. GA 1M 上下文窗口：自动扩展到 1M tokens
 *
 * 每一步都是幂等的——如果能力已存在则跳过
 */
function normalizeAnthropicResolvedModel(
  ctx: ProviderNormalizeResolvedModelContext,
): ProviderRuntimeModel | undefined {
  const imageCapableModel = applyAnthropicImageInputCapability(ctx) ?? ctx.model;
  const mediaInput = resolveAnthropicImageMediaInput(ctx.modelId, imageCapableModel.name);
  const mediaInputModel = mediaInput
    ? {
        ...imageCapableModel,
        mediaInput: {
          ...mediaInput,
          ...imageCapableModel.mediaInput,
          image: {
            ...mediaInput.image,
            ...imageCapableModel.mediaInput?.image,
          },
        },
      }
    : imageCapableModel;
  const contextWindowModel =
    applyAnthropicGa1MContextWindow({
      config: ctx.config,
      provider: ctx.provider,
      modelId: ctx.modelId,
      model: mediaInputModel,
    }) ?? mediaInputModel;
  return contextWindowModel === ctx.model ? undefined : contextWindowModel;
}

/**
 * 生成 Anthropic 认证诊断提示信息
 *
 * 当认证出现问题时，生成包含以下信息的诊断字符串：
 * - 当前 provider 和 profile 配置
 * - auth store 中的 OAuth profiles
 * - 建议的修复 profile ID
 * - 修复命令（openclaw doctor --yes）
 *
 * 用于 GitHub issue 报告中附带诊断信息
 */
function buildAnthropicAuthDoctorHint(params: {
  config?: ProviderAuthContext["config"];
  store: AuthProfileStore;
  profileId?: string;
}): string {
  const legacyProfileId = params.profileId ?? "anthropic:default";
  const suggested = suggestOAuthProfileIdForLegacyDefault({
    cfg: params.config,
    store: params.store,
    provider: PROVIDER_ID,
    legacyProfileId,
  });
  if (!suggested || suggested === legacyProfileId) {
    return "";
  }

  const storeOauthProfiles = listProfilesForProvider(params.store, PROVIDER_ID)
    .filter((id) => params.store.profiles[id]?.type === "oauth")
    .join(", ");

  const cfgMode = params.config?.auth?.profiles?.[legacyProfileId]?.mode;
  const cfgProvider = params.config?.auth?.profiles?.[legacyProfileId]?.provider;

  return [
    "Doctor hint (for GitHub issue):",
    `- provider: ${PROVIDER_ID}`,
    `- config: ${legacyProfileId}${
      cfgProvider || cfgMode ? ` (provider=${cfgProvider ?? "?"}, mode=${cfgMode ?? "?"})` : ""
    }`,
    `- auth store oauth profiles: ${storeOauthProfiles || "(none)"}`,
    `- suggested profile: ${suggested}`,
    `Fix: run "${formatCliCommand("openclaw doctor --yes")}"`,
  ].join("\n");
}

/**
 * 解析 Claude CLI 的合成认证（synthetic auth）
 *
 * 从本地 Claude CLI 读取已缓存的认证凭证，
 * 将其转换为 OpenClaw 可以直接使用的格式。
 *
 * 支持两种凭证类型：
 * - OAuth: 使用 access token，附带过期时间
 * - Token: 使用 API key（setup-token 认证）
 *
 * "合成"意味着用户没有在 OpenClaw 中显式配置 Anthropic，
 * 而是复用了 Claude CLI 已有的认证状态。
 */
function resolveClaudeCliSyntheticAuth() {
  const credential = claudeCliAuth.readClaudeCliCredentialsForRuntime();
  if (!credential) {
    return undefined;
  }
  return credential.type === "oauth"
    ? {
        apiKey: credential.access,
        source: "Claude CLI native auth",
        mode: "oauth" as const,
        expiresAt: credential.expires,
      }
    : {
        apiKey: credential.token,
        source: "Claude CLI native auth",
        mode: "token" as const,
        expiresAt: credential.expires,
      };
}

/**
 * 执行 Claude CLI 到 OpenClaw 的认证迁移（交互式）
 *
 * 从本地 Claude CLI 读取认证凭证，
 * 将其转换为 OpenClaw 的 auth profile 并存储。
 * 如果 Claude CLI 未认证，抛出错误并提示用户运行 claude auth login。
 */
async function runAnthropicCliMigration(ctx: ProviderAuthContext): Promise<ProviderAuthResult> {
  const credential = claudeCliAuth.readClaudeCliCredentialsForSetup();
  if (!credential) {
    throw new Error(
      [
        "Claude CLI is not authenticated on this host.",
        `Run ${formatCliCommand("claude auth login")} first, then re-run this setup.`,
      ].join("\n"),
    );
  }
  return buildAnthropicCliMigrationResult(ctx.config, credential);
}

/**
 * 执行 Claude CLI 到 OpenClaw 的认证迁移（非交互式）
 *
 * 与 runAnthropicCliMigration 的区别：
 * - 不会提示用户（适用于 CI/CD）
 * - 直接写入配置
 * - 失败时调用 ctx.runtime.exit(1) 终止进程
 */
async function runAnthropicCliMigrationNonInteractive(ctx: {
  config: ProviderAuthContext["config"];
  runtime: ProviderAuthContext["runtime"];
  agentDir?: string;
}): Promise<ProviderAuthContext["config"] | null> {
  const credential = claudeCliAuth.readClaudeCliCredentialsForSetupNonInteractive();
  if (!credential) {
    ctx.runtime.error(
      [
        'Auth choice "anthropic-cli" requires Claude CLI auth on this host.',
        `Run ${formatCliCommand("claude auth login")} first.`,
      ].join("\n"),
    );
    ctx.runtime.exit(1);
    return null;
  }

  const result = buildAnthropicCliMigrationResult(ctx.config, credential);
  const currentDefaults = ctx.config.agents?.defaults;
  const currentModel = currentDefaults?.model;
  const currentFallbacks =
    currentModel && typeof currentModel === "object" && "fallbacks" in currentModel
      ? currentModel.fallbacks
      : undefined;
  const migratedModel = result.configPatch?.agents?.defaults?.model;
  const migratedFallbacks =
    migratedModel && typeof migratedModel === "object" && "fallbacks" in migratedModel
      ? migratedModel.fallbacks
      : undefined;
  const nextFallbacks = Array.isArray(migratedFallbacks) ? migratedFallbacks : currentFallbacks;

  return {
    ...ctx.config,
    ...result.configPatch,
    agents: {
      ...ctx.config.agents,
      ...result.configPatch?.agents,
      defaults: {
        ...currentDefaults,
        ...result.configPatch?.agents?.defaults,
        model: {
          ...(Array.isArray(nextFallbacks) ? { fallbacks: nextFallbacks } : {}),
          primary: result.defaultModel,
        },
      },
    },
  };
}

/**
 * 构建完整的 Anthropic ProviderPlugin 实例
 *
 * 这是整个文件的主导出函数，组装了 Anthropic Provider 的全部能力：
 *
 * 认证方式（按优先级）：
 * 1. Claude CLI — 复用本地 Claude CLI 认证（最便捷）
 * 2. setup-token — Anthropic 特有的 bearer token 认证
 * 3. API Key — 标准 API Key 认证
 *
 * 注册的能力：
 * - 模型目录（静态 + CLI 动态目录）
 * - 流式处理包装器链（beta headers + service tier + fast mode + thinking prefill）
 * - 重放策略（Anthropic 原生格式）
 * - 推理能力（Claude extended thinking）
 * - 模型规范化（图片输入 + 1M 上下文）
 * - 前向兼容（模板克隆）
 * - 用量查询（OAuth token 使用量）
 * - 缓存 TTL 管理
 * - Auth 诊断（doctor hint）
 * - 媒体理解 Provider
 */
export function buildAnthropicProvider(): ProviderPlugin {
  const providerId = "anthropic";
  const defaultAnthropicModel = DEFAULT_ANTHROPIC_MODEL;
  return {
    id: providerId,
    label: "Anthropic",
    docsPath: "/providers/models",
    hookAliases: [CLAUDE_CLI_BACKEND_ID],
    envVars: ["ANTHROPIC_OAUTH_TOKEN", "ANTHROPIC_API_KEY"],
    oauthProfileIdRepairs: [
      {
        legacyProfileId: "anthropic:default",
        promptLabel: "Anthropic",
      },
    ],
    auth: [
      {
        id: "cli",
        label: "Claude CLI",
        hint: "Reuse a local Claude CLI login and run Anthropic models through the Claude CLI runtime",
        kind: "custom",
        wizard: {
          choiceId: "anthropic-cli",
          choiceLabel: "Anthropic Claude CLI",
          choiceHint: "Reuse a local Claude CLI login on this host",
          assistantPriority: -20,
          groupId: "anthropic",
          groupLabel: "Anthropic",
          groupHint: "Claude CLI + API key",
          modelAllowlist: {
            allowedKeys: [...CLAUDE_CLI_CANONICAL_ALLOWLIST_REFS],
            initialSelections: [CLAUDE_CLI_CANONICAL_DEFAULT_MODEL_REF],
            message: "Claude CLI models",
          },
        },
        run: async (ctx: ProviderAuthContext) => await runAnthropicCliMigration(ctx),
        runNonInteractive: async (ctx) =>
          await runAnthropicCliMigrationNonInteractive({
            config: ctx.config,
            runtime: ctx.runtime,
            agentDir: ctx.agentDir,
          }),
      },
      {
        id: "setup-token",
        label: "Anthropic setup-token",
        hint: "Manual bearer token path",
        kind: "token",
        wizard: {
          choiceId: "setup-token",
          choiceLabel: "Anthropic setup-token",
          choiceHint: "Manual token path",
          assistantPriority: 40,
          groupId: "anthropic",
          groupLabel: "Anthropic",
          groupHint: "Claude CLI + API key + token",
        },
        run: async (ctx: ProviderAuthContext) => await runAnthropicSetupTokenAuth(ctx),
        runNonInteractive: async (ctx: ProviderAuthMethodNonInteractiveContext) =>
          await runAnthropicSetupTokenNonInteractive(ctx),
      },
      createProviderApiKeyAuthMethod({
        providerId,
        methodId: "api-key",
        label: "Anthropic API key",
        hint: "Direct Anthropic API key",
        optionKey: "anthropicApiKey",
        flagName: "--anthropic-api-key",
        envVar: "ANTHROPIC_API_KEY",
        promptMessage: "Enter Anthropic API key",
        defaultModel: defaultAnthropicModel,
        expectedProviders: ["anthropic"],
        wizard: {
          choiceId: "apiKey",
          choiceLabel: "Anthropic API key",
          groupId: "anthropic",
          groupLabel: "Anthropic",
          groupHint: "Claude CLI + API key",
        },
      }),
    ],
    normalizeConfig: ({ provider, providerConfig }) =>
      normalizeAnthropicProviderConfigForProvider({ provider, providerConfig }),
    applyConfigDefaults: ({ config, env }) => applyAnthropicConfigDefaults({ config, env }),
    resolveDynamicModel: (ctx) => {
      const model = resolveAnthropicForwardCompatModel(ctx);
      if (!model) {
        return undefined;
      }
      const imageCapableModel =
        applyAnthropicImageInputCapability({
          modelId: ctx.modelId,
          model,
        }) ?? model;
      return (
        applyAnthropicGa1MContextWindow({
          config: ctx.config,
          provider: ctx.provider,
          modelId: ctx.modelId,
          model: imageCapableModel,
        }) ?? imageCapableModel
      );
    },
    normalizeResolvedModel: (ctx) => normalizeAnthropicResolvedModel(ctx),
    resolveSyntheticAuth: ({ provider }) =>
      normalizeLowercaseStringOrEmpty(provider) === CLAUDE_CLI_BACKEND_ID
        ? resolveClaudeCliSyntheticAuth()
        : undefined,
    // Publish Claude CLI rows through the provider catalog hook.
    augmentModelCatalog: () => buildClaudeCliCatalogEntries(),
    buildReplayPolicy: buildAnthropicReplayPolicy,
    isModernModelRef: ({ modelId }) => matchesAnthropicModernModel(modelId),
    resolveReasoningOutputMode: () => "native",
    resolveThinkingProfile: ({ modelId }) => resolveClaudeThinkingProfile(modelId),
    wrapStreamFn: wrapAnthropicProviderStream,
    resolveUsageAuth: async (ctx) => await ctx.resolveOAuthToken(),
    fetchUsageSnapshot: async (ctx) =>
      await fetchClaudeUsage(ctx.token, ctx.timeoutMs, ctx.fetchFn),
    isCacheTtlEligible: () => true,
    buildAuthDoctorHint: (ctx) =>
      buildAnthropicAuthDoctorHint({
        config: ctx.config,
        store: ctx.store,
        profileId: ctx.profileId,
      }),
  };
}

/**
 * 注册 Anthropic 插件到 OpenClaw 插件系统
 *
 * 注册内容：
 * 1. CLI 后端 — Claude CLI 的集成
 * 2. Provider — Anthropic 模型提供商（包含所有认证、模型、流式能力）
 * 3. 媒体理解 Provider — 图片/文档理解能力
 *
 * 此函数在扩展加载时由 index.ts 调用
 */
export function registerAnthropicPlugin(api: OpenClawPluginApi): void {
  api.registerCliBackend(buildAnthropicCliBackend());
  api.registerProvider(buildAnthropicProvider());
  api.registerMediaUnderstandingProvider(anthropicMediaUnderstandingProvider);
}
