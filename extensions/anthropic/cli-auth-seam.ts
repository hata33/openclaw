/**
 * @fileoverview CLI 认证接缝（Auth Seam）
 *
 * 本文件是 Claude CLI 认证的抽象层，封装了对 Claude CLI 本地凭证的读取操作。
 * 之所以称为 "接缝"（seam），是因为它在 OpenClaw 与 Claude CLI 原生认证系统之间
 * 提供了一个统一的接口，使得上层代码无需关心底层凭证存储的具体实现。
 *
 * 三种读取模式：
 * - readClaudeCliCredentialsForSetup：交互式设置时读取（允许钥匙串提示）
 * - readClaudeCliCredentialsForSetupNonInteractive：非交互式设置时读取（禁止钥匙串弹窗）
 * - readClaudeCliCredentialsForRuntime：运行时读取（禁止钥匙串弹窗，避免阻塞）
 *
 * 凭证来源：Claude CLI 本地登录后存储的 OAuth token 或 API key。
 */

import { readClaudeCliCredentialsCached } from "openclaw/plugin-sdk/provider-auth";

/**
 * 读取 Claude CLI 凭证 - 用于交互式设置流程
 *
 * 允许钥匙串（keychain）提示，适用于用户正在终端前操作的场景。
 * 如果凭证存储在系统钥匙串中，会弹出系统权限提示让用户授权。
 *
 * @returns Claude CLI 的凭证信息（OAuth 或 token），未登录时返回 undefined
 */
export function readClaudeCliCredentialsForSetup() {
  return readClaudeCliCredentialsCached();
}

/**
 * 读取 Claude CLI 凭证 - 用于非交互式设置流程
 *
 * 禁止钥匙串提示（allowKeychainPrompt: false），适用于 CI/CD 或自动化脚本场景。
 * 如果凭证在钥匙串中且无法静默访问，将返回 undefined 而非阻塞等待用户输入。
 *
 * @returns Claude CLI 的凭证信息，无法静默获取时返回 undefined
 */
export function readClaudeCliCredentialsForSetupNonInteractive() {
  return readClaudeCliCredentialsCached({ allowKeychainPrompt: false });
}

/**
 * 读取 Claude CLI 凭证 - 用于运行时认证
 *
 * 运行时场景下禁止钥匙串提示，避免在模型推理过程中阻塞。
 * 与非交互式设置使用相同的策略，但语义上区分了 "设置" 和 "运行" 两个阶段。
 *
 * @returns Claude CLI 的凭证信息，无法获取时返回 undefined
 */
export function readClaudeCliCredentialsForRuntime() {
  return readClaudeCliCredentialsCached({ allowKeychainPrompt: false });
}
