/**
 * Ollama Provider 发现模块
 *
 * 本文件实现 Ollama 提供者的独立发现逻辑，
 * 与 index.ts 中的完整注册不同，这里提供一个更轻量级的发现插件对象，
 * 用于 Provider 发现阶段获取 Ollama 的模型列表。
 *
 * 关键特性：
 * - 使用 "late" 排序，确保 Ollama 的发现在其他 Provider 之后执行
 * - 支持合成认证（synthetic auth），本地实例使用 "ollama-local" 占位凭证
 * - 发现结果通过 resolveOllamaDiscoveryResult 获取，支持缓存
 */
import type { ProviderCatalogContext } from "openclaw/plugin-sdk/provider-catalog-shared";
import type { ModelProviderConfig } from "openclaw/plugin-sdk/provider-model-shared";
import {
  OLLAMA_DEFAULT_API_KEY,
  OLLAMA_PROVIDER_ID,
  resolveOllamaDiscoveryResult,
  shouldUseSyntheticOllamaAuth,
  type OllamaPluginConfig,
} from "./src/discovery-shared.js";
import { buildOllamaProvider } from "./src/provider-models.js";

type OllamaProviderPlugin = {
  id: string;
  label: string;
  docsPath: string;
  envVars: string[];
  auth: [];
  resolveSyntheticAuth: (ctx: { provider?: string; providerConfig?: ModelProviderConfig }) =>
    | {
        apiKey: string;
        source: string;
        mode: "api-key";
      }
    | undefined;
  catalog: {
    order: "late";
    run: (ctx: ProviderCatalogContext) => ReturnType<typeof runOllamaDiscovery>;
  };
};

function resolveOllamaPluginConfig(ctx: ProviderCatalogContext): OllamaPluginConfig {
  const entries = (ctx.config.plugins?.entries ?? {}) as Record<
    string,
    { config?: OllamaPluginConfig }
  >;
  return entries.ollama?.config ?? {};
}

async function runOllamaDiscovery(ctx: ProviderCatalogContext) {
  return await resolveOllamaDiscoveryResult({
    ctx,
    pluginConfig: resolveOllamaPluginConfig(ctx),
    buildProvider: buildOllamaProvider,
  });
}

export const ollamaProviderDiscovery: OllamaProviderPlugin = {
  id: OLLAMA_PROVIDER_ID,
  label: "Ollama",
  docsPath: "/providers/ollama",
  envVars: ["OLLAMA_API_KEY"],
  auth: [],
  resolveSyntheticAuth: ({ provider, providerConfig }) => {
    if (!shouldUseSyntheticOllamaAuth(providerConfig)) {
      return undefined;
    }
    return {
      apiKey: OLLAMA_DEFAULT_API_KEY,
      source: `models.providers.${provider ?? OLLAMA_PROVIDER_ID} (synthetic local key)`,
      mode: "api-key",
    };
  },
  catalog: {
    order: "late",
    run: runOllamaDiscovery,
  },
};

export default ollamaProviderDiscovery;
