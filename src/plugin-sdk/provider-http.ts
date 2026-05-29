/**
 * @file Provider HTTP 客户端公共辅助模块
 *
 * 本文件是 Provider 插件进行 HTTP 通信的核心工具集，聚合导出了来自多个底层模块的
 * HTTP 相关功能，为 Provider 插件提供统一的网络请求接口。
 *
 * 主要功能分类：
 * 1. 错误处理：HTTP 错误创建、格式化、详情提取
 * 2. 请求配置：超时管理、请求头解析、端点解析
 * 3. 响应处理：JSON 解析、二进制响应读取、文本截断
 * 4. 特殊请求：多部分上传、音频转录、操作轮询
 * 5. 重试机制：瞬态错误重试策略
 * 6. 能力查询：Provider 请求能力解析
 *
 * 设计原则：
 * - 将通用传输工具集中在此，避免各能力 SDK 相互依赖
 * - 所有超时相关函数都支持 AbortSignal 中止
 * - 错误处理函数统一格式，便于日志和调试
 */

// Shared provider-facing HTTP helpers. Keep generic transport utilities here so
// capability SDKs do not depend on each other.

export {
  assertOkOrThrowHttpError,
  assertOkOrThrowProviderError,
  assertProviderBinaryResponseContent,
  createProviderHttpError,
  extractProviderErrorDetail,
  extractProviderRequestId,
  formatProviderErrorPayload,
  formatProviderHttpErrorMessage,
  readProviderBinaryResponse,
  readProviderJsonArrayFieldResponse,
  readProviderJsonObjectResponse,
  readProviderJsonResponse,
  readResponseTextLimited,
  truncateErrorDetail,
} from "../agents/provider-http-errors.js";
export {
  buildAudioTranscriptionFormData,
  createProviderOperationDeadline,
  createProviderOperationTimeoutResolver,
  fetchProviderDownloadResponse,
  fetchProviderOperationResponse,
  fetchWithTimeout,
  fetchWithTimeoutGuarded,
  normalizeBaseUrl,
  pollProviderOperationJson,
  postJsonRequest,
  postMultipartRequest,
  postTranscriptionRequest,
  resolveProviderOperationTimeoutMs,
  resolveProviderHttpRequestConfig,
  resolveAudioTranscriptionUploadFileName,
  requireTranscriptionText,
  sanitizeConfiguredModelProviderRequest,
  waitProviderOperationPollInterval,
} from "../media-understanding/shared.js";
export type {
  ProviderOperationDeadline,
  ProviderOperationTimeoutMs,
} from "../media-understanding/shared.js";
export {
  executeProviderOperationWithRetry,
  providerOperationRetryConfig,
} from "../provider-runtime/operation-retry.js";
export type {
  ProviderOperationRetryStage,
  TransientProviderRetryConfig,
  TransientProviderRetryOptions,
  TransientProviderRetryParams,
} from "../provider-runtime/operation-retry.js";
export type {
  ProviderAttributionPolicy,
  ProviderRequestCapabilities,
  ProviderRequestCapabilitiesInput,
  ProviderRequestCompatibilityFamily,
  ProviderEndpointClass,
  ProviderEndpointResolution,
  ProviderRequestCapability,
  ProviderRequestPolicyInput,
  ProviderRequestPolicyResolution,
  ProviderRequestTransport,
} from "../agents/provider-attribution.js";
export type {
  ProviderRequestAuthOverride,
  ProviderRequestProxyOverride,
  ProviderRequestTlsOverride,
  ProviderRequestTransportOverrides,
} from "../agents/provider-request-config.js";
export { resolveProviderRequestHeaders } from "../agents/provider-request-config.js";
export {
  resolveProviderEndpoint,
  resolveProviderRequestCapabilities,
  resolveProviderRequestPolicy,
} from "../agents/provider-attribution.js";
