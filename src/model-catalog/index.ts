/**
 * @file 模型目录（Model Catalog）模块入口
 *
 * 统一导出模型目录系统的所有公共 API：
 * - 类型定义（types.ts）
 * - 数据规范化（normalize.ts）
 * - 权威来源合并（authority.ts）
 * - 引用工具（refs.ts）
 * - 清单规划器（manifest-planner.ts）
 * - Provider 索引规划器（provider-index-planner.ts）
 * - Provider 索引加载（provider-index/）
 *
 * 这是模型目录系统的唯一公共 API 入口，外部模块应通过此文件导入相关功能。
 */

export { mergeModelCatalogRowsByAuthority } from "./authority.js";
export {
  buildModelCatalogMergeKey,
  buildModelCatalogRef,
  normalizeModelCatalogProviderId,
} from "./refs.js";
export { normalizeModelCatalog, normalizeModelCatalogRows } from "./normalize.js";
export { loadOpenClawProviderIndex } from "./provider-index/index.js";
export {
  planManifestModelCatalogRows,
  planManifestModelCatalogSuppressions,
} from "./manifest-planner.js";
export { planProviderIndexModelCatalogRows } from "./provider-index-planner.js";
export type { ManifestModelCatalogSuppressionEntry } from "./manifest-planner.js";
export type {
  ModelCatalog,
  ModelCatalogAlias,
  ModelCatalogCost,
  ModelCatalogDiscovery,
  ModelCatalogInput,
  ModelCatalogModel,
  ModelCatalogProvider,
  ModelCatalogSource,
  ModelCatalogStatus,
  ModelCatalogSuppression,
  ModelCatalogTieredCost,
  NormalizedModelCatalogRow,
  UnifiedModelCatalogEntry,
  UnifiedModelCatalogKind,
  UnifiedModelCatalogSource,
} from "./types.js";
export type { OpenClawProviderIndexProvider } from "./provider-index/index.js";
