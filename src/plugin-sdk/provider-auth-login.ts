/**
 * @file Provider 登录命令兼容层
 *
 * @deprecated 本文件为已废弃的兼容子路径，保留用于向后兼容旧版 Provider 插件。
 * 新的 Provider 插件应使用 provider auth hooks 实现登录逻辑，而非直接导入此模块。
 *
 * 本文件通过懒加载机制延迟加载实际的登录运行时模块，避免在插件激活时引入重量级依赖。
 * 懒加载策略（createLazyRuntimeModule/createLazyRuntimeMethodBinder）确保：
 * 1. 模块只在首次调用时加载
 * 2. 方法级绑定避免加载整个模块
 */

/**
 * @deprecated 兼容子路径，用于 Provider 专有的登录辅助函数。
 * 请使用 provider auth hooks 替代。
 */

import { createLazyRuntimeMethodBinder, createLazyRuntimeModule } from "../shared/lazy-runtime.js";

type ProviderAuthLoginRuntime = typeof import("./provider-auth-login.runtime.js");

const loadProviderAuthLoginRuntime = createLazyRuntimeModule(
  () => import("./provider-auth-login.runtime.js"),
);
const bindProviderAuthLoginRuntime = createLazyRuntimeMethodBinder(loadProviderAuthLoginRuntime);

/** @deprecated GitHub Copilot provider-owned login helper; use provider auth hooks instead. */
export const githubCopilotLoginCommand: ProviderAuthLoginRuntime["githubCopilotLoginCommand"] =
  bindProviderAuthLoginRuntime((runtime) => runtime.githubCopilotLoginCommand);
/** @deprecated Chutes provider-owned login helper; use provider auth hooks instead. */
export const loginChutes: ProviderAuthLoginRuntime["loginChutes"] = bindProviderAuthLoginRuntime(
  (runtime) => runtime.loginChutes,
);
/** @deprecated OpenAI Codex provider-owned login helper; use provider auth hooks instead. */
export const loginOpenAICodexOAuth: ProviderAuthLoginRuntime["loginOpenAICodexOAuth"] =
  bindProviderAuthLoginRuntime((runtime) => runtime.loginOpenAICodexOAuth);
