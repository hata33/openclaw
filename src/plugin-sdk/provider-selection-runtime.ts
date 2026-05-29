/**
 * @file Provider 选择运行时
 *
 * 本文件实现了 Provider 的自动选择和配置解析逻辑。
 * 当系统需要使用某个能力（如文本推理）时，可能有多个 Provider 可用，
 * 本模块负责选择最合适的 Provider。
 *
 * 选择策略：
 * 1. 如果用户明确指定了 Provider（configuredProviderId），优先使用
 * 2. 如果指定的 Provider 不存在，返回错误
 * 3. 如果未指定，按 autoSelectOrder 排序选择第一个已配置的 Provider
 * 4. 如果没有已配置的 Provider，返回错误并建议第一个可用的
 *
 * 为什么需要这个模块：
 * - 不同用户可能使用不同的 Provider（OpenAI、Anthropic、Google 等）
 * - 系统需要在用户无感的情况下自动选择最佳可用 Provider
 * - 配置可能分散在多个位置（config 文件、环境变量、Profile）
 * - 需要统一的配置解析和验证逻辑
 */

import { normalizeOptionalString } from "../shared/string-coerce.js";

export type AutoSelectableProvider = {
  id: string;
  autoSelectOrder?: number;
};

export type ProviderSelection<TProvider> = {
  configuredProviderId?: string;
  missingConfiguredProvider: boolean;
  provider: TProvider | undefined;
};

export type ResolvedConfiguredProvider<TProvider, TConfig> =
  | {
      ok: true;
      configuredProviderId?: string;
      provider: TProvider;
      providerConfig: TConfig;
    }
  | {
      ok: false;
      code: "missing-configured-provider" | "no-registered-provider" | "provider-not-configured";
      configuredProviderId?: string;
      provider?: TProvider;
    };

export function selectConfiguredOrAutoProvider<TProvider extends AutoSelectableProvider>(params: {
  configuredProviderId?: string;
  getConfiguredProvider: (providerId: string | undefined) => TProvider | undefined;
  listProviders: () => Iterable<TProvider>;
}): ProviderSelection<TProvider> {
  const configuredProviderId = normalizeOptionalString(params.configuredProviderId);
  const configuredProvider = configuredProviderId
    ? params.getConfiguredProvider(configuredProviderId)
    : undefined;

  if (configuredProviderId && !configuredProvider) {
    return {
      configuredProviderId,
      missingConfiguredProvider: true,
      provider: undefined,
    };
  }

  return {
    configuredProviderId,
    missingConfiguredProvider: false,
    provider: configuredProvider ?? selectFirstAutoProvider(params.listProviders()),
  };
}

export function resolveProviderRawConfig(params: {
  providerId: string;
  configuredProviderId?: string;
  providerConfigs?: Record<string, Record<string, unknown> | undefined>;
}): Record<string, unknown> {
  const canonicalProviderConfig = readProviderConfig(params.providerConfigs, params.providerId);
  const selectedProviderConfig = readProviderConfig(
    params.providerConfigs,
    params.configuredProviderId,
  );

  return {
    ...canonicalProviderConfig,
    ...selectedProviderConfig,
  };
}

export function resolveConfiguredCapabilityProvider<
  TConfig,
  TFullConfig,
  TProvider extends AutoSelectableProvider,
>(params: {
  configuredProviderId?: string;
  providerConfigs?: Record<string, Record<string, unknown> | undefined>;
  cfg: TFullConfig | undefined;
  cfgForResolve: TFullConfig;
  getConfiguredProvider: (providerId: string | undefined) => TProvider | undefined;
  listProviders: () => Iterable<TProvider>;
  resolveProviderConfig: (params: {
    provider: TProvider;
    cfg: TFullConfig;
    rawConfig: Record<string, unknown>;
  }) => TConfig;
  isProviderConfigured: (params: {
    provider: TProvider;
    cfg: TFullConfig | undefined;
    providerConfig: TConfig;
  }) => boolean;
}): ResolvedConfiguredProvider<TProvider, TConfig> {
  const configuredProviderId = normalizeOptionalString(params.configuredProviderId);
  if (configuredProviderId) {
    const provider = params.getConfiguredProvider(configuredProviderId);
    if (!provider) {
      return {
        ok: false,
        code: "missing-configured-provider",
        configuredProviderId,
      };
    }

    return resolveProviderCandidate({
      ...params,
      configuredProviderId,
      provider,
    });
  }

  const providers = [...params.listProviders()].toSorted(compareProviderAutoSelectOrder);
  if (providers.length === 0) {
    return {
      ok: false,
      code: "no-registered-provider",
    };
  }

  let firstUnconfigured: TProvider | undefined;
  for (const provider of providers) {
    const resolution = resolveProviderCandidate({
      ...params,
      provider,
    });
    if (resolution.ok) {
      return resolution;
    }
    firstUnconfigured ??= provider;
  }

  return {
    ok: false,
    code: "provider-not-configured",
    provider: firstUnconfigured,
  };
}

function compareProviderAutoSelectOrder<TProvider extends AutoSelectableProvider>(
  left: TProvider,
  right: TProvider,
): number {
  return (
    (left.autoSelectOrder ?? Number.MAX_SAFE_INTEGER) -
    (right.autoSelectOrder ?? Number.MAX_SAFE_INTEGER)
  );
}

function selectFirstAutoProvider<TProvider extends AutoSelectableProvider>(
  providers: Iterable<TProvider>,
): TProvider | undefined {
  let selected: TProvider | undefined;
  for (const provider of providers) {
    if (!selected || compareProviderAutoSelectOrder(provider, selected) < 0) {
      selected = provider;
    }
  }
  return selected;
}

function readProviderConfig(
  providerConfigs: Record<string, Record<string, unknown> | undefined> | undefined,
  providerId: string | undefined,
): Record<string, unknown> | undefined {
  if (!providerId) {
    return undefined;
  }
  const providerConfig = providerConfigs?.[providerId];
  return providerConfig && typeof providerConfig === "object" ? providerConfig : undefined;
}

function resolveProviderCandidate<
  TConfig,
  TFullConfig,
  TProvider extends AutoSelectableProvider,
>(params: {
  configuredProviderId?: string;
  providerConfigs?: Record<string, Record<string, unknown> | undefined>;
  cfg: TFullConfig | undefined;
  cfgForResolve: TFullConfig;
  provider: TProvider;
  resolveProviderConfig: (params: {
    provider: TProvider;
    cfg: TFullConfig;
    rawConfig: Record<string, unknown>;
  }) => TConfig;
  isProviderConfigured: (params: {
    provider: TProvider;
    cfg: TFullConfig | undefined;
    providerConfig: TConfig;
  }) => boolean;
}): ResolvedConfiguredProvider<TProvider, TConfig> {
  const rawProviderConfig = resolveProviderRawConfig({
    providerId: params.provider.id,
    configuredProviderId: params.configuredProviderId,
    providerConfigs: params.providerConfigs,
  });
  const providerConfig = params.resolveProviderConfig({
    provider: params.provider,
    cfg: params.cfgForResolve,
    rawConfig: rawProviderConfig,
  });

  if (
    !params.isProviderConfigured({ provider: params.provider, cfg: params.cfg, providerConfig })
  ) {
    return {
      ok: false,
      code: "provider-not-configured",
      configuredProviderId: params.configuredProviderId,
      provider: params.provider,
    };
  }

  return {
    ok: true,
    configuredProviderId: params.configuredProviderId,
    provider: params.provider,
    providerConfig,
  };
}
