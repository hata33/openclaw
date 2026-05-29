/**
 * @file Provider 登录命令运行时实现
 *
 * @deprecated 本文件中的登录命令已废弃，新插件应使用 provider auth hooks。
 *
 * 包含三个已废弃的登录命令：
 * - loginChutes: Chutes Provider 的 OAuth 登录
 * - loginOpenAICodexOAuth: OpenAI Codex 的 OAuth 登录
 * - githubCopilotLoginCommand: GitHub Copilot 的登录
 *
 * 通过 Re-export 模式将实际实现委托给各自模块，保持 API 表面不变的同时解耦实现。
 */

/** @deprecated 请使用 provider auth hooks 替代 */
export { loginChutes } from "../commands/chutes-oauth.js";
/** @deprecated 请使用 provider auth hooks 替代 */
export { loginOpenAICodexOAuth } from "../plugins/provider-openai-codex-oauth.js";
/** @deprecated 请使用 provider auth hooks 替代 */
export { githubCopilotLoginCommand } from "./github-copilot-login.js";
