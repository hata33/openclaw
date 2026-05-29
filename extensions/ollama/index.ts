/**
 * Ollama Provider 入口文件
 *
 * 本文件是 Ollama 提供者插件的完整注册入口，是所有 Provider 中最复杂的一个，
 * 因为 Ollama 同时支持本地和云端模型，且需要动态发现运行时可用的模型。
 *
 * 主要职责：
 * 1. 注册 Ollama 提供者，支持多种认证方式（本地无需认证 / 云端需 API Key）
 * 2. 注册内存嵌入（embedding）和媒体理解（media understanding）子提供者
 * 3. 注册网页搜索提供者
 * 4. 实现动态模型发现机制（prepareDynamicModel / resolveDynamicModel）
 * 5. 处理 WSL2 环境下的崩溃循环风险检测
 * 6. 配置流式处理包装器，支持 Ollama 原生和 OpenAI 兼容两种传输协议
 * 7. 实现模型自动拉取（pull）功能，当用户选择未下载的模型时自动下载
 *
 * Ollama 的特殊之处：
 * - 本地实例通常无需认证，使用合成的 "ollama-local" 凭证
 * - 支持 OpenAI 兼容传输和原生 /api/chat 两种 API 格式
 * - 模型列表是动态的，取决于用户本地安装了哪些模型
 * - 云端模型（:cloud 后缀）需要 ollama signin 认证
 */
import type { OpenClawConfig } from "openclaw/plugin-sdk/config-contracts";
import { resolvePluginConfigObject } from "openclaw/plugin-sdk/plugin-config-runtime";
import {
  definePluginEntry,
  type OpenClawPluginApi,
  type ProviderAuthContext,
  type ProviderAuthMethodNonInteractiveContext,
  type ProviderAuthResult,
  type ProviderCatalogContext,
  type ProviderReplayPolicy,
  type ProviderRuntimeModel,
} from "openclaw/plugin-sdk/plugin-entry";
import { buildApiKeyCredential } from "openclaw/plugin-sdk/provider-auth";
import type {
  ModelDefinitionConfig,
  ModelProviderConfig,
} from "openclaw/plugin-sdk/provider-model-shared";
import {
  buildOpenAICompatibleReplayPolicy,
  OPENAI_COMPATIBLE_REPLAY_HOOKS,
} from "openclaw/plugin-sdk/provider-model-shared";
import {
  OLLAMA_DEFAULT_BASE_URL,
  buildOllamaModelDefinition,
  buildOllamaProvider,
  configureOllamaNonInteractive,
  ensureOllamaModelPulled,
  promptAndConfigureOllama,
  queryOllamaModelShowInfo,
} from "./api.js";
import { resolveThinkingProfile as resolveOllamaThinkingProfile } from "./provider-policy-api.js";
import {
  OLLAMA_DEFAULT_API_KEY,
  OLLAMA_PROVIDER_ID,
  resolveOllamaDiscoveryResult,
  shouldUseSyntheticOllamaAuth,
  type OllamaPluginConfig,
} from "./src/discovery-shared.js";
import {
  DEFAULT_OLLAMA_EMBEDDING_MODEL,
  createOllamaEmbeddingProvider,
} from "./src/embedding-provider.js";
import { ollamaMediaUnderstandingProvider } from "./src/media-understanding-provider.js";
import { ollamaMemoryEmbeddingProviderAdapter } from "./src/memory-embedding-adapter.js";
import { readProviderBaseUrl } from "./src/provider-base-url.js";
import {
  createConfiguredOllamaCompatStreamWrapper,
  createConfiguredOllamaStreamFn,
  isOllamaCompatProvider,
  resolveConfiguredOllamaProviderConfig,
} from "./src/stream.js";
import { createOllamaWebSearchProvider } from "./src/web-search-provider.js";
import { checkWsl2CrashLoopRisk } from "./src/wsl2-crash-loop-check.js";

function usesOllamaOpenAICompatTransport(model: {
  api?: unknown;
  provider?: unknown;
  baseUrl?: unknown;
}): boolean {
  return (
    model.api === "openai-completions" &&
    isOllamaCompatProvider({
      provider: typeof model.provider === "string" ? model.provider : undefined,
      baseUrl: typeof model.baseUrl === "string" ? model.baseUrl : undefined,
      api: "openai-completions",
    })
  );
}

function buildNativeOllamaReplayPolicy(): ProviderReplayPolicy {
  return {
    ...buildOpenAICompatibleReplayPolicy("openai-completions", {
      sanitizeToolCallIds: false,
    }),
    sanitizeToolCallIds: false,
  };
}

const dynamicModelCache = new Map<string, ProviderRuntimeModel[]>();

function buildDynamicCacheKey(provider: string, baseUrl: string | undefined): string {
  return `${provider}\0${baseUrl ?? ""}`;
}

function hasOllamaDiscoverySignal(providerConfig: ModelProviderConfig | undefined): boolean {
  return (
    Boolean(process.env.OLLAMA_API_KEY?.trim()) ||
    shouldUseSyntheticOllamaAuth(providerConfig) ||
    Boolean(providerConfig?.apiKey)
  );
}

function toDynamicOllamaModel(params: {
  provider: string;
  providerConfig: ModelProviderConfig;
  model: ModelDefinitionConfig;
}): ProviderRuntimeModel {
  const input = (params.model.input ?? ["text"]).filter(
    (value): value is "text" | "image" => value === "text" || value === "image",
  );
  return {
    id: params.model.id,
    name: params.model.name ?? params.model.id,
    provider: params.provider,
    api: "ollama",
    baseUrl: readProviderBaseUrl(params.providerConfig) ?? "",
    reasoning: params.model.reasoning ?? false,
    input: input.length > 0 ? input : ["text"],
    cost: params.model.cost ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: params.model.contextWindow ?? 8192,
    maxTokens: params.model.maxTokens ?? 8192,
    ...(params.model.compat ? { compat: params.model.compat as never } : {}),
    ...(params.model.params ? { params: params.model.params } : {}),
  };
}

async function resolveRequestedDynamicOllamaModel(params: {
  provider: string;
  providerConfig: ModelProviderConfig;
  modelId: string;
}): Promise<ProviderRuntimeModel | undefined> {
  const showInfo = await queryOllamaModelShowInfo(
    readProviderBaseUrl(params.providerConfig) ?? OLLAMA_DEFAULT_BASE_URL,
    params.modelId,
  );
  if (typeof showInfo.contextWindow !== "number" && (showInfo.capabilities?.length ?? 0) === 0) {
    return undefined;
  }
  return toDynamicOllamaModel({
    provider: params.provider,
    providerConfig: params.providerConfig,
    model: buildOllamaModelDefinition(
      params.modelId,
      showInfo.contextWindow,
      showInfo.capabilities,
    ),
  });
}

export default definePluginEntry({
  id: "ollama",
  name: "Ollama Provider",
  description: "Bundled Ollama provider plugin",
  register(api: OpenClawPluginApi) {
    if (api.registrationMode === "full") {
      void checkWsl2CrashLoopRisk(api.logger);
    }
    api.registerMemoryEmbeddingProvider(ollamaMemoryEmbeddingProviderAdapter);
    api.registerMediaUnderstandingProvider(ollamaMediaUnderstandingProvider);
    const startupPluginConfig = (api.pluginConfig ?? {}) as OllamaPluginConfig;
    const resolveCurrentPluginConfig = (config?: OpenClawConfig): OllamaPluginConfig => {
      const runtimePluginConfig = resolvePluginConfigObject(config, "ollama");
      if (runtimePluginConfig) {
        return runtimePluginConfig as OllamaPluginConfig;
      }
      return config ? {} : startupPluginConfig;
    };
    api.registerWebSearchProvider(createOllamaWebSearchProvider());
    api.registerProvider({
      id: OLLAMA_PROVIDER_ID,
      label: "Ollama",
      docsPath: "/providers/ollama",
      envVars: ["OLLAMA_API_KEY"],
      auth: [
        {
          id: "local",
          label: "Ollama",
          hint: "Cloud and local open models",
          kind: "custom",
          run: async (ctx: ProviderAuthContext): Promise<ProviderAuthResult> => {
            const result = await promptAndConfigureOllama({
              cfg: ctx.config,
              env: ctx.env,
              opts: ctx.opts as Record<string, unknown> | undefined,
              prompter: ctx.prompter,
              secretInputMode: ctx.secretInputMode,
              allowSecretRefPrompt: ctx.allowSecretRefPrompt,
            });
            return {
              profiles: [
                {
                  profileId: "ollama:default",
                  credential: buildApiKeyCredential(
                    OLLAMA_PROVIDER_ID,
                    result.credential,
                    undefined,
                    result.credentialMode
                      ? {
                          secretInputMode: result.credentialMode,
                          config: ctx.config,
                        }
                      : undefined,
                  ),
                },
              ],
              configPatch: result.config,
            };
          },
          runNonInteractive: async (ctx: ProviderAuthMethodNonInteractiveContext) => {
            return await configureOllamaNonInteractive({
              nextConfig: ctx.config,
              opts: {
                customBaseUrl: ctx.opts.customBaseUrl as string | undefined,
                customModelId: ctx.opts.customModelId as string | undefined,
              },
              runtime: ctx.runtime,
              agentDir: ctx.agentDir,
            });
          },
        },
      ],
      catalog: {
        order: "late",
        run: async (ctx: ProviderCatalogContext) =>
          await resolveOllamaDiscoveryResult({
            ctx,
            pluginConfig: resolveCurrentPluginConfig(ctx.config),
            buildProvider: buildOllamaProvider,
          }),
      },
      wizard: {
        setup: {
          choiceId: "ollama",
          choiceLabel: "Ollama",
          choiceHint: "Cloud and local open models",
          groupId: "ollama",
          groupLabel: "Ollama",
          groupHint: "Cloud and local open models",
          methodId: "local",
          modelSelection: {
            promptWhenAuthChoiceProvided: true,
            allowKeepCurrent: false,
          },
        },
        modelPicker: {
          label: "Ollama (custom)",
          hint: "Detect models from a local or remote Ollama instance",
          methodId: "local",
        },
      },
      onModelSelected: async ({ config, model, prompter }) => {
        if (!model.startsWith("ollama/")) {
          return;
        }
        await ensureOllamaModelPulled({ config, model, prompter });
      },
      createStreamFn: ({ config, model, provider }) => {
        return createConfiguredOllamaStreamFn({
          model,
          providerBaseUrl: readProviderBaseUrl(
            resolveConfiguredOllamaProviderConfig({ config, providerId: provider }),
          ),
        });
      },
      ...OPENAI_COMPATIBLE_REPLAY_HOOKS,
      buildReplayPolicy: (ctx) =>
        ctx.modelApi === "ollama"
          ? buildNativeOllamaReplayPolicy()
          : buildOpenAICompatibleReplayPolicy(ctx.modelApi),
      contributeResolvedModelCompat: ({ model }) =>
        usesOllamaOpenAICompatTransport(model) ? { supportsUsageInStreaming: true } : undefined,
      resolveReasoningOutputMode: () => "native",
      resolveThinkingProfile: resolveOllamaThinkingProfile,
      wrapStreamFn: createConfiguredOllamaCompatStreamWrapper,
      createEmbeddingProvider: async ({ config, model, provider: embeddingProvider, remote }) => {
        const { provider, client } = await createOllamaEmbeddingProvider({
          config,
          remote,
          model: model || DEFAULT_OLLAMA_EMBEDDING_MODEL,
          provider: embeddingProvider || OLLAMA_PROVIDER_ID,
        });
        return {
          ...provider,
          client,
        };
      },
      matchesContextOverflowError: ({ errorMessage }) =>
        /\bollama\b.*(?:context length|too many tokens|context window)/i.test(errorMessage) ||
        /\btruncating input\b.*\btoo long\b/i.test(errorMessage),
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
      shouldDeferSyntheticProfileAuth: ({ resolvedApiKey }) =>
        resolvedApiKey?.trim() === OLLAMA_DEFAULT_API_KEY,
      prepareDynamicModel: async (ctx) => {
        const providerConfig = resolveConfiguredOllamaProviderConfig({
          config: ctx.config,
          providerId: ctx.provider,
        });
        if (!hasOllamaDiscoverySignal(providerConfig)) {
          return;
        }
        const baseUrl = readProviderBaseUrl(providerConfig);
        const provider = await buildOllamaProvider(baseUrl, { quiet: true });
        const dynamicModels = (provider.models ?? []).map((model) =>
          toDynamicOllamaModel({
            provider: ctx.provider,
            providerConfig: provider,
            model,
          }),
        );
        if (!dynamicModels.some((model) => model.id === ctx.modelId)) {
          const requestedModel = await resolveRequestedDynamicOllamaModel({
            provider: ctx.provider,
            providerConfig: provider,
            modelId: ctx.modelId,
          });
          if (requestedModel) {
            dynamicModels.push(requestedModel);
          }
        }
        dynamicModelCache.set(buildDynamicCacheKey(ctx.provider, baseUrl), dynamicModels);
      },
      resolveDynamicModel: (ctx) => {
        const providerConfig = resolveConfiguredOllamaProviderConfig({
          config: ctx.config,
          providerId: ctx.provider,
        });
        return dynamicModelCache
          .get(buildDynamicCacheKey(ctx.provider, readProviderBaseUrl(providerConfig)))
          ?.find((model) => model.id === ctx.modelId);
      },
      buildUnknownModelHint: () =>
        "Ollama requires authentication to be registered as a provider. " +
        'Set OLLAMA_API_KEY="ollama-local" (any value works) or run "openclaw configure". ' +
        "See: https://docs.openclaw.ai/providers/ollama",
    });
  },
});
