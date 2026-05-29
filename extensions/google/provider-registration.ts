/**
 * Google Provider 注册模块
 *
 * 本文件构建并注册 Google Gemini 提供者插件，是 Google Provider 的核心注册入口。
 *
 * 提供者配置：
 * - id: "google"，支持别名 "google-antigravity" 和 "google-vertex"
 * - 认证方式：API Key（GEMINI_API_KEY 或 GOOGLE_API_KEY）
 * - 默认模型：google/gemini-3.1-pro-preview
 * - 支持两种传输协议：google-generative-ai 和 google-vertex
 *
 * 注册的关键功能：
 * - normalizeTransport: 根据 API 和 baseUrl 判断使用哪种传输协议
 * - normalizeConfig: 规范化 Provider 配置
 * - normalizeModelId: 规范化模型 ID（处理旧名称映射）
 * - resolveDynamicModel: 前向兼容新模型的解析
 * - createStreamFn: 根据传输协议创建对应的流式处理函数
 * - isModernModelRef: 判断是否为现代 Gemini 模型
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { createProviderApiKeyAuthMethod } from "openclaw/plugin-sdk/provider-auth-api-key";
import type { ProviderPlugin } from "openclaw/plugin-sdk/provider-model-shared";
import { normalizeGoogleModelId } from "./model-id.js";
import { GOOGLE_GEMINI_DEFAULT_MODEL, applyGoogleGeminiModelDefault } from "./onboard.js";
import { GOOGLE_GEMINI_PROVIDER_HOOKS } from "./provider-hooks.js";
import { isModernGoogleModel, resolveGoogleGeminiForwardCompatModel } from "./provider-models.js";
import {
  normalizeGoogleProviderConfig,
  resolveGoogleGenerativeAiTransport,
} from "./provider-policy.js";
import {
  createGoogleGenerativeAiTransportStreamFn,
  createGoogleVertexTransportStreamFn,
} from "./transport-stream.js";

export function buildGoogleProvider(): ProviderPlugin {
  return {
    id: "google",
    label: "Google AI Studio",
    docsPath: "/providers/models",
    hookAliases: ["google-antigravity", "google-vertex"],
    envVars: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    auth: [
      createProviderApiKeyAuthMethod({
        providerId: "google",
        methodId: "api-key",
        label: "Google Gemini API key",
        hint: "AI Studio / Gemini API key",
        optionKey: "geminiApiKey",
        flagName: "--gemini-api-key",
        envVar: "GEMINI_API_KEY",
        promptMessage: "Enter Gemini API key",
        defaultModel: GOOGLE_GEMINI_DEFAULT_MODEL,
        expectedProviders: ["google"],
        applyConfig: (cfg) => applyGoogleGeminiModelDefault(cfg).next,
        wizard: {
          choiceId: "gemini-api-key",
          choiceLabel: "Google Gemini API key",
          groupId: "google",
          groupLabel: "Google",
          groupHint: "Gemini API key + OAuth",
        },
      }),
    ],
    normalizeTransport: ({ api, baseUrl }) => resolveGoogleGenerativeAiTransport({ api, baseUrl }),
    normalizeConfig: ({ provider, providerConfig }) =>
      normalizeGoogleProviderConfig(provider, providerConfig),
    normalizeModelId: ({ modelId }) => normalizeGoogleModelId(modelId),
    resolveDynamicModel: (ctx) =>
      resolveGoogleGeminiForwardCompatModel({
        providerId: ctx.provider,
        ctx,
      }),
    createStreamFn: ({ model }) => {
      if (model.api === "google-generative-ai") {
        return createGoogleGenerativeAiTransportStreamFn();
      }
      if (model.api === "google-vertex") {
        return createGoogleVertexTransportStreamFn();
      }
      return undefined;
    },
    ...GOOGLE_GEMINI_PROVIDER_HOOKS,
    isModernModelRef: ({ modelId }) => isModernGoogleModel(modelId),
  };
}

export function registerGoogleProvider(api: OpenClawPluginApi) {
  api.registerProvider(buildGoogleProvider());
}
