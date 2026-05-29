/**
 * Groq 媒体理解提供者（音频转录）
 *
 * 本文件实现 Groq 的音频转录功能，基于 Whisper 模型：
 * 1. 使用 Groq 托管的 whisper-large-v3-turbo 模型
 * 2. 通过 OpenAI 兼容的音频转录 API 执行
 * 3. 音频能力自动优先级为 20，在多个音频提供者中排序使用
 *
 * Groq 的 Whisper 实现因 LPU 加速而具有极低的转录延迟。
 */
import {
  transcribeOpenAiCompatibleAudio,
  type MediaUnderstandingProvider,
} from "openclaw/plugin-sdk/media-understanding";

const DEFAULT_GROQ_AUDIO_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_GROQ_AUDIO_MODEL = "whisper-large-v3-turbo";

export const groqMediaUnderstandingProvider: MediaUnderstandingProvider = {
  id: "groq",
  capabilities: ["audio"],
  defaultModels: { audio: DEFAULT_GROQ_AUDIO_MODEL },
  autoPriority: { audio: 20 },
  transcribeAudio: (req) =>
    transcribeOpenAiCompatibleAudio({
      ...req,
      baseUrl: req.baseUrl ?? DEFAULT_GROQ_AUDIO_BASE_URL,
      defaultBaseUrl: DEFAULT_GROQ_AUDIO_BASE_URL,
      defaultModel: DEFAULT_GROQ_AUDIO_MODEL,
    }),
};
