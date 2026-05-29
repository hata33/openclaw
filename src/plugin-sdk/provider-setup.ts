/**
 * @file Provider 设置辅助模块
 *
 * 提供自托管（self-hosted）Provider 的设置流程辅助函数。
 * 当用户需要连接本地或自托管的 AI 模型服务时，这些函数会引导用户完成配置。
 *
 * 典型使用场景：
 * - 连接本地运行的 Ollama、LM Studio 等模型服务
 * - 连接自部署的 vLLM、Text Generation Inference 等推理服务
 * - 连接企业内部的 OpenAI 兼容 API 代理
 *
 * 导出的功能：
 * - discoverOpenAICompatibleLocalModels: 自动发现本地运行的 OpenAI 兼容模型
 * - discoverOpenAICompatibleSelfHostedProvider: 发现自托管 Provider
 * - promptAndConfigureOpenAICompatibleSelfHostedProvider: 交互式引导配置
 * - applyProviderDefaultModel: 应用 Provider 的默认模型设置
 *
 * 为什么单独封装：
 * - 自托管设置流程需要本地模型发现、网络探测等特殊逻辑
 * - 交互式配置需要与 UI 层解耦
 * - 默认值和常量（如 SELF_HOSTED_DEFAULT_CONTEXT_WINDOW）集中管理
 */
// Curated setup helpers for provider plugins that integrate local/self-hosted models.
export type {
  OpenClawPluginApi,
  ProviderAuthContext,
  ProviderAuthMethodNonInteractiveContext,
  ProviderAuthResult,
  ProviderCatalogContext,
  ProviderDiscoveryContext,
  ProviderPrepareDynamicModelContext,
  ProviderRuntimeModel,
} from "../plugins/types.js";

export {
  applyProviderDefaultModel,
  configureOpenAICompatibleSelfHostedProviderNonInteractive,
  discoverOpenAICompatibleLocalModels,
  discoverOpenAICompatibleSelfHostedProvider,
  promptAndConfigureOpenAICompatibleSelfHostedProvider,
  promptAndConfigureOpenAICompatibleSelfHostedProviderAuth,
  SELF_HOSTED_DEFAULT_CONTEXT_WINDOW,
  SELF_HOSTED_DEFAULT_COST,
  SELF_HOSTED_DEFAULT_MAX_TOKENS,
} from "../plugins/provider-self-hosted-setup.js";
