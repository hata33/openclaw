/**
 * @fileoverview Anthropic Provider 契约 API（Provider Contract API）
 *
 * 本文件定义了 Anthropic Provider 的契约层（Contract），即 Provider 插件的结构化声明。
 * 它描述了 Provider 的元数据、支持的认证方法和向导配置，但不包含实际的运行时逻辑。
 *
 * "契约"与 "运行时" 的区别：
 * - 契约（Contract）：声明 Provider 长什么样（静态结构）
 * - 运行时（Runtime）：声明 Provider 怎么工作（动态行为）
 *
 * 本文件主要用于：
 * 1. 测试验证：确保 Provider 的结构符合预期
 * 2. 文档生成：自动提取 Provider 的认证方法和配置项
 * 3. IDE 支持：为配置文件提供类型提示和自动补全
 *
 * 注意：认证方法的 run 函数为空操作（noopAuth），
 * 因为此文件只关注结构声明，不执行实际认证。
 */

import type { ProviderPlugin } from "openclaw/plugin-sdk/provider-model-shared";

/** 空操作认证函数 - 仅用于契约声明，不执行实际认证 */
const noopAuth = async () => ({ profiles: [] });

/**
 * 创建 Anthropic Provider 契约实例
 *
 * 返回一个仅包含结构声明的 Provider 插件，用于测试和文档生成。
 * 认证方法的 run 函数为空操作，实际认证逻辑在 register.runtime.ts 中实现。
 *
 * @returns Anthropic Provider 插件声明（仅结构，无运行时行为）
 */
export function createAnthropicProvider(): ProviderPlugin {
  return {
    /** Provider 唯一标识符 */
    id: "anthropic",
    /** Provider 显示标签 */
    label: "Anthropic",
    /** 文档路径 */
    docsPath: "/providers/models",
    /** 别名钩子 - claude-cli 作为 anthropic 的别名 */
    hookAliases: ["claude-cli"],
    /** 相关环境变量 */
    envVars: ["ANTHROPIC_OAUTH_TOKEN", "ANTHROPIC_API_KEY"],
    /** 认证方法列表 */
    auth: [
      {
        /** CLI 认证方法 - 复用本地 Claude CLI 登录 */
        id: "cli",
        kind: "custom",
        label: "Claude CLI",
        hint: "Reuse a local Claude CLI login and switch model selection to claude-cli/*",
        run: noopAuth,
        wizard: {
          choiceId: "anthropic-cli",
          choiceLabel: "Anthropic Claude CLI",
          choiceHint: "Reuse a local Claude CLI login on this host",
          groupId: "anthropic",
          groupLabel: "Anthropic",
          groupHint: "Claude CLI + API key",
        },
      },
      {
        /** Setup Token 认证方法 - 手动 bearer token */
        id: "setup-token",
        kind: "token",
        label: "Anthropic setup-token",
        hint: "Manual bearer token path",
        run: noopAuth,
        wizard: {
          choiceId: "setup-token",
          choiceLabel: "Anthropic setup-token",
          choiceHint: "Manual token path",
          groupId: "anthropic",
          groupLabel: "Anthropic",
          groupHint: "Claude CLI + API key + token",
        },
      },
      {
        /** API Key 认证方法 - 直接使用 Anthropic API key */
        id: "api-key",
        kind: "api_key",
        label: "Anthropic API key",
        hint: "Direct Anthropic API key",
        run: noopAuth,
        wizard: {
          choiceId: "apiKey",
          choiceLabel: "Anthropic API key",
          groupId: "anthropic",
          groupLabel: "Anthropic",
          groupHint: "Claude CLI + API key",
        },
      },
    ],
  };
}
