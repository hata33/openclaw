/**
 * 阿里巴巴（Alibaba Model Studio）Provider 入口文件
 *
 * 本文件注册阿里巴巴的视频生成提供者插件。
 * 阿里巴巴通过 DashScope 平台提供 AI 视频生成服务（万相系列模型）。
 *
 * 注意：阿里巴巴在此仅注册视频生成能力，不注册通用的文本推理 Provider。
 * 文本推理功能由 qwen（通义千问）扩展提供。
 */
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { buildAlibabaVideoGenerationProvider } from "./video-generation-provider.js";

export default definePluginEntry({
  id: "alibaba",
  name: "Alibaba Model Studio Plugin",
  description: "Bundled Alibaba Model Studio video provider plugin",
  register(api) {
    api.registerVideoGenerationProvider(buildAlibabaVideoGenerationProvider());
  },
});
