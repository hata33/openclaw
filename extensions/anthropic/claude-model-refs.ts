/**
 * @fileoverview Claude 模型引用解析（Model Refs）
 *
 * 本文件负责解析和规范化 Claude 模型的引用标识符。
 * 模型引用是 OpenClaw 系统中用于标识特定模型的字符串，
 * 格式通常为 "provider/model-id"，如 "anthropic/claude-opus-4-7"。
 *
 * 核心功能：
 *
 * 1. 模型 ID 规范化（canonicalizeKnownClaudeCliModelId）
 *    - 将简短别名（如 "opus"、"sonnet"）转换为完整模型 ID
 *    - 将旧版模型 ID（如 claude-3-opus）升级到最新版本
 *    - 处理点号和连字符分隔的版本号（如 4.7 vs 4-7）
 *
 * 2. 旧模型 ID 升级（upgradeOldClaudeModelId）
 *    - claude-opus-4、claude-opus-4-5、claude-opus-4.5 等 → claude-opus-4-7
 *    - claude-sonnet-4、claude-sonnet-4-5 等 → claude-sonnet-4-6
 *    - claude-haiku-* → claude-sonnet-4-6（haiku 系列合并到 sonnet）
 *    - claude-3-* 系列 → 对应的 4.x 版本
 *
 * 3. Auth Profile 附加/分离
 *    - 模型引用可以包含 @profile 后缀来指定认证配置文件
 *    - 如 "claude-opus-4-7@my-profile"
 *    - splitTrailingModelAuthProfile 负责分离模型 ID 和 profile 名称
 *
 * 4. 运行时引用解析（resolveClaudeCliAnthropicModelRefs）
 *    - 返回选定引用（selectedRef）、运行时引用列表（runtimeRefs）
 *      和可选的重写引用（rewriteRef）
 *    - 用于 CLI 迁移和配置标准化
 *
 * 为什么需要这个模块：
 * 用户可能使用各种格式指定模型（简短别名、旧版本号、带 profile 的引用），
 * 此模块确保所有这些格式都能正确解析到对应的 Claude 模型。
 */

import { normalizeLowercaseStringOrEmpty } from "openclaw/plugin-sdk/string-coerce-runtime";
import { CLAUDE_CLI_BACKEND_ID, CLAUDE_CLI_MODEL_ALIASES } from "./cli-constants.js";

/**
 * 默认 Claude 模型族映射
 * 将模型族名（opus/sonnet/haiku）映射到当前推荐的模型 ID
 */
const DEFAULT_CLAUDE_MODEL_BY_FAMILY: Record<string, string> = {
  opus: "claude-opus-4-7",
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-sonnet-4-6", /* haiku 系列当前推荐使用 sonnet */
};

/**
 * Claude CLI Anthropic 模型引用解析结果
 */
export type ClaudeCliAnthropicModelRefs = {
  /** 选定的引用（anthropic/ 前缀） */
  selectedRef: string;
  /** 所有可能的运行时引用列表（用于匹配和兼容） */
  runtimeRefs: string[];
  /** 重写后的规范引用（如果需要重写） */
  rewriteRef?: string;
};

/**
 * 分离模型引用末尾的 Auth Profile 标识
 *
 * 模型引用可以包含 @profile 后缀来指定认证配置文件，
 * 如 "claude-opus-4-7@my-profile" 或 "anthropic/claude-opus-4-7@my-profile"。
 *
 * 特殊处理：日期格式的 profile（如 @20250101@real-profile）
 * 会被正确识别，避免将日期部分误认为 profile 名称。
 *
 * @param raw - 原始模型引用字符串
 * @returns 分离后的模型和可选的 profile 名称
 */
function splitTrailingModelAuthProfile(raw: string): { model: string; profile?: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { model: "" };
  }
  /* 找到最后一个 / 的位置，profile 分隔符 @ 只在其后查找 */
  const lastSlash = trimmed.lastIndexOf("/");
  let delimiter = trimmed.indexOf("@", lastSlash + 1);
  if (delimiter <= 0) {
    return { model: trimmed };
  }
  /**
   * 处理日期格式的 profile（如 20250101@real-profile）
   * 如果 @ 后紧跟 8 位数字（日期格式），则跳过这个 @，
   * 查找下一个 @ 作为真正的 profile 分隔符
   */
  if (/^\d{8}(?:@|$)/.test(trimmed.slice(delimiter + 1))) {
    const nextDelimiter = trimmed.indexOf("@", delimiter + 9);
    if (nextDelimiter < 0) {
      return { model: trimmed };
    }
    delimiter = nextDelimiter;
  }
  const model = trimmed.slice(0, delimiter).trim();
  const profile = trimmed.slice(delimiter + 1).trim();
  return model && profile ? { model, profile } : { model: trimmed };
}

/**
 * 将 Auth Profile 附加到模型引用
 *
 * @param model - 模型 ID
 * @param profile - 可选的 profile 名称
 * @returns 带 profile 的模型引用
 */
function attachModelAuthProfile(model: string, profile?: string): string {
  return profile ? `${model}@${profile}` : model;
}

/**
 * 检查模型 ID 是否匹配已废弃的版本前缀
 *
 * 匹配规则：normalized 以 prefix 开头，且紧跟的字符是分隔符（-/.:@）或字符串结束。
 * 这避免了误匹配，如 "claude-opus-4-7" 不应匹配 "claude-opus-4-" 前缀。
 *
 * @param normalized - 标准化后的模型 ID
 * @param prefix - 已废弃的版本前缀
 * @returns 是否匹配
 */
function hasRetiredVersionPrefix(normalized: string, prefix: string): boolean {
  if (normalized === prefix) {
    return true;
  }
  if (!normalized.startsWith(prefix)) {
    return false;
  }
  const next = normalized[prefix.length];
  return next === "-" || next === "." || next === ":" || next === "@";
}

/**
 * 检查模型 ID 是否匹配任意一个已废弃的版本前缀
 *
 * @param normalized - 标准化后的模型 ID
 * @param prefixes - 已废弃的版本前缀列表
 * @returns 是否匹配任意一个
 */
function hasAnyRetiredVersionPrefix(normalized: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => hasRetiredVersionPrefix(normalized, prefix));
}

/**
 * 解析 Provider 模型引用
 *
 * 将 "provider/model" 格式的字符串解析为 provider 和 model 两部分。
 * 如果没有 provider 前缀，使用 defaultProvider 作为默认值。
 *
 * @param raw - 原始模型引用
 * @param defaultProvider - 默认 Provider
 * @returns 解析结果，包含 provider、model 和是否显式指定了 provider
 */
function parseProviderModelRef(
  raw: string,
  defaultProvider: string,
): { provider: string; model: string; explicitProvider: boolean } | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const slashIndex = trimmed.indexOf("/");
  if (slashIndex <= 0) {
    return { provider: defaultProvider, model: trimmed, explicitProvider: false };
  }
  const provider = trimmed.slice(0, slashIndex).trim();
  const model = trimmed.slice(slashIndex + 1).trim();
  if (!provider || !model) {
    return null;
  }
  return {
    provider: normalizeLowercaseStringOrEmpty(provider),
    model,
    explicitProvider: true,
  };
}

/**
 * 规范化已知的 Claude CLI 模型 ID
 *
 * 综合处理：
 * 1. 分离 Auth Profile
 * 2. 尝试升级旧模型 ID
 * 3. 如果已经是 claude-* 前缀的模型 ID，直接返回
 * 4. 尝试从模型族别名解析
 *
 * @param modelId - 原始模型 ID
 * @returns 规范化后的模型 ID（含 profile），无法识别时返回 null
 */
function canonicalizeKnownClaudeCliModelId(modelId: string): string | null {
  const split = splitTrailingModelAuthProfile(modelId);
  const trimmed = split.model.trim();
  const normalized = normalizeLowercaseStringOrEmpty(trimmed);
  if (!normalized) {
    return null;
  }
  /* 尝试升级旧模型 ID */
  const upgraded = upgradeOldClaudeModelId(normalized);
  if (upgraded) {
    return attachModelAuthProfile(upgraded, split.profile);
  }
  /* 如果已经是 claude-* 前缀的模型 ID，直接返回 */
  if (normalized.startsWith("claude-")) {
    return attachModelAuthProfile(trimmed, split.profile);
  }
  /* 尝试从模型族别名解析（如 "opus" → "claude-opus-4-7"） */
  const defaultModel = DEFAULT_CLAUDE_MODEL_BY_FAMILY[normalized];
  if (defaultModel) {
    return attachModelAuthProfile(defaultModel, split.profile);
  }
  /**
   * 从 CLAUDE_CLI_MODEL_ALIASES 解析
   * 如 "opus-4.7" → family="opus", version="4.7" → "claude-opus-4-7"
   */
  const family = CLAUDE_CLI_MODEL_ALIASES[normalized];
  if (!family) {
    return null;
  }
  const version = normalized.slice(`${family}-`.length);
  if (!version || version === normalized) {
    return null;
  }
  return attachModelAuthProfile(`claude-${family}-${version.replaceAll(".", "-")}`, split.profile);
}

/**
 * 升级旧版 Claude 模型 ID 到最新版本
 *
 * 映射规则：
 * - claude-opus-4 / claude-opus-4-5 / claude-opus-4.5 / claude-opus-4-0 等 → claude-opus-4-7
 * - claude-sonnet-4 / claude-sonnet-4-5 / claude-sonnet-4.5 等 → claude-sonnet-4-6
 * - claude-haiku-4-5 / claude-haiku-4.5 → claude-sonnet-4-6
 * - claude-3-opus-* → claude-opus-4-7
 * - claude-3-sonnet-* / claude-3-haiku-* → claude-sonnet-4-6
 * - opus-4.5 / opus-4.1 等简短别名 → claude-opus-4-7
 * - sonnet-4.5 / sonnet-3.7 等简短别名 → claude-sonnet-4-6
 *
 * @param normalized - 标准化后的模型 ID
 * @returns 升级后的模型 ID，无需升级时返回 null
 */
function upgradeOldClaudeModelId(normalized: string): string | null {
  /* 如果已经是最新版本，无需升级 */
  if (normalized.startsWith("claude-opus-4-7") || normalized.startsWith("claude-opus-4.7")) {
    return null;
  }
  if (normalized.startsWith("claude-opus-4-6") || normalized.startsWith("claude-opus-4.6")) {
    return null;
  }
  if (normalized.startsWith("claude-sonnet-4-6") || normalized.startsWith("claude-sonnet-4.6")) {
    return null;
  }

  /* claude-opus-4 / claude-opus-4-5 / claude-opus-4-1 / claude-opus-4-0 / claude-opus-4-20XXXXXX → claude-opus-4-7 */
  if (
    normalized === "claude-opus-4" ||
    hasAnyRetiredVersionPrefix(normalized, [
      "claude-opus-4-5",
      "claude-opus-4.5",
      "claude-opus-4-1",
      "claude-opus-4.1",
      "claude-opus-4-0",
      "claude-opus-4.0",
    ]) ||
    /^claude-opus-4-20\d{6}/.test(normalized)
  ) {
    return "claude-opus-4-7";
  }

  /* claude-sonnet-4 / claude-sonnet-4-5 / claude-haiku-4-5 等 → claude-sonnet-4-6 */
  if (
    normalized === "claude-sonnet-4" ||
    hasAnyRetiredVersionPrefix(normalized, [
      "claude-sonnet-4-5",
      "claude-sonnet-4.5",
      "claude-sonnet-4-1",
      "claude-sonnet-4.1",
      "claude-sonnet-4-0",
      "claude-sonnet-4.0",
      "claude-haiku-4-5",
      "claude-haiku-4.5",
    ]) ||
    /^claude-sonnet-4-20\d{6}/.test(normalized)
  ) {
    return "claude-sonnet-4-6";
  }

  /* claude-3-opus-* → claude-opus-4-7 */
  if (normalized.startsWith("claude-3") && normalized.includes("opus")) {
    return "claude-opus-4-7";
  }

  /* claude-3-sonnet-* / claude-3-haiku-* → claude-sonnet-4-6 */
  if (
    normalized.startsWith("claude-3") &&
    (normalized.includes("sonnet") || normalized.includes("haiku"))
  ) {
    return "claude-sonnet-4-6";
  }

  /* 简短别名：opus-4.5 / opus-4.1 / opus-4 / opus-3 → claude-opus-4-7 */
  if (
    normalized === "opus-4.5" ||
    normalized === "opus-4.1" ||
    normalized === "opus-4" ||
    normalized === "opus-3"
  ) {
    return "claude-opus-4-7";
  }

  /* 简短别名：sonnet-* / haiku-* → claude-sonnet-4-6 */
  if (
    normalized === "sonnet-4.5" ||
    normalized === "sonnet-4.1" ||
    normalized === "sonnet-4.0" ||
    normalized === "sonnet-4" ||
    normalized === "sonnet-3.7" ||
    normalized === "sonnet-3.5" ||
    normalized === "sonnet-3" ||
    normalized === "haiku-4.5" ||
    normalized === "haiku-3.5" ||
    normalized === "haiku-3"
  ) {
    return "claude-sonnet-4-6";
  }

  return null;
}

/**
 * 解析 Claude CLI Anthropic 模型引用
 *
 * 这是模型引用解析的主入口函数。接受任意格式的模型引用字符串，
 * 返回结构化的解析结果，包含：
 * - selectedRef: 选定的引用（anthropic/ 前缀）
 * - runtimeRefs: 所有可能的运行时引用列表
 * - rewriteRef: 可选的重写引用（当需要规范化时）
 *
 * @param raw - 原始模型引用字符串
 * @returns 解析结果，无法解析时返回 null
 */
export function resolveClaudeCliAnthropicModelRefs(
  raw: string,
): ClaudeCliAnthropicModelRefs | null {
  const parsed = parseProviderModelRef(raw, "anthropic");
  if (!parsed) {
    return null;
  }
  /* 只处理 anthropic 和 claude-cli 两个 Provider */
  if (parsed.provider !== "anthropic" && parsed.provider !== CLAUDE_CLI_BACKEND_ID) {
    return null;
  }

  const selectedRef = `anthropic/${parsed.model}`;
  const runtimeRefs = new Set<string>([selectedRef]);
  const canonicalModelId = canonicalizeKnownClaudeCliModelId(parsed.model);
  /* 如果没有显式指定 Provider 且无法识别模型 ID，返回 null */
  if (!parsed.explicitProvider && !canonicalModelId) {
    return null;
  }
  /**
   * 确定是否需要重写引用
   * 当有规范化的模型 ID 或 Provider 是 claude-cli 时，需要重写
   */
  const rewriteRef =
    canonicalModelId || parsed.provider === CLAUDE_CLI_BACKEND_ID
      ? `anthropic/${canonicalModelId ?? parsed.model}`
      : undefined;
  if (rewriteRef) {
    runtimeRefs.add(rewriteRef);
  }

  return {
    selectedRef,
    runtimeRefs: [...runtimeRefs],
    ...(rewriteRef ? { rewriteRef } : {}),
  };
}

/**
 * 解析已知的 Anthropic 模型引用
 *
 * 简化版的模型引用解析，只返回重写后的规范引用。
 * 如果无法解析，返回原始输入。
 *
 * @param raw - 原始模型引用字符串
 * @returns 规范化的模型引用，输入为空时返回 null
 */
export function resolveKnownAnthropicModelRef(raw?: string): string | null {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  return resolveClaudeCliAnthropicModelRefs(trimmed)?.rewriteRef ?? trimmed;
}
