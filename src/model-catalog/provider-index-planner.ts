/**
 * @file Provider 索引模型目录规划器
 *
 * 本文件负责从 OpenClaw Provider 索引（provider-index）中规划模型目录数据。
 * Provider 索引是一个轻量级的元数据数据库，包含了尚未安装的插件的预览信息，
 * 使得用户在安装插件之前就能看到该提供商支持哪些模型。
 *
 * 与 manifest-planner 的区别：
 * - manifest-planner 处理已安装插件的完整目录数据
 * - provider-index-planner 处理未安装插件的预览目录数据
 *
 * 设计要点：
 * - Provider 索引中的模型默认状态为 "preview"（预览），因为这些模型未经运行时验证
 * - 规划结果会与 manifest 数据合并，使用权威来源机制决定优先级
 */

import { normalizeModelCatalogProviderRows } from "./normalize.js";
import type { OpenClawProviderIndex } from "./provider-index/index.js";
import { normalizeModelCatalogProviderId } from "./refs.js";
import type { ModelCatalogProvider, NormalizedModelCatalogRow } from "./types.js";

/** 单个提供商的索引规划条目 */
type ProviderIndexModelCatalogPlanEntry = {
  provider: string;
  pluginId: string;
  rows: readonly NormalizedModelCatalogRow[];
};

type ProviderIndexModelCatalogPlan = {
  rows: readonly NormalizedModelCatalogRow[];
  entries: readonly ProviderIndexModelCatalogPlanEntry[];
};

/**
 * 为 Provider 索引中的模型设置默认的 "preview" 状态
 * 索引中的模型未经运行时验证，因此默认标记为预览版
 */
function withPreviewStatusDefaults(providerCatalog: ModelCatalogProvider): ModelCatalogProvider {
  return {
    ...providerCatalog,
    models: providerCatalog.models.map((model) => ({
      ...model,
      status: model.status ?? "preview",
    })),
  };
}

/**
 * 从 Provider 索引规划模型目录行
 *
 * 遍历索引中的所有提供商，规范化其预览目录数据，
 * 并将所有模型统一为预览状态。
 *
 * @param params.index - OpenClaw Provider 索引数据
 * @param params.providerFilter - 可选的提供商过滤器
 * @returns 规划结果，包含每个提供商的条目和合并后的行列表
 */
export function planProviderIndexModelCatalogRows(params: {
  index: OpenClawProviderIndex;
  providerFilter?: string;
}): ProviderIndexModelCatalogPlan {
  const providerFilter = params.providerFilter
    ? normalizeModelCatalogProviderId(params.providerFilter)
    : undefined;
  const entries: ProviderIndexModelCatalogPlanEntry[] = [];

  for (const [providerId, provider] of Object.entries(params.index.providers)) {
    const normalizedProvider = normalizeModelCatalogProviderId(providerId);
    if (
      !normalizedProvider ||
      (providerFilter && normalizedProvider !== providerFilter) ||
      !provider.previewCatalog
    ) {
      continue;
    }
    const rows = normalizeModelCatalogProviderRows({
      provider: normalizedProvider,
      providerCatalog: withPreviewStatusDefaults(provider.previewCatalog),
      source: "provider-index",
    });
    if (rows.length === 0) {
      continue;
    }
    entries.push({
      provider: normalizedProvider,
      pluginId: provider.plugin.id,
      rows,
    });
  }

  return {
    entries,
    rows: entries
      .flatMap((entry) => entry.rows)
      .toSorted(
        (left, right) =>
          left.provider.localeCompare(right.provider) || left.id.localeCompare(right.id),
      ),
  };
}
