/**
 * @file Provider 模型类型定义公共导出
 *
 * 重新导出模型相关的类型定义，为 Provider 插件提供统一的类型访问入口。
 * 这些类型定义了模型的 API 接口、兼容性配置、模型定义等核心数据结构。
 *
 * 为什么单独导出：
 * - Provider 插件需要这些类型来声明支持的模型
 * - 避免插件直接依赖 config 模块的内部路径
 * - 提供稳定的公共 API 表面
 */

export type {
  BedrockDiscoveryConfig,
  ModelApi,
  ModelCompatConfig,
  ModelDefinitionConfig,
  ModelProviderConfig,
} from "../config/types.models.js";
