/**
 * @file Provider 索引数据规范化器
 *
 * 本文件负责将原始的 Provider 索引 JSON 数据规范化为类型安全的结构。
 * Provider 索引是一个预编译的数据库，包含所有已知 Provider 的元数据，
 * 用于在插件未安装时提供模型列表预览和安装引导。
 *
 * 规范化过程中会：
 * 1. 验证索引版本号
 * 2. 过滤掉原型污染风险的 key（isBlockedObjectKey）
 * 3. 解析插件安装规范（ClawHub/NPM）
 * 4. 规范化认证选项（authChoices）
 * 5. 规范化预览目录（previewCatalog）
 */

import { parseClawHubPluginSpec } from "../../infra/clawhub-spec.js";
import { parseRegistryNpmSpec } from "../../infra/npm-registry-spec.js";
import { isBlockedObjectKey } from "../../infra/prototype-keys.js";
import { asFiniteNumber } from "../../shared/number-coercion.js";
import { normalizeOptionalString } from "../../shared/string-coerce.js";
import { normalizeUniqueTrimmedStringList } from "../../shared/string-normalization.js";
import { isRecord } from "../../utils.js";
import { normalizeModelCatalog } from "../normalize.js";
import { normalizeModelCatalogProviderId } from "../refs.js";
import type { ModelCatalogProvider } from "../types.js";
import type {
  OpenClawProviderIndex,
  OpenClawProviderIndexPluginInstall,
  OpenClawProviderIndexPlugin,
  OpenClawProviderIndexProviderAuthChoice,
  OpenClawProviderIndexProvider,
} from "./types.js";

const OPENCLAW_PROVIDER_INDEX_VERSION = 1;

function normalizeSafeKey(value: unknown): string {
  const key = normalizeOptionalString(value) ?? "";
  return key && !isBlockedObjectKey(key) ? key : "";
}

function normalizeInstall(value: unknown): OpenClawProviderIndexPluginInstall | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const clawhubSpec = normalizeOptionalString(value.clawhubSpec);
  const parsedClawHub = clawhubSpec ? parseClawHubPluginSpec(clawhubSpec) : null;
  const npmSpec = normalizeOptionalString(value.npmSpec);
  const parsedNpm = npmSpec ? parseRegistryNpmSpec(npmSpec) : null;
  if (!parsedClawHub && !parsedNpm) {
    return undefined;
  }
  const defaultChoice =
    value.defaultChoice === "clawhub" && parsedClawHub
      ? "clawhub"
      : value.defaultChoice === "npm" && parsedNpm
        ? "npm"
        : undefined;
  const minHostVersion = normalizeOptionalString(value.minHostVersion);
  const expectedIntegrity = normalizeOptionalString(value.expectedIntegrity);
  return {
    ...(parsedClawHub ? { clawhubSpec } : {}),
    ...(parsedNpm ? { npmSpec: parsedNpm.raw } : {}),
    ...(defaultChoice ? { defaultChoice } : {}),
    ...(minHostVersion ? { minHostVersion } : {}),
    ...(expectedIntegrity ? { expectedIntegrity } : {}),
  };
}

function normalizePlugin(value: unknown): OpenClawProviderIndexPlugin | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const id = normalizeSafeKey(value.id);
  if (!id) {
    return undefined;
  }
  const packageName = normalizeOptionalString(value.package) ?? "";
  const source = normalizeOptionalString(value.source) ?? "";
  const install = normalizeInstall(value.install);
  return {
    id,
    ...(packageName ? { package: packageName } : {}),
    ...(source ? { source } : {}),
    ...(install ? { install } : {}),
  };
}

function normalizeCategories(value: unknown): readonly string[] {
  return normalizeUniqueTrimmedStringList(value);
}

function normalizePreviewCatalog(params: {
  providerId: string;
  value: unknown;
}): ModelCatalogProvider | undefined {
  const catalog = normalizeModelCatalog(
    { providers: { [params.providerId]: params.value } },
    { ownedProviders: new Set([params.providerId]) },
  );
  const provider = catalog?.providers?.[params.providerId];
  if (!provider) {
    return undefined;
  }
  for (const model of provider.models) {
    model.status ??= "preview";
  }
  return provider;
}

function normalizeOnboardingScopes(
  value: unknown,
): OpenClawProviderIndexProviderAuthChoice["onboardingScopes"] | undefined {
  const scopes = normalizeUniqueTrimmedStringList(value).filter(
    (scope): scope is "text-inference" | "image-generation" | "music-generation" =>
      scope === "text-inference" || scope === "image-generation" || scope === "music-generation",
  );
  return scopes.length > 0 ? scopes : undefined;
}

function normalizeAssistantVisibility(
  value: unknown,
): OpenClawProviderIndexProviderAuthChoice["assistantVisibility"] | undefined {
  return value === "visible" || value === "manual-only" ? value : undefined;
}

function normalizeAuthChoice(params: {
  providerId: string;
  providerName: string;
  value: unknown;
}): OpenClawProviderIndexProviderAuthChoice | undefined {
  if (!isRecord(params.value)) {
    return undefined;
  }
  const method = normalizeSafeKey(params.value.method);
  const choiceId = normalizeSafeKey(params.value.choiceId);
  const choiceLabel = normalizeOptionalString(params.value.choiceLabel) ?? "";
  if (!method || !choiceId || !choiceLabel) {
    return undefined;
  }
  const choiceHint = normalizeOptionalString(params.value.choiceHint);
  const groupId = normalizeSafeKey(params.value.groupId) || params.providerId;
  const groupLabel = normalizeOptionalString(params.value.groupLabel) ?? params.providerName;
  const groupHint = normalizeOptionalString(params.value.groupHint);
  const optionKey = normalizeSafeKey(params.value.optionKey);
  const cliFlag = normalizeOptionalString(params.value.cliFlag);
  const cliOption = normalizeOptionalString(params.value.cliOption);
  const cliDescription = normalizeOptionalString(params.value.cliDescription);
  const assistantPriority = asFiniteNumber(params.value.assistantPriority);
  const assistantVisibility = normalizeAssistantVisibility(params.value.assistantVisibility);
  const onboardingScopes = normalizeOnboardingScopes(params.value.onboardingScopes);
  return {
    method,
    choiceId,
    choiceLabel,
    ...(choiceHint ? { choiceHint } : {}),
    ...(assistantPriority !== undefined ? { assistantPriority } : {}),
    ...(assistantVisibility ? { assistantVisibility } : {}),
    ...(groupId ? { groupId } : {}),
    ...(groupLabel ? { groupLabel } : {}),
    ...(groupHint ? { groupHint } : {}),
    ...(optionKey ? { optionKey } : {}),
    ...(cliFlag ? { cliFlag } : {}),
    ...(cliOption ? { cliOption } : {}),
    ...(cliDescription ? { cliDescription } : {}),
    ...(onboardingScopes ? { onboardingScopes } : {}),
  };
}

function normalizeAuthChoices(params: {
  providerId: string;
  providerName: string;
  value: unknown;
}): readonly OpenClawProviderIndexProviderAuthChoice[] | undefined {
  if (!Array.isArray(params.value)) {
    return undefined;
  }
  const choices = params.value
    .map((value) => normalizeAuthChoice({ ...params, value }))
    .filter((choice): choice is OpenClawProviderIndexProviderAuthChoice => Boolean(choice));
  return choices.length > 0 ? choices : undefined;
}

function normalizeProvider(
  rawProviderId: string,
  value: unknown,
): OpenClawProviderIndexProvider | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const providerId = normalizeModelCatalogProviderId(rawProviderId);
  if (!providerId) {
    return undefined;
  }
  const id = normalizeModelCatalogProviderId(normalizeOptionalString(value.id) ?? "");
  if (id && id !== providerId) {
    return undefined;
  }
  const name = normalizeOptionalString(value.name) ?? "";
  const plugin = normalizePlugin(value.plugin);
  if (!name || !plugin) {
    return undefined;
  }
  const docs = normalizeOptionalString(value.docs) ?? "";
  const categories = normalizeCategories(value.categories);
  const authChoices = normalizeAuthChoices({
    providerId,
    providerName: name,
    value: value.authChoices,
  });
  const previewCatalog = normalizePreviewCatalog({
    providerId,
    value: value.previewCatalog,
  });
  return {
    id: providerId,
    name,
    plugin,
    ...(docs ? { docs } : {}),
    ...(categories.length > 0 ? { categories } : {}),
    ...(authChoices ? { authChoices } : {}),
    ...(previewCatalog ? { previewCatalog } : {}),
  };
}

/**
 * 规范化 Provider 索引数据
 *
 * 验证版本号，规范化所有提供商数据，按字母顺序排序
 *
 * @param value - 原始索引数据
 * @returns 规范化后的索引，如果版本不匹配或数据无效则返回 undefined
 */
export function normalizeOpenClawProviderIndex(value: unknown): OpenClawProviderIndex | undefined {
  if (!isRecord(value) || value.version !== OPENCLAW_PROVIDER_INDEX_VERSION) {
    return undefined;
  }
  if (!isRecord(value.providers)) {
    return undefined;
  }
  const providers: Record<string, OpenClawProviderIndexProvider> = {};
  for (const [rawProviderId, rawProvider] of Object.entries(value.providers)) {
    const providerId = normalizeModelCatalogProviderId(rawProviderId);
    if (!providerId || isBlockedObjectKey(providerId)) {
      continue;
    }
    const provider = normalizeProvider(providerId, rawProvider);
    if (provider) {
      providers[providerId] = provider;
    }
  }
  return {
    version: OPENCLAW_PROVIDER_INDEX_VERSION,
    providers: Object.fromEntries(
      Object.entries(providers).toSorted(([left], [right]) => left.localeCompare(right)),
    ),
  };
}
