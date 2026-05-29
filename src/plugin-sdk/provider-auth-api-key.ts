/**
 * @file Provider API Key 认证公共辅助模块
 *
 * 导出 API Key 认证流程所需的类型和函数，是 Provider 插件实现 API Key 登录的核心工具集。
 *
 * 主要功能：
 * - API Key 输入验证和格式化
 * - 认证 Profile 的创建和更新
 * - Secret Input 模式处理（直接输入/环境变量/密钥引用）
 * - Provider API Key 认证方法创建
 *
 * 设计原则：
 * - 所有 API Key 输入都经过验证和规范化
 * - 支持多种密钥存储方式（直接存储、环境变量引用、密钥管理器引用）
 * - 通过 Profile 机制支持多账号切换
 */

// Public API-key onboarding helpers for provider plugins.

export type { OpenClawConfig } from "../config/config.js";
export type { SecretInput } from "../config/types.secrets.js";

export { upsertAuthProfile, upsertAuthProfileWithLock } from "../agents/auth-profiles/profiles.js";
export {
  formatApiKeyPreview,
  normalizeApiKeyInput,
  validateApiKeyInput,
  ensureApiKeyFromOptionEnvOrPrompt,
  normalizeSecretInputModeInput,
  promptSecretRefForSetup,
  resolveSecretInputModeForEnvSelection,
} from "../plugins/provider-auth-input.js";
export {
  applyAuthProfileConfig,
  buildApiKeyCredential,
  upsertApiKeyProfile,
  type ApiKeyStorageOptions,
} from "../plugins/provider-auth-helpers.js";
export { createProviderApiKeyAuthMethod } from "../plugins/provider-api-key-auth.js";
export {
  normalizeOptionalSecretInput,
  normalizeSecretInput,
} from "../utils/normalize-secret-input.js";
