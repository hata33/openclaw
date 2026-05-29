/**
 * @fileoverview Provider 契约 API（测试用桩）
 *
 * 提供 OpenAI 和 Codex Provider 的轻量级契约实现，主要用于：
 * - 契约测试（contract test）：验证 Provider 接口的结构正确性
 * - 文档生成：展示 Provider 注册所需的基本字段
 *
 * 与完整的 openai-provider.ts 和 openai-codex-provider.ts 不同，
 * 此模块中的 auth.run 方法是 noop（无操作），不执行实际的认证流程。
 * 这使得测试可以在不依赖外部服务的情况下验证 Provider 结构。
 */

import type { ProviderPlugin } from "openclaw/plugin-sdk/provider-model-shared";
import {
  OPENAI_ACCOUNT_WIZARD_GROUP,
  OPENAI_API_KEY_LABEL,
  OPENAI_CODEX_DEVICE_PAIRING_HINT,
  OPENAI_CODEX_DEVICE_PAIRING_LABEL,
  OPENAI_CODEX_LOGIN_HINT,
  OPENAI_CODEX_LOGIN_LABEL,
  OPENAI_CODEX_WIZARD_GROUP,
} from "./auth-choice-copy.js";

/** 空操作的认证方法，仅返回空的 profiles 数组 */
const noopAuth = async () => ({ profiles: [] });

/**
 * 创建 OpenAI Codex Provider 的契约实现
 *
 * 定义了 Codex Provider 的认证方式（OAuth 和设备码），
 * 但认证执行函数为 noop，适合测试场景。
 *
 * @returns 轻量级的 Codex ProviderPlugin 契约对象
 */
export function createOpenAICodexProvider(): ProviderPlugin {
  return {
    id: "openai-codex",
    label: "OpenAI Codex",
    docsPath: "/providers/models",
    // 修复旧版 profile ID 格式（openai-codex:default）到新版格式
    oauthProfileIdRepairs: [
      {
        legacyProfileId: "openai-codex:default",
        promptLabel: "OpenAI Codex",
      },
    ],
    auth: [
      {
        id: "oauth",
        kind: "oauth",
        label: OPENAI_CODEX_LOGIN_LABEL,
        hint: OPENAI_CODEX_LOGIN_HINT,
        run: noopAuth,
        wizard: {
          choiceId: "openai-codex",
          choiceLabel: OPENAI_CODEX_LOGIN_LABEL,
          choiceHint: OPENAI_CODEX_LOGIN_HINT,
          assistantPriority: -30,
          onboardingFeatured: true,
          ...OPENAI_CODEX_WIZARD_GROUP,
        },
      },
      {
        id: "device-code",
        kind: "device_code",
        label: OPENAI_CODEX_DEVICE_PAIRING_LABEL,
        hint: OPENAI_CODEX_DEVICE_PAIRING_HINT,
        run: noopAuth,
        wizard: {
          choiceId: "openai-codex-device-code",
          choiceLabel: OPENAI_CODEX_DEVICE_PAIRING_LABEL,
          choiceHint: OPENAI_CODEX_DEVICE_PAIRING_HINT,
          assistantPriority: -10,
          ...OPENAI_CODEX_WIZARD_GROUP,
        },
      },
    ],
  };
}

/**
 * 创建 OpenAI 直连 Provider 的契约实现
 *
 * 定义了直连 Provider 的 API Key 认证方式，
 * 认证执行函数为 noop，适合测试场景。
 *
 * @returns 轻量级的 OpenAI ProviderPlugin 契约对象
 */
export function createOpenAIProvider(): ProviderPlugin {
  return {
    id: "openai",
    label: "OpenAI",
    // hookAliases 允许 Azure OpenAI Provider 复用此 Provider 的钩子逻辑
    hookAliases: ["azure-openai", "azure-openai-responses"],
    docsPath: "/providers/models",
    envVars: ["OPENAI_API_KEY"],
    auth: [
      {
        id: "api-key",
        kind: "api_key",
        label: OPENAI_API_KEY_LABEL,
        hint: "Use your OpenAI API key directly",
        run: noopAuth,
        wizard: {
          choiceId: "openai-api-key",
          choiceLabel: OPENAI_API_KEY_LABEL,
          choiceHint: "Use your OpenAI API key directly",
          assistantPriority: 5,
          ...OPENAI_ACCOUNT_WIZARD_GROUP,
        },
      },
    ],
  };
}
