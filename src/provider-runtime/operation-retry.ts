/**
 * @file Provider 操作重试策略
 *
 * 本文件实现了 Provider API 操作的自动重试机制。当与外部 AI Provider 交互时，
 * 网络波动、服务暂时不可用等情况很常见，自动重试可以显著提高系统的可靠性。
 *
 * 重试策略设计：
 * - 指数退避：每次重试的延迟时间按 2^n 增长，避免在服务恢复期间造成请求风暴
 * - 可配置：支持自定义尝试次数、基础延迟、最大延迟等参数
 * - 智能判断：只对瞬态错误（5xx、网络超时等）进行重试，不重试客户端错误（4xx）
 * - 支持中止：通过 AbortSignal 支持在等待期间取消重试
 * - 阶段感知：不同操作阶段（读取/轮询/下载/创建）可以有不同的重试策略
 *
 * 典型使用场景：
 * - 模型列表获取（read 阶段）：网络波动时自动重试
 * - 异步操作轮询（poll 阶段）：等待操作完成时的重试
 * - 文件下载（download 阶段）：大文件下载失败时的重试
 * - 资源创建（create 阶段）：默认不重试，避免重复创建
 */

import { sleepWithAbort } from "../infra/backoff.js";
import { formatErrorMessage } from "../infra/errors.js";

/** Provider 操作阶段：读取、轮询、下载、创建 */
export type ProviderOperationRetryStage = "read" | "poll" | "download" | "create";

/** 重试回调参数 - 提供给 shouldRetry 回调的上下文信息 */
export type TransientProviderRetryParams = {
  error: unknown;
  message: string;
  provider: string;
  apiKeyIndex: number;
  attemptNumber: number;
  stage?: ProviderOperationRetryStage;
};

/** 重试选项 - 控制重试行为的完整配置 */
export type TransientProviderRetryOptions = {
  /**
   * Total executions, including the first call.
   * attempts: 2 means one initial call plus one retry.
   */
  attempts: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
  shouldRetry?: (params: TransientProviderRetryParams) => boolean;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
};

/** 重试配置类型 - 可以是简单的 boolean 或完整的选项对象 */
export type TransientProviderRetryConfig = boolean | TransientProviderRetryOptions;

/** 默认重试选项：2 次尝试，250ms 基础延迟，1000ms 最大延迟 */
export const DEFAULT_TRANSIENT_PROVIDER_RETRY_OPTIONS = {
  attempts: 2,
  baseDelayMs: 250,
  maxDelayMs: 1_000,
} as const satisfies TransientProviderRetryOptions;

/**
 * 解析重试配置为标准化的选项对象
 * - false/undefined → 不重试（返回 undefined）
 * - true → 使用默认选项
 * - TransientProviderRetryOptions → 直接返回
 */
export function resolveTransientProviderRetryOptions(
  options?: TransientProviderRetryConfig,
): TransientProviderRetryOptions | undefined {
  if (!options) {
    return undefined;
  }
  if (options === true) {
    return DEFAULT_TRANSIENT_PROVIDER_RETRY_OPTIONS;
  }
  return options;
}

/**
 * 获取不同操作阶段的默认重试配置
 * "create" 阶段默认不重试（避免重复创建资源），其他阶段默认重试
 */
export function defaultTransientProviderRetryForStage(
  stage: ProviderOperationRetryStage,
): TransientProviderRetryConfig | undefined {
  return stage === "create" ? undefined : true;
}

/**
 * 合并重试配置：如果用户提供了自定义配置则使用，否则使用阶段默认配置
 */
export function providerOperationRetryConfig(
  stage: ProviderOperationRetryStage,
  options?: TransientProviderRetryConfig,
): TransientProviderRetryConfig | undefined {
  return options ?? defaultTransientProviderRetryForStage(stage);
}

function readErrorName(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const name = (error as { name?: unknown }).name;
  return typeof name === "string" ? name : undefined;
}

function isTimeoutNamedError(error: unknown): boolean {
  const name = readErrorName(error);
  return name === "TimeoutError" || name === "RequestTimeoutError";
}

function readErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const record = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  for (const value of [record.status, record.statusCode, record.code]) {
    if (typeof value === "number" && Number.isInteger(value)) {
      return value;
    }
    if (typeof value === "string" && /^\d{3}$/.test(value.trim())) {
      return Number(value.trim());
    }
  }
  return undefined;
}

function readErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function readErrorCause(error: unknown): unknown {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  return (error as { cause?: unknown }).cause;
}

function hasTransientNetworkSignal(error: unknown, message: string): boolean {
  const transientCodes = /\b(?:ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN)\b/i;
  if (transientCodes.test(message)) {
    return true;
  }
  const code = readErrorCode(error);
  if (code && transientCodes.test(code)) {
    return true;
  }
  const cause = readErrorCause(error);
  if (!cause || cause === error) {
    return false;
  }
  const causeCode = readErrorCode(cause);
  if (causeCode && transientCodes.test(causeCode)) {
    return true;
  }
  const causeMessage = formatErrorMessage(cause);
  return transientCodes.test(causeMessage);
}

function hasTimeoutSignal(error: unknown, message: string): boolean {
  if (isTimeoutNamedError(error)) {
    return true;
  }
  if (/\b(?:request timeout|provider timeout|timed out|timeout)\b/i.test(message)) {
    return true;
  }
  const cause = readErrorCause(error);
  if (!cause || cause === error) {
    return false;
  }
  if (isTimeoutNamedError(cause)) {
    return true;
  }
  return /\b(?:request timeout|provider timeout|timed out|timeout)\b/i.test(
    formatErrorMessage(cause),
  );
}

/**
 * 判断错误是否为瞬态错误（值得重试的错误）
 *
 * 瞬态错误包括：
 * - HTTP 5xx 错误（500/502/503/504）
 * - 网络错误（ECONNRESET/ECONNREFUSED/ETIMEDOUT/EAI_AGAIN）
 * - 超时错误（TimeoutError/RequestTimeoutError）
 *
 * 非瞬态错误（不重试）：
 * - HTTP 4xx 错误（400/401/403/404）
 * - 认证错误（invalid api key）
 * - 模型不存在（model not found）
 * - 参数校验错误（validation）
 */
export function isTransientProviderOperationError(error: unknown, message: string): boolean {
  const status = readErrorStatus(error);
  if (status !== undefined) {
    return status === 500 || status === 502 || status === 503 || status === 504;
  }
  if (
    /\b(?:HTTP\s*)?(?:400|401|403|404)\b/i.test(message) ||
    /\b(?:invalid api key|permission denied|model not found|validation|unsupported model)\b/i.test(
      message,
    )
  ) {
    return false;
  }
  if (/\b(?:HTTP\s*)?(?:500|502|503|504)\b/i.test(message)) {
    return true;
  }
  if (hasTransientNetworkSignal(error, message)) {
    return true;
  }
  if (hasTimeoutSignal(error, message)) {
    return true;
  }
  if (/\bfetch failed\b/i.test(message)) {
    return hasTransientNetworkSignal(error, message);
  }
  return false;
}

/** 解析实际的尝试次数，至少为 1 次 */
export function resolveTransientProviderAttempts(options?: TransientProviderRetryOptions): number {
  if (!options) {
    return 1;
  }
  return Math.max(1, Math.round(Number.isFinite(options.attempts) ? options.attempts : 1));
}

/**
 * 计算第 N 次重试的延迟时间（指数退避算法）
 * 公式：min(maxDelay, baseDelay * 2^(attemptNumber - 1))
 * 例如：baseDelay=250ms 时，延迟序列为 250, 500, 1000, 1000, ...
 */
export function resolveTransientProviderDelayMs(
  options: TransientProviderRetryOptions,
  attemptNumber: number,
): number {
  const rawBaseDelayMs = options.baseDelayMs ?? 250;
  const baseDelayMs = Math.max(
    0,
    Math.round(Number.isFinite(rawBaseDelayMs) ? rawBaseDelayMs : 250),
  );
  const rawMaxDelayMs = options.maxDelayMs ?? 1_000;
  const maxDelayMs = Math.max(
    baseDelayMs,
    Math.round(Number.isFinite(rawMaxDelayMs) ? rawMaxDelayMs : 1_000),
  );
  return Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(attemptNumber - 1, 0));
}

/**
 * 判断是否应该使用同一 API Key 重试操作
 *
 * 不重试的条件：
 * - 已达到最大尝试次数
 * - 操作已被中止（signal.aborted）
 * - shouldRetry 回调返回 false
 * - 错误不是瞬态错误
 */
export function shouldRetrySameKeyProviderOperation(params: {
  options: TransientProviderRetryOptions;
  error: unknown;
  message: string;
  provider: string;
  apiKeyIndex: number;
  attemptNumber: number;
  maxAttempts: number;
  stage?: ProviderOperationRetryStage;
}): boolean {
  if (params.attemptNumber >= params.maxAttempts) {
    return false;
  }
  if (params.options.signal?.aborted) {
    return false;
  }
  const retryParams: TransientProviderRetryParams = {
    error: params.error,
    message: params.message,
    provider: params.provider,
    apiKeyIndex: params.apiKeyIndex,
    attemptNumber: params.attemptNumber,
    ...(params.stage ? { stage: params.stage } : {}),
  };
  return params.options.shouldRetry
    ? params.options.shouldRetry(retryParams)
    : isTransientProviderOperationError(params.error, params.message);
}

/**
 * 执行带有自动重试的 Provider 操作
 *
 * 这是重试机制的主入口函数，封装了整个重试循环：
 * 1. 解析重试配置
 * 2. 执行操作
 * 3. 如果失败且可重试，等待后重试
 * 4. 如果所有重试都失败，抛出最后一个错误
 *
 * @param params.provider - Provider ID（用于日志和重试回调）
 * @param params.stage - 操作阶段（用于确定默认重试策略）
 * @param params.operation - 要执行的异步操作
 * @param params.retry - 可选的重试配置覆盖
 * @returns 操作结果
 * @throws 如果操作最终失败，抛出最后一个错误
 */
export async function executeProviderOperationWithRetry<T>(params: {
  provider: string;
  stage: ProviderOperationRetryStage;
  operation: () => Promise<T>;
  retry?: TransientProviderRetryConfig;
}): Promise<T> {
  const retryConfig = providerOperationRetryConfig(params.stage, params.retry);
  const retryOptions = resolveTransientProviderRetryOptions(retryConfig);
  const maxAttempts = resolveTransientProviderAttempts(retryOptions);
  let lastError: unknown;

  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    try {
      return await params.operation();
    } catch (error) {
      lastError = error;
      const message = formatErrorMessage(error);
      if (
        !retryOptions ||
        !shouldRetrySameKeyProviderOperation({
          options: retryOptions,
          error,
          message,
          provider: params.provider,
          apiKeyIndex: 0,
          attemptNumber,
          maxAttempts,
          stage: params.stage,
        })
      ) {
        throw error;
      }

      const delayMs = resolveTransientProviderDelayMs(retryOptions, attemptNumber);
      const sleep = retryOptions.sleep ?? sleepWithAbort;
      await sleep(delayMs, retryOptions.signal);
    }
  }

  throw lastError;
}
