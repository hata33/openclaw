/**
 * Google Plugin 入口文件
 *
 * 本文件是 Google 所有功能的插件注册入口，是功能最丰富的 Provider 插件之一。
 * 除了基础的文本生成外，还注册了大量多媒体和语音功能。
 *
 * 注册的功能模块：
 * 1. CLI 后端（Gemini CLI）：支持通过命令行直接调用 Gemini
 * 2. 文本生成提供者：核心的 LLM 推理能力
 * 3. 内存嵌入提供者：向量搜索和语义检索
 * 4. 图像生成提供者：文生图、图生图（支持多种尺寸和比例）
 * 5. 媒体理解提供者：图像/音频/视频理解和转录
 * 6. 音乐生成提供者：AI 音乐创作
 * 7. 实时语音提供者：实时语音对话（支持懒加载）
 * 8. 语音合成提供者：TTS
 * 9. 视频生成提供者：AI 视频创作
 * 10. 网页搜索提供者：通过 Gemini 进行网络搜索
 *
 * 所有多媒体功能使用懒加载（lazy loading）模式，
 * 只在首次使用时才加载对应的模块，减少启动时间。
 */
import type { ImageGenerationProvider } from "openclaw/plugin-sdk/image-generation";
import type { MediaUnderstandingProvider } from "openclaw/plugin-sdk/media-understanding";
import type { MusicGenerationProvider } from "openclaw/plugin-sdk/music-generation";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import type {
  RealtimeVoiceBridge,
  RealtimeVoiceBridgeCreateRequest,
  RealtimeVoiceProviderConfig,
  RealtimeVoiceProviderPlugin,
} from "openclaw/plugin-sdk/realtime-voice";
import { normalizeResolvedSecretInputString } from "openclaw/plugin-sdk/secret-input";
import { normalizeOptionalString } from "openclaw/plugin-sdk/string-coerce-runtime";
import type { VideoGenerationProvider } from "openclaw/plugin-sdk/video-generation";
import { buildGoogleGeminiCliBackend } from "./cli-backend.js";
import { registerGoogleGeminiCliProvider } from "./gemini-cli-provider.js";
import {
  createGoogleMusicGenerationProviderMetadata,
  createGoogleVideoGenerationProviderMetadata,
} from "./generation-provider-metadata.js";
import { geminiMemoryEmbeddingProviderAdapter } from "./memory-embedding-adapter.js";
import { registerGoogleProvider } from "./provider-registration.js";
import { buildGoogleSpeechProvider } from "./speech-provider.js";
import { createGeminiWebSearchProvider } from "./src/gemini-web-search-provider.js";

let googleImageGenerationProviderPromise: Promise<ImageGenerationProvider> | null = null;
let googleMediaUnderstandingProviderPromise: Promise<MediaUnderstandingProvider> | null = null;
let googleMusicGenerationProviderPromise: Promise<MusicGenerationProvider> | null = null;
let googleRealtimeVoiceProviderPromise: Promise<RealtimeVoiceProviderPlugin> | null = null;
let googleVideoGenerationProviderPromise: Promise<VideoGenerationProvider> | null = null;

type GoogleMediaUnderstandingProvider = Required<
  Pick<
    MediaUnderstandingProvider,
    "describeImage" | "describeImages" | "transcribeAudio" | "describeVideo"
  >
>;

async function loadGoogleImageGenerationProvider(): Promise<ImageGenerationProvider> {
  if (!googleImageGenerationProviderPromise) {
    googleImageGenerationProviderPromise = import("./image-generation-provider.js").then((mod) =>
      mod.buildGoogleImageGenerationProvider(),
    );
  }
  return await googleImageGenerationProviderPromise;
}

async function loadGoogleMediaUnderstandingProvider(): Promise<MediaUnderstandingProvider> {
  if (!googleMediaUnderstandingProviderPromise) {
    googleMediaUnderstandingProviderPromise = import("./media-understanding-provider.js").then(
      (mod) => mod.googleMediaUnderstandingProvider,
    );
  }
  return await googleMediaUnderstandingProviderPromise;
}

async function loadGoogleMusicGenerationProvider(): Promise<MusicGenerationProvider> {
  if (!googleMusicGenerationProviderPromise) {
    googleMusicGenerationProviderPromise = import("./music-generation-provider.js").then((mod) =>
      mod.buildGoogleMusicGenerationProvider(),
    );
  }
  return await googleMusicGenerationProviderPromise;
}

async function loadGoogleRealtimeVoiceProvider(): Promise<RealtimeVoiceProviderPlugin> {
  if (!googleRealtimeVoiceProviderPromise) {
    googleRealtimeVoiceProviderPromise = import("./realtime-voice-provider.js").then((mod) =>
      mod.buildGoogleRealtimeVoiceProvider(),
    );
  }
  return await googleRealtimeVoiceProviderPromise;
}

async function loadGoogleVideoGenerationProvider(): Promise<VideoGenerationProvider> {
  if (!googleVideoGenerationProviderPromise) {
    googleVideoGenerationProviderPromise = import("./video-generation-provider.js").then((mod) =>
      mod.buildGoogleVideoGenerationProvider(),
    );
  }
  return await googleVideoGenerationProviderPromise;
}

async function loadGoogleRequiredMediaUnderstandingProvider(): Promise<GoogleMediaUnderstandingProvider> {
  const provider = await loadGoogleMediaUnderstandingProvider();
  if (
    !provider.describeImage ||
    !provider.describeImages ||
    !provider.transcribeAudio ||
    !provider.describeVideo
  ) {
    throw new Error("google media understanding provider missing required handlers");
  }
  return provider as GoogleMediaUnderstandingProvider;
}

function createLazyGoogleImageGenerationProvider(): ImageGenerationProvider {
  return {
    id: "google",
    label: "Google",
    defaultModel: "gemini-3.1-flash-image-preview",
    models: ["gemini-3.1-flash-image-preview", "gemini-3-pro-image-preview"],
    capabilities: {
      generate: {
        maxCount: 4,
        supportsSize: true,
        supportsAspectRatio: true,
        supportsResolution: true,
      },
      edit: {
        enabled: true,
        maxCount: 4,
        maxInputImages: 5,
        supportsSize: true,
        supportsAspectRatio: true,
        supportsResolution: true,
      },
      geometry: {
        sizes: ["1024x1024", "1024x1536", "1536x1024", "1024x1792", "1792x1024"],
        aspectRatios: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
        resolutions: ["1K", "2K", "4K"],
      },
    },
    generateImage: async (req) => (await loadGoogleImageGenerationProvider()).generateImage(req),
  };
}

function createLazyGoogleMediaUnderstandingProvider(): MediaUnderstandingProvider {
  return {
    id: "google",
    capabilities: ["image", "audio", "video"],
    defaultModels: {
      image: "gemini-3-flash-preview",
      audio: "gemini-3-flash-preview",
      video: "gemini-3-flash-preview",
    },
    autoPriority: { image: 30, audio: 40, video: 10 },
    nativeDocumentInputs: ["pdf"],
    describeImage: async (...args) =>
      await (await loadGoogleRequiredMediaUnderstandingProvider()).describeImage(...args),
    describeImages: async (...args) =>
      await (await loadGoogleRequiredMediaUnderstandingProvider()).describeImages(...args),
    transcribeAudio: async (...args) =>
      await (await loadGoogleRequiredMediaUnderstandingProvider()).transcribeAudio(...args),
    describeVideo: async (...args) =>
      await (await loadGoogleRequiredMediaUnderstandingProvider()).describeVideo(...args),
  };
}

function createLazyGoogleMusicGenerationProvider(): MusicGenerationProvider {
  return {
    ...createGoogleMusicGenerationProviderMetadata(),
    generateMusic: async (...args) =>
      await (await loadGoogleMusicGenerationProvider()).generateMusic(...args),
  };
}

function resolveGoogleRealtimeProviderConfig(
  rawConfig: RealtimeVoiceProviderConfig,
  cfg?: { models?: { providers?: { google?: { apiKey?: unknown } } } },
): RealtimeVoiceProviderConfig {
  const providers =
    typeof rawConfig.providers === "object" &&
    rawConfig.providers !== null &&
    !Array.isArray(rawConfig.providers)
      ? (rawConfig.providers as Record<string, unknown>)
      : undefined;
  const nested = providers?.google;
  const raw =
    typeof nested === "object" && nested !== null && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : typeof rawConfig.google === "object" &&
          rawConfig.google !== null &&
          !Array.isArray(rawConfig.google)
        ? (rawConfig.google as Record<string, unknown>)
        : rawConfig;
  return {
    ...raw,
    ...(raw.apiKey === undefined
      ? cfg?.models?.providers?.google?.apiKey === undefined
        ? {}
        : {
            apiKey: normalizeResolvedSecretInputString({
              value: cfg.models.providers.google.apiKey,
              path: "models.providers.google.apiKey",
            }),
          }
      : {
          apiKey: normalizeResolvedSecretInputString({
            value: raw.apiKey,
            path: "plugins.entries.voice-call.config.realtime.providers.google.apiKey",
          }),
        }),
  };
}

function resolveGoogleRealtimeEnvApiKey(): string | undefined {
  return (
    normalizeOptionalString(process.env.GEMINI_API_KEY) ??
    normalizeOptionalString(process.env.GOOGLE_API_KEY)
  );
}

const GOOGLE_REALTIME_LAZY_MAX_PENDING_AUDIO_CHUNKS = 320;

function createLazyGoogleRealtimeVoiceBridge(
  req: RealtimeVoiceBridgeCreateRequest,
): RealtimeVoiceBridge {
  let bridge: RealtimeVoiceBridge | undefined;
  let bridgePromise: Promise<RealtimeVoiceBridge> | undefined;
  let closed = false;
  let latestMediaTimestamp: number | undefined;
  let pendingGreeting: string | undefined;
  const pendingAudio: Buffer[] = [];
  const pendingUserMessages: string[] = [];
  const loadBridge = async () => {
    if (!bridgePromise) {
      bridgePromise = loadGoogleRealtimeVoiceProvider().then((provider) =>
        provider.createBridge(req),
      );
    }
    bridge = await bridgePromise;
    return bridge;
  };
  const requireBridge = () => {
    if (!bridge) {
      throw new Error("Google realtime voice bridge is not connected");
    }
    return bridge;
  };
  const flushPending = (loadedBridge: RealtimeVoiceBridge) => {
    if (typeof latestMediaTimestamp === "number") {
      loadedBridge.setMediaTimestamp(latestMediaTimestamp);
    }
    for (const audio of pendingAudio.splice(0)) {
      loadedBridge.sendAudio(audio);
    }
    for (const text of pendingUserMessages.splice(0)) {
      loadedBridge.sendUserMessage?.(text);
    }
    if (pendingGreeting !== undefined) {
      const greeting = pendingGreeting;
      pendingGreeting = undefined;
      loadedBridge.triggerGreeting?.(greeting);
    }
  };
  return {
    supportsToolResultContinuation: true,
    connect: async () => {
      const loadedBridge = await loadBridge();
      if (closed) {
        loadedBridge.close();
        return;
      }
      await loadedBridge.connect();
      flushPending(loadedBridge);
    },
    sendAudio: (audio) => {
      if (bridge) {
        bridge.sendAudio(audio);
        return;
      }
      if (!closed) {
        if (pendingAudio.length >= GOOGLE_REALTIME_LAZY_MAX_PENDING_AUDIO_CHUNKS) {
          pendingAudio.shift();
        }
        pendingAudio.push(audio);
      }
    },
    setMediaTimestamp: (ts) => {
      latestMediaTimestamp = ts;
      bridge?.setMediaTimestamp(ts);
    },
    sendUserMessage: (text) => {
      if (bridge) {
        bridge.sendUserMessage?.(text);
        return;
      }
      if (!closed) {
        pendingUserMessages.push(text);
      }
    },
    triggerGreeting: (instructions) => {
      if (bridge) {
        bridge.triggerGreeting?.(instructions);
        return;
      }
      if (!closed) {
        pendingGreeting = instructions;
      }
    },
    handleBargeIn: (options) => requireBridge().handleBargeIn?.(options),
    submitToolResult: (callId, result, options) =>
      requireBridge().submitToolResult(callId, result, options),
    acknowledgeMark: () => requireBridge().acknowledgeMark(),
    close: () => {
      closed = true;
      pendingAudio.length = 0;
      pendingUserMessages.length = 0;
      pendingGreeting = undefined;
      bridge?.close();
    },
    isConnected: () => bridge?.isConnected() ?? false,
  };
}

function createLazyGoogleRealtimeVoiceProvider(): RealtimeVoiceProviderPlugin {
  return {
    id: "google",
    label: "Google Live Voice",
    autoSelectOrder: 20,
    resolveConfig: ({ cfg, rawConfig }) => resolveGoogleRealtimeProviderConfig(rawConfig, cfg),
    isConfigured: ({ cfg, providerConfig }) =>
      Boolean(
        normalizeOptionalString(providerConfig.apiKey) ??
        normalizeOptionalString(cfg?.models?.providers?.google?.apiKey) ??
        resolveGoogleRealtimeEnvApiKey(),
      ),
    createBridge: createLazyGoogleRealtimeVoiceBridge,
    createBrowserSession: async (req) => {
      const provider = await loadGoogleRealtimeVoiceProvider();
      if (!provider.createBrowserSession) {
        throw new Error("Google realtime voice browser sessions are unavailable");
      }
      return await provider.createBrowserSession(req);
    },
  };
}

function createLazyGoogleVideoGenerationProvider(): VideoGenerationProvider {
  return {
    ...createGoogleVideoGenerationProviderMetadata(),
    generateVideo: async (...args) =>
      await (await loadGoogleVideoGenerationProvider()).generateVideo(...args),
  };
}

export default definePluginEntry({
  id: "google",
  name: "Google Plugin",
  description: "Bundled Google plugin",
  register(api) {
    api.registerCliBackend(buildGoogleGeminiCliBackend());
    registerGoogleGeminiCliProvider(api);
    registerGoogleProvider(api);
    api.registerMemoryEmbeddingProvider(geminiMemoryEmbeddingProviderAdapter);
    api.registerImageGenerationProvider(createLazyGoogleImageGenerationProvider());
    api.registerMediaUnderstandingProvider(createLazyGoogleMediaUnderstandingProvider());
    api.registerMusicGenerationProvider(createLazyGoogleMusicGenerationProvider());
    api.registerRealtimeVoiceProvider(createLazyGoogleRealtimeVoiceProvider());
    api.registerSpeechProvider(buildGoogleSpeechProvider());
    api.registerVideoGenerationProvider(createLazyGoogleVideoGenerationProvider());
    api.registerWebSearchProvider(createGeminiWebSearchProvider());
  },
});
