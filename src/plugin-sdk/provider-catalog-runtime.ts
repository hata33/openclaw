/**
 * @file Provider 目录运行时公共辅助模块
 *
 * 导出 Provider 目录的运行时接口，这些接口连接了 Provider 插件与系统运行时：
 *
 * - augmentModelCatalogWithProviderPlugins: 使用已注册的 Provider 插件增强模型目录
 * - resolveCatalogHookProviderPluginIds: 解析参与目录钩子的 Provider 插件 ID 列表
 * - resolveOwningPluginIdsForProvider: 解析指定 Provider 的归属插件 ID
 * - resolvePluginProviders: 解析已加载插件注册的所有 Provider
 * - isPluginProvidersLoadInFlight: 检查插件 Provider 的加载是否正在进行中
 *
 * 这些函数是系统启动和运行时模型目录构建的关键路径，
 * 将插件声明的静态目录与运行时动态数据整合在一起。
 */

// Public provider-catalog runtime seams for provider plugin contract tests.

export { augmentModelCatalogWithProviderPlugins } from "../plugins/provider-runtime.js";
export {
  resolveCatalogHookProviderPluginIds,
  resolveOwningPluginIdsForProvider,
} from "../plugins/providers.js";
export {
  isPluginProvidersLoadInFlight,
  resolvePluginProviders,
} from "../plugins/providers.runtime.js";
