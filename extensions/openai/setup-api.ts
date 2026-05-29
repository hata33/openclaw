/**
 * @fileoverview OpenAI 设置 API（Setup API）
 *
 * 提供轻量级的 OpenAI 和 Codex Provider 设置钩子，用于引导用户完成初始认证配置。
 * 与完整的 Provider 实现（openai-provider.ts、openai-codex-provider.ts）不同，
 * 此模块专注于认证流程的注册和执行，不包含模型解析、传输协议等运行时逻辑。
 *
 * 设计目的：
 * - 在初始设置向导中提供认证选项（OAuth、设备码、API Key）
 * - 通过动态 import 延迟加载完整的 Provider 实现，减少启动时的模块依赖
 * - 为 OpenAI 和 Codex 分别提供独立的设置 Provider
 *
 * 注意：此文件同时导出一个默认的 definePluginEntry，
 * 在插件注册阶段仅注册设置 Provider，不注册运行时 Provider。
 */

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import type { ProviderAuthContext, ProviderAuthResult } from "openclaw/plugin-sdk/plugin-entry";
import type { ProviderAuthMethod } from "openclaw/plugin-sdk/plugin-entry";
import type { ProviderPlugin } from "openclaw/plugin-sdk/provider-model-shared";
import {
  OPENAI_ACCOUNT_WIZARD_GROUP,
  OPENAI_API_KEY_LABEL,
  OPENAI_CHATGPT_DEVICE_PAIRING_HINT,
  OPENAI_CHATGPT_DEVICE_PAIRING_LABEL,
  OPENAI_CHATGPT_LOGIN_HINT,
  OPENAI_CHATGPT_LOGIN_LABEL,
  OPENAI_CODEX_API_KEY_BACKUP_HINT,
  OPENAI_CODEX_API_KEY_BACKUP_LABEL,
  OPENAI_CODEX_DEVICE_PAIRING_HINT,
  OPENAI_CODEX_DEVICE_PAIRING_LABEL,
  OPENAI_CODEX_LOGIN_HINT,
  OPENAI_CODEX_LOGIN_LABEL,
  OPENAI_CODEX_WIZARD_GROUP,
} from "./auth-choice-copy.js";

/**
 * 运行 OpenAI 直连 Provider 的认证方法
 *
 * 通过动态 import 加载完整的 Provider 实现，避免在设置阶段就加载所有运行时依赖。
 * 如果指定的 methodId 不存在，返回空的认证结果。
 *
 * @param methodId - 认证方法 ID（如 "api-key"）
 * @param ctx - 认证上下文（包含提示器、运行时等）
 * @returns 认证结果（包含 profiles 列表）
 */
async function runOpenAIProviderAuthMethod(
  methodId: string,
  ctx: ProviderAuthContext,
): Promise<ProviderAuthResult> {
  // 动态 import：仅在实际执行认证时才加载完整 Provider 模块
  const { buildOpenAIProvider } = await import("./openai-provider.js");
  const method = buildOpenAIProvider().auth.find((entry) => entry.id === methodId);
  if (!method) {
    return { profiles: [] };
  }
  return method.run(ctx);
}

/**
 * 运行 OpenAI Codex Provider 的认证方法
 *
 * 与 runOpenAIProviderAuthMethod 类似，但针对 Codex Provider。
 * Codex 支持额外的认证方式（OAuth 和设备码）。
 *
 * @param methodId - 认证方法 ID（如 "oauth"、"device-code"、"api-key"）
 * @param ctx - 认证上下文
 * @returns 认证结果
 */
async function runOpenAICodexProviderAuthMethod(
  methodId: string,
  ctx: ProviderAuthContext,
): Promise<ProviderAuthResult> {
  const { buildOpenAICodexProviderPlugin } = await import("./openai-codex-provider.js");
  const method = buildOpenAICodexProviderPlugin().auth.find((entry) => entry.id === methodId);
  if (!method) {
    return { profiles: [] };
  }
  return method.run(ctx);
}

/**
 * 构建 OpenAI 直连的设置 Provider
 *
 * 提供三种认证方式：
 * 1. OAuth（通过 ChatGPT 登录）- 优先级最低，手动可见
 * 2. 设备码配对 - 适合无浏览器的远程环境
 * 3. API Key - 最常用，优先级最高
 *
 * @returns 设置阶段的 ProviderPlugin
 */
export function buildOpenAISetupProvider(): ProviderPlugin {
  const oauthMethod = {
    id: "oauth",
    label: OPENAI_CHATGPT_LOGIN_LABEL,
    hint: OPENAI_CHATGPT_LOGIN_HINT,
    kind: "oauth",
    wizard: {
      choiceId: "openai",
      choiceLabel: OPENAI_CHATGPT_LOGIN_LABEL,
      choiceHint: OPENAI_CHATGPT_LOGIN_HINT,
      assistantPriority: -40,
      assistantVisibility: "manual-only",
      ...OPENAI_ACCOUNT_WIZARD_GROUP,
    },
    // 委托给 Codex 的 OAuth 实现，因为两者共用 ChatGPT 的 OAuth 流程
    run: async (ctx) => runOpenAICodexProviderAuthMethod("oauth", ctx),
  } satisfies ProviderAuthMethod;

  const deviceCodeMethod = {
    id: "device-code",
    label: OPENAI_CHATGPT_DEVICE_PAIRING_LABEL,
    hint: OPENAI_CHATGPT_DEVICE_PAIRING_HINT,
    kind: "device_code",
    wizard: {
      choiceId: "openai-device-code",
      choiceLabel: OPENAI_CHATGPT_DEVICE_PAIRING_LABEL,
      choiceHint: OPENAI_CHATGPT_DEVICE_PAIRING_HINT,
      assistantPriority: -10,
      assistantVisibility: "manual-only",
      ...OPENAI_ACCOUNT_WIZARD_GROUP,
    },
    run: async (ctx) => runOpenAICodexProviderAuthMethod("device-code", ctx),
  } satisfies ProviderAuthMethod;

  const apiKeyMethod = {
    id: "api-key",
    label: OPENAI_API_KEY_LABEL,
    hint: "Use your OpenAI API key directly",
    kind: "api_key",
    wizard: {
      choiceId: "openai-api-key",
      choiceLabel: OPENAI_API_KEY_LABEL,
      choiceHint: "Use your OpenAI API key directly",
      assistantPriority: 5,
      ...OPENAI_ACCOUNT_WIZARD_GROUP,
    },
    run: async (ctx) => runOpenAIProviderAuthMethod("api-key", ctx),
  } satisfies ProviderAuthMethod;

  return {
    id: "openai",
    label: "OpenAI",
    docsPath: "/providers/models",
    envVars: ["OPENAI_API_KEY"],
    auth: [oauthMethod, deviceCodeMethod, apiKeyMethod],
  };
}

/**
 * 构建 OpenAI Codex 的设置 Provider
 *
 * 提供三种认证方式：
 * 1. OAuth（通过 Codex 登录）- 首选方式，支持自动发现
 * 2. 设备码配对 - 适合无浏览器/远程环境
 * 3. API Key（备用）- 当 OAuth 不可用时的后备方案
 *
 * @returns 设置阶段的 ProviderPlugin
 */
export function buildOpenAICodexSetupProvider(): ProviderPlugin {
  const oauthMethod = {
    id: "oauth",
    label: OPENAI_CODEX_LOGIN_LABEL,
    hint: OPENAI_CODEX_LOGIN_HINT,
    kind: "oauth",
    wizard: {
      choiceId: "openai-codex",
      choiceLabel: OPENAI_CODEX_LOGIN_LABEL,
      choiceHint: OPENAI_CODEX_LOGIN_HINT,
      assistantPriority: -30,
      onboardingFeatured: true,
      ...OPENAI_CODEX_WIZARD_GROUP,
    },
    run: async (ctx) => runOpenAICodexProviderAuthMethod("oauth", ctx),
  } satisfies ProviderAuthMethod;

  const deviceCodeMethod = {
    id: "device-code",
    label: OPENAI_CODEX_DEVICE_PAIRING_LABEL,
    hint: OPENAI_CODEX_DEVICE_PAIRING_HINT,
    kind: "device_code",
    wizard: {
      choiceId: "openai-codex-device-code",
      choiceLabel: OPENAI_CODEX_DEVICE_PAIRING_LABEL,
      choiceHint: OPENAI_CODEX_DEVICE_PAIRING_HINT,
      assistantPriority: -10,
      ...OPENAI_CODEX_WIZARD_GROUP,
    },
    run: async (ctx) => runOpenAICodexProviderAuthMethod("device-code", ctx),
  } satisfies ProviderAuthMethod;

  const apiKeyBackupMethod = {
    id: "api-key",
    label: OPENAI_CODEX_API_KEY_BACKUP_LABEL,
    hint: OPENAI_CODEX_API_KEY_BACKUP_HINT,
    kind: "api_key",
    wizard: {
      choiceId: "openai-codex-api-key",
      choiceLabel: OPENAI_CODEX_API_KEY_BACKUP_LABEL,
      choiceHint: OPENAI_CODEX_API_KEY_BACKUP_HINT,
      assistantPriority: 5,
      assistantVisibility: "manual-only",
      ...OPENAI_CODEX_WIZARD_GROUP,
    },
    run: async (ctx) => runOpenAICodexProviderAuthMethod("api-key", ctx),
  } satisfies ProviderAuthMethod;

  return {
    id: "openai-codex",
    label: "OpenAI Codex",
    docsPath: "/providers/models",
    auth: [oauthMethod, deviceCodeMethod, apiKeyBackupMethod],
  };
}

/**
 * 插件入口定义
 *
 * 注册轻量级的设置 Provider，用于初始配置引导。
 * 注意：运行时 Provider（包含完整的模型解析、传输逻辑）
 * 由 index.ts 中的 definePluginEntry 注册。
 */
export default definePluginEntry({
  id: "openai",
  name: "OpenAI Setup",
  description: "Lightweight OpenAI setup hooks",
  register(api) {
    api.registerProvider(buildOpenAISetupProvider());
    api.registerProvider(buildOpenAICodexSetupProvider());
  },
});
