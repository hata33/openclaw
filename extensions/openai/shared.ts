/**
 * @fileoverview OpenAI 共享工具模块
 *
 * 提供 OpenAI 和 Codex Provider 共用的核心工具函数和钩子构建器。
 * 这是 OpenAI 扩展中被多个 Provider 模块引用的基础设施层。
 *
 * 主要职责：
 * 1. Responses API 传输钩子构建（buildOpenAIResponsesProviderHooks）
 *    - 统一配置流式响应、传输策略、WebSocket 会话等
 *    - 被 openai-provider.ts 和 openai-codex-provider.ts 共同使用
 *
 * 2. 模型目录合成（buildOpenAISyntheticCatalogEntry）
 *    - 基于模板模型生成新的目录条目
 *    - 用于在运行时动态添加尚未在静态目录中定义的新模型
 *
 * 3. 工具函数
 *    - toOpenAIDataUrl: Buffer 转 data URL
 *    - resolveConfiguredOpenAIBaseUrl: 解析配置中的 API 基础 URL
 *    - 重新导出常用的模型匹配和模板克隆工具
 */

import type { OpenClawConfig } from "openclaw/plugin-sdk/config-contracts";
import { findCatalogTemplate } from "openclaw/plugin-sdk/provider-catalog-shared";
import {
  cloneFirstTemplateModel,
  matchesExactOrPrefix,
  type ProviderPlugin,
} from "openclaw/plugin-sdk/provider-model-shared";
import { OPENAI_RESPONSES_STREAM_HOOKS } from "openclaw/plugin-sdk/provider-stream-family";
import { normalizeOptionalString } from "openclaw/plugin-sdk/string-coerce-runtime";
import { createOpenAINativeWebSearchWrapper } from "./native-web-search.js";
import { buildOpenAIReplayPolicy } from "./replay-policy.js";
import {
  resolveOpenAITransportTurnState,
  resolveOpenAIWebSocketSessionPolicy,
} from "./transport-policy.js";

/** 合成模型目录条目的成本结构（每百万 token 的美元价格） */
type SyntheticOpenAIModelCatalogCost = {
  input: number;       // 输入 token 价格
  output: number;      // 输出 token 价格
  cacheRead: number;   // 缓存读取价格
  cacheWrite: number;  // 缓存写入价格
};

/** 合成模型目录条目的完整结构 */
type SyntheticOpenAIModelCatalogEntry = {
  provider: string;
  id: string;
  name: string;
  reasoning?: boolean;              // 是否支持推理模式
  input?: ("text" | "image")[];     // 支持的输入模态
  contextWindow?: number;           // 上下文窗口大小
  contextTokens?: number;           // 运行时上下文 token 限制
  cost?: SyntheticOpenAIModelCatalogCost;
};

/** OpenAI 官方 API 基础 URL */
const OPENAI_API_BASE_URL = "https://api.openai.com/v1";

/**
 * 将 Buffer 转换为 data URL 格式
 *
 * 用于在 HTTP 请求中内联传输二进制数据（如图片），避免文件上传的复杂性。
 * 格式：data:<mimeType>;base64,<base64EncodedData>
 *
 * @param buffer - 二进制数据
 * @param mimeType - MIME 类型
 * @returns data URL 字符串
 */
export function toOpenAIDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

/**
 * 从配置中解析 OpenAI API 基础 URL
 *
 * 优先使用用户配置的自定义 URL，未配置时回退到官方 API 端点。
 * 这允许用户通过配置使用自定义代理或 Azure OpenAI 端点。
 *
 * @param cfg - OpenClaw 配置对象
 * @returns 解析后的基础 URL
 */
export function resolveConfiguredOpenAIBaseUrl(cfg: OpenClawConfig | undefined): string {
  return normalizeOptionalString(cfg?.models?.providers?.openai?.baseUrl) ?? OPENAI_API_BASE_URL;
}

/**
 * 判断给定的传输方式是否为 OpenAI Responses API 支持的传输方式
 */
function hasSupportedOpenAIResponsesTransport(
  transport: unknown,
): transport is "auto" | "sse" | "websocket" {
  return transport === "auto" || transport === "sse" || transport === "websocket";
}

/**
 * 为 Responses API 请求设置默认的额外参数
 *
 * 如果用户未显式指定传输方式，自动设置为 "auto"（由 SDK 自动选择最优传输）。
 * 这确保了 Responses API 的传输配置始终有效。
 */
function defaultOpenAIResponsesExtraParams(
  extraParams: Record<string, unknown> | undefined,
  options?: { transport?: "auto" | "sse" | "websocket" },
): Record<string, unknown> | undefined {
  const hasSupportedTransport = hasSupportedOpenAIResponsesTransport(extraParams?.transport);
  const defaultTransport = options?.transport ?? "auto";
  if (hasSupportedTransport) {
    return extraParams;
  }

  return {
    ...extraParams,
    transport: defaultTransport,
  };
}

/** OpenAI Responses Provider 钩子类型定义 */
type OpenAIResponsesProviderHooks = Pick<
  ProviderPlugin,
  | "buildReplayPolicy"
  | "prepareExtraParams"
  | "wrapStreamFn"
  | "resolveTransportTurnState"
  | "resolveWebSocketSessionPolicy"
>;

/** 传输轮次状态解析钩子，委托给 transport-policy.ts */
const resolveOpenAIResponsesTransportTurnState: NonNullable<
  OpenAIResponsesProviderHooks["resolveTransportTurnState"]
> = (ctx) => resolveOpenAITransportTurnState(ctx);

/** WebSocket 会话策略解析钩子，委托给 transport-policy.ts */
const resolveOpenAIResponsesWebSocketSessionPolicy: NonNullable<
  OpenAIResponsesProviderHooks["resolveWebSocketSessionPolicy"]
> = (ctx) => resolveOpenAIWebSocketSessionPolicy(ctx);

/** SDK 提供的 Responses 流式响应钩子 */
const wrapOpenAIResponsesStreamFn = OPENAI_RESPONSES_STREAM_HOOKS.wrapStreamFn;

/**
 * 包装后的流式响应函数，在 SDK 基础流式钩子之上叠加原生 Web 搜索支持。
 * 当模型和配置满足条件时，自动注入 web_search 工具到请求中。
 */
const wrapOpenAIResponsesProviderStreamFn: NonNullable<
  OpenAIResponsesProviderHooks["wrapStreamFn"]
> = (ctx) =>
  createOpenAINativeWebSearchWrapper(wrapOpenAIResponsesStreamFn?.(ctx) ?? ctx.streamFn, {
    config: ctx.config,
  });

/**
 * 构建 OpenAI Responses API 的 Provider 钩子集合
 *
 * 这是 OpenAI 和 Codex Provider 共享的钩子构建器，提供：
 * - 重放策略：处理请求失败后的重试逻辑
 * - 额外参数：设置默认的传输方式
 * - 流式响应：带原生 Web 搜索的流式包装
 * - 传输状态：请求级别的追踪信息
 * - WebSocket 策略：长连接的降级和重连策略
 *
 * @param options.transport - 可选的传输方式覆盖（默认 "auto"）
 * @returns 完整的 Provider 钩子集合
 */
export function buildOpenAIResponsesProviderHooks(options?: {
  transport?: "auto" | "sse" | "websocket";
}): OpenAIResponsesProviderHooks {
  return {
    buildReplayPolicy: buildOpenAIReplayPolicy,
    prepareExtraParams: (ctx) => defaultOpenAIResponsesExtraParams(ctx.extraParams, options),
    ...OPENAI_RESPONSES_STREAM_HOOKS,
    wrapStreamFn: wrapOpenAIResponsesProviderStreamFn,
    resolveTransportTurnState: resolveOpenAIResponsesTransportTurnState,
    resolveWebSocketSessionPolicy: resolveOpenAIResponsesWebSocketSessionPolicy,
  };
}

/**
 * 构建合成的模型目录条目
 *
 * 基于已有的模板模型（从目录中查找），生成具有新属性的模型条目。
 * 用于在运行时动态添加新模型（如 gpt-5.4、gpt-5.5 等），
 * 这些模型可能尚未在静态目录中定义，但可以基于现有模型模板推导。
 *
 * 工作原理：
 * 1. 从目录中查找与 templateIds 匹配的模板模型
 * 2. 克隆模板的通用属性（如 Provider 配置、端点等）
 * 3. 用 entry 参数覆盖特定属性（如模型 ID、上下文窗口、成本等）
 *
 * @param template - 从目录中查找的模板模型（undefined 表示未找到）
 * @param entry - 要覆盖的模型属性
 * @returns 合成的目录条目，模板不存在时返回 undefined
 */
export function buildOpenAISyntheticCatalogEntry(
  template: ReturnType<typeof findCatalogTemplate>,
  entry: {
    id: string;
    reasoning: boolean;
    input: readonly ("text" | "image")[];
    contextWindow: number;
    contextTokens?: number;
    cost?: SyntheticOpenAIModelCatalogCost;
  },
): SyntheticOpenAIModelCatalogEntry | undefined {
  if (!template) {
    return undefined;
  }
  return {
    ...template,
    id: entry.id,
    name: entry.id,
    reasoning: entry.reasoning,
    input: [...entry.input],
    contextWindow: entry.contextWindow,
    ...(entry.contextTokens === undefined ? {} : { contextTokens: entry.contextTokens }),
    ...(entry.cost === undefined ? {} : { cost: entry.cost }),
  };
}

// 重新导出常用的工具函数，方便其他模块引用
export { cloneFirstTemplateModel, findCatalogTemplate, matchesExactOrPrefix };
