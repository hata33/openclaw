/**
 * @fileoverview OpenAI 扩展插件入口
 *
 * 这是 OpenAI 扩展的主入口文件，负责注册所有 OpenAI 相关的 Provider 到 OpenClaw 系统中。
 * 通过 definePluginEntry 定义插件元数据和注册逻辑。
 *
 * 注册的 Provider 包括：
 * 1. OpenAI 直连 Provider（openai-provider.ts）- 标准 OpenAI API 模型
 * 2. OpenAI Codex Provider（openai-codex-provider.ts）- Codex 运行时模型
 * 3. 记忆嵌入 Provider - 文本向量化
 * 4. 图片生成 Provider - DALL-E / gpt-image 系列
 * 5. 实时转录 Provider - 语音实时转文字
 * 6. 实时语音 Provider - 双向语音对话
 * 7. 语音合成 Provider - 文字转语音（TTS）
 * 8. 媒体理解 Provider - 图片/音频内容理解
 * 9. 视频生成 Provider - Sora 视频生成
 *
 * 关键设计：
 * - 使用 buildProviderWithPromptContribution 包装器为每个 Provider 附加系统提示增强能力
 * - 通过 buildProviderToolCompatFamilyHooks 为所有 "openai" 家族 Provider 添加工具兼容性钩子
 * - 系统提示贡献（Prompt Overlay）仅对 GPT-5 系列模型生效
 */

import { resolvePluginConfigObject } from "openclaw/plugin-sdk/plugin-config-runtime";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { buildProviderToolCompatFamilyHooks } from "openclaw/plugin-sdk/provider-tools";
import { buildOpenAIImageGenerationProvider } from "./image-generation-provider.js";
import {
  openaiCodexMediaUnderstandingProvider,
  openaiMediaUnderstandingProvider,
} from "./media-understanding-provider.js";
import { openAiMemoryEmbeddingProviderAdapter } from "./memory-embedding-adapter.js";
import { buildOpenAICodexProviderPlugin } from "./openai-codex-provider.js";
import { buildOpenAIProvider } from "./openai-provider.js";
import {
  resolveOpenAIPromptOverlayMode,
  resolveOpenAISystemPromptContribution,
} from "./prompt-overlay.js";
import { buildOpenAIRealtimeTranscriptionProvider } from "./realtime-transcription-provider.js";
import { buildOpenAIRealtimeVoiceProvider } from "./realtime-voice-provider.js";
import { buildOpenAISpeechProvider } from "./speech-provider.js";
import { buildOpenAIVideoGenerationProvider } from "./video-generation-provider.js";

export default definePluginEntry({
  id: "openai",
  name: "OpenAI Provider",
  description: "Bundled OpenAI provider plugins",
  register(api) {
    /** 为 "openai" 家族的所有 Provider 构建工具兼容性钩子 */
    const openAIToolCompatHooks = buildProviderToolCompatFamilyHooks("openai");

    /**
     * 包装 Provider，附加系统提示贡献能力
     *
     * 这个高阶函数将 Prompt Overlay 机制注入到每个 Provider 中：
     * 1. 复制工具兼容性钩子
     * 2. 添加 resolveSystemPromptContribution 方法
     * 3. 该方法根据当前模型和配置决定是否注入额外的系统提示
     */
    const buildProviderWithPromptContribution = <T extends ReturnType<typeof buildOpenAIProvider>>(
      provider: T,
    ): T => ({
      ...provider,
      ...openAIToolCompatHooks,
      resolveSystemPromptContribution: (ctx) => {
        // 解析运行时插件配置，支持动态配置覆盖
        const runtimePluginConfig = resolvePluginConfigObject(ctx.config, "openai");
        // 回退逻辑：若无运行时配置且无显式配置，使用插件注册时的默认配置
        const pluginConfig =
          runtimePluginConfig ??
          (ctx.config ? undefined : (api.pluginConfig as Record<string, unknown>));
        return resolveOpenAISystemPromptContribution({
          config: ctx.config,
          legacyPluginConfig: pluginConfig,
          mode: resolveOpenAIPromptOverlayMode(pluginConfig),
          modelProviderId: provider.id,
          modelId: ctx.modelId,
          trigger: ctx.trigger,
        });
      },
    });

    // 注册核心 LLM Provider（直连 + Codex）
    api.registerProvider(buildProviderWithPromptContribution(buildOpenAIProvider()));
    api.registerProvider(buildProviderWithPromptContribution(buildOpenAICodexProviderPlugin()));

    // 注册专用能力 Provider
    api.registerMemoryEmbeddingProvider(openAiMemoryEmbeddingProviderAdapter);
    api.registerImageGenerationProvider(buildOpenAIImageGenerationProvider());
    api.registerRealtimeTranscriptionProvider(buildOpenAIRealtimeTranscriptionProvider());
    api.registerRealtimeVoiceProvider(buildOpenAIRealtimeVoiceProvider());
    api.registerSpeechProvider(buildOpenAISpeechProvider());

    // 注册媒体理解 Provider（OpenAI 直连 + Codex 各一个）
    api.registerMediaUnderstandingProvider(openaiMediaUnderstandingProvider);
    api.registerMediaUnderstandingProvider(openaiCodexMediaUnderstandingProvider);

    api.registerVideoGenerationProvider(buildOpenAIVideoGenerationProvider());
  },
});
