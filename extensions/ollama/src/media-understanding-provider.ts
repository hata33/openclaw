/**
 * Ollama 媒体理解提供者
 *
 * 本文件注册 Ollama 的媒体理解能力，主要用于图像描述功能。
 *
 * 重要说明：
 * Ollama 的视觉支持取决于用户本地安装了哪些视觉模型（如 llava、
 * qwen2.5vl、llama3.2-vision 等），没有统一的默认视觉模型。
 *
 * 因此本提供者：
 * - 注册了图像描述能力（capabilities: ["image"]）
 * - 但未设置 defaultModels 和 autoPriority
 * - 只有当用户显式配置了 ollama/<vision-model> 时才会参与图像处理
 *
 * 这种设计避免了在没有视觉模型时误路由请求导致错误。
 */
import {
  describeImageWithModel,
  describeImagesWithModel,
  type MediaUnderstandingProvider,
} from "openclaw/plugin-sdk/media-understanding";
import { OLLAMA_PROVIDER_ID } from "./discovery-shared.js";

// Ollama vision support depends on which models the user has pulled (llava,
// qwen2.5vl, llama3.2-vision, …) — there is no single canonical default. We
// register the provider so the image tool can route `ollama/<vision-model>`
// requests, but leave `defaultModels` and `autoPriority` unset so Ollama
// only participates when the user explicitly configures an image model.
export const ollamaMediaUnderstandingProvider: MediaUnderstandingProvider = {
  id: OLLAMA_PROVIDER_ID,
  capabilities: ["image"],
  describeImage: describeImageWithModel,
  describeImages: describeImagesWithModel,
};
