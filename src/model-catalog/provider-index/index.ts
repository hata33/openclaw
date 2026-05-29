/**
 * @file Provider 索引子模块入口
 *
 * 导出 Provider 索引系统的公共 API：
 * - loadOpenClawProviderIndex: 加载并规范化 Provider 索引数据
 * - normalizeOpenClawProviderIndex: 规范化原始索引数据
 * - 类型定义: 索引中的插件、提供商、认证选项等类型
 *
 * Provider 索引是一个预编译的元数据数据库，包含所有已知 Provider 的信息。
 * 即使某个 Provider 的插件尚未安装，用户也能通过索引看到其支持的模型和认证方式。
 */

export { loadOpenClawProviderIndex } from "./load.js";
export { normalizeOpenClawProviderIndex } from "./normalize.js";
export type {
  OpenClawProviderIndex,
  OpenClawProviderIndexPluginInstall,
  OpenClawProviderIndexPlugin,
  OpenClawProviderIndexProviderAuthChoice,
  OpenClawProviderIndexProvider,
} from "./types.js";
