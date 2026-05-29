/**
 * @file 模型目录数据权威来源（Authority）合并策略
 *
 * 本文件实现了模型目录的数据合并逻辑。当同一模型的信息来自多个来源时
 * （如 manifest、provider-index、cache、config、runtime-refresh），
 * 系统需要决定以哪个来源的数据为准。
 *
 * 权威等级设计（数值越小优先级越高）：
 * - config (0): 用户配置文件中的数据优先级最高，因为用户可能手动修改了模型参数
 * - manifest (1): 插件清单是官方定义，优先级次之
 * - cache / runtime-refresh (2): 缓存和运行时刷新数据优先级较低，因为可能是过期数据
 * - provider-index (3): 提供商索引的优先级最低，通常是未安装插件时的预览数据
 *
 * 这个优先级设计确保了：
 * 1. 用户的手动配置始终生效
 * 2. 已安装插件的定义优于未安装的预览数据
 * 3. 运行时数据不会覆盖用户配置
 */

import type { ModelCatalogSource, NormalizedModelCatalogRow } from "./types.js";

/** 来源权威等级映射 - 数值越小优先级越高 */
const MODEL_CATALOG_SOURCE_AUTHORITY: Readonly<Record<ModelCatalogSource, number>> = {
  config: 0,
  manifest: 1,
  cache: 2,
  "runtime-refresh": 2,
  "provider-index": 3,
};

function compareModelCatalogSourceAuthority(
  left: ModelCatalogSource,
  right: ModelCatalogSource,
): number {
  return MODEL_CATALOG_SOURCE_AUTHORITY[left] - MODEL_CATALOG_SOURCE_AUTHORITY[right];
}

/**
 * 按权威来源合并模型目录行 - 当同一模型有多个来源时，保留优先级最高的那条
 * 使用 mergeKey（provider::modelId 小写）来识别同一模型的不同条目
 *
 * @param rows - 待合并的模型行集合（可能来自不同来源）
 * @returns 合并后的去重模型行列表，按 provider 和 id 排序
 */
export function mergeModelCatalogRowsByAuthority(
  rows: Iterable<NormalizedModelCatalogRow>,
): NormalizedModelCatalogRow[] {
  const byMergeKey = new Map<string, NormalizedModelCatalogRow>();
  for (const row of rows) {
    const existing = byMergeKey.get(row.mergeKey);
    if (!existing || compareModelCatalogSourceAuthority(row.source, existing.source) < 0) {
      byMergeKey.set(row.mergeKey, row);
    }
  }
  return [...byMergeKey.values()].toSorted(
    (left, right) => left.provider.localeCompare(right.provider) || left.id.localeCompare(right.id),
  );
}
