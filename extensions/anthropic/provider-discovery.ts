/**
 * @fileoverview Provider 发现（Provider Discovery）
 *
 * 本文件实现了 Claude CLI 作为独立 Provider 的发现机制。
 * 当 Claude CLI 在主机上可用时，此模块允许系统自动发现并使用其认证凭证，
 * 而无需用户手动配置 API key。
 *
 * 工作原理：
 * 1. 系统调用 resolveSyntheticAuth 尝试获取 Claude CLI 的本地凭证
 * 2. 如果凭证存在（用户已通过 claude auth login 登录），则构造合成认证信息
 * 3. 合成认证信息包含 apiKey、来源标识和过期时间
 *
 * 与 register.runtime.ts 中的 Anthropic Provider 不同：
 * 此文件注册的是 "claude-cli" 这个独立的 Provider，专门用于 Claude CLI 后端。
 * 而 register.runtime.ts 注册的是 "anthropic" Provider，支持多种认证方式。
 */

import type { ProviderPlugin } from "openclaw/plugin-sdk/provider-model-shared";
import { readClaudeCliCredentialsForRuntime } from "./cli-auth-seam.js";

/** Claude CLI 后端标识符 */
const CLAUDE_CLI_BACKEND_ID = "claude-cli";

/**
 * 解析 Claude CLI 合成认证信息
 *
 * 尝试从本地 Claude CLI 读取已缓存的凭证，并将其转换为运行时可用的认证信息。
 * 此函数在 Provider 的 resolveSyntheticAuth 钩子中被调用。
 *
 * @returns 合成认证信息对象，包含 apiKey、来源和过期时间；未登录时返回 undefined
 */
function resolveClaudeCliSyntheticAuth() {
  /* 读取 Claude CLI 本地凭证（禁止钥匙串提示，避免运行时阻塞） */
  const credential = readClaudeCliCredentialsForRuntime();
  if (!credential) {
    return undefined;
  }
  /* 根据凭证类型（OAuth 或 token）构造不同的认证信息 */
  return credential.type === "oauth"
    ? {
        apiKey: credential.access,     /* OAuth 模式下使用 access token 作为 apiKey */
        source: "Claude CLI native auth",
        mode: "oauth" as const,
        expiresAt: credential.expires,
      }
    : {
        apiKey: credential.token,       /* token 模式下直接使用 token */
        source: "Claude CLI native auth",
        mode: "token" as const,
        expiresAt: credential.expires,
      };
}

/**
 * Claude CLI Provider 发现实例
 *
 * 作为一个轻量级 Provider 插件，仅提供合成认证能力，
 * 不包含完整的认证流程（auth 数组为空）。
 * 当 provider 参数匹配 "claude-cli" 时，尝试从本地 CLI 读取凭证。
 */
const anthropicProviderDiscovery: ProviderPlugin = {
  /** Provider 标识符 */
  id: CLAUDE_CLI_BACKEND_ID,
  /** Provider 显示标签 */
  label: "Claude CLI",
  /** 文档路径 */
  docsPath: "/providers/models",
  /** 认证方法列表 - 为空表示不支持交互式认证，仅依赖本地 CLI 凭证 */
  auth: [],
  /**
   * 合成认证解析钩子
   * 当 provider 为 "claude-cli" 时，尝试从本地 CLI 读取凭证
   */
  resolveSyntheticAuth: ({ provider }) =>
    provider === CLAUDE_CLI_BACKEND_ID ? resolveClaudeCliSyntheticAuth() : undefined,
};

export default anthropicProviderDiscovery;
