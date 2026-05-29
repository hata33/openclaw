// Public usage fetch helpers for provider plugins.

/**
 * @file Provider 用量统计公共辅助模块
 *
 * 导出与 Provider 用量查询相关的类型和函数，用于获取各 AI Provider 的 token 消耗和费用统计。
 *
 * 支持的 Provider：
 * - Claude (Anthropic): 通过 Anthropic API 查询用量
 * - Codex (OpenAI): 通过 OpenAI API 查询用量
 * - Gemini (Google): 通过 Google API 查询用量
 * - Minimax: 通过 Minimax API 查询用量
 * - Zai: 通过 Zai API 查询用量
 *
 * 导出的类型：
 * - ProviderUsageSnapshot: 用量快照数据结构
 * - UsageProviderId: 支持用量查询的 Provider ID
 * - UsageWindow: 用量统计时间窗口
 *
 * 为什么单独封装：用量查询逻辑涉及多个 Provider 的不同 API，
 * 需要统一接口以简化 Provider 插件的用量报告实现。
 */

export type {
  ProviderUsageSnapshot,
  UsageProviderId,
  UsageWindow,
} from "../infra/provider-usage.types.js";

export {
  fetchClaudeUsage,
  fetchCodexUsage,
  fetchGeminiUsage,
  fetchMinimaxUsage,
  fetchZaiUsage,
} from "../infra/provider-usage.fetch.js";
export {
  clampPercent,
  PROVIDER_LABELS,
  resolveLegacyPiAgentAccessToken,
} from "../infra/provider-usage.shared.js";
export {
  buildUsageErrorSnapshot,
  buildUsageHttpErrorSnapshot,
  fetchJson,
} from "../infra/provider-usage.fetch.shared.js";
