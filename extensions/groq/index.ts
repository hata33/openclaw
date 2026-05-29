/**
 * Groq Provider 入口文件
 *
 * 本文件注册 Groq 提供者插件：
 * 1. 注册 Groq 为通用文本推理 Provider，使用环境变量 GROQ_API_KEY 认证
 * 2. 注册媒体理解提供者（音频转录，基于 Whisper）
 * 3. 配置模型兼容性贡献函数，为特定模型添加推理参数支持
 *
 * Groq 以超快推理速度著称，使用自研的 LPU 硬件加速器。
 * 提供者使用 OpenAI 兼容的 API 格式。
 */
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { contributeGroqResolvedModelCompat } from "./api.js";
import { groqMediaUnderstandingProvider } from "./media-understanding-provider.js";

export default definePluginEntry({
  id: "groq",
  name: "Groq Provider",
  description: "Bundled Groq provider plugin",
  register(api) {
    api.registerProvider({
      id: "groq",
      label: "Groq",
      docsPath: "/providers/groq",
      envVars: ["GROQ_API_KEY"],
      auth: [],
      contributeResolvedModelCompat: ({ modelId, model }) =>
        contributeGroqResolvedModelCompat({ modelId, model }),
    });
    api.registerMediaUnderstandingProvider(groqMediaUnderstandingProvider);
  },
});
