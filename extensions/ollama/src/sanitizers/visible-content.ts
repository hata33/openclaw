/**
 * Ollama 可见内容清洗器
 *
 * 本文件是 Ollama 可见文本内容清洗的入口，根据模型类型选择合适的清洗器。
 *
 * 目前支持的清洗策略：
 * 1. Kimi 内联推理清洗器：处理 Kimi 云端模型的特殊输出格式
 * 2. 无操作清洗器（noop）：直接透传文本，不做任何处理
 *
 * createOllamaVisibleContentSanitizer 根据 modelId 选择清洗策略：
 * - 如果是 Kimi 云端模型（kimi-k*:cloud），使用内联推理清洗器
 * - 其他模型使用无操作清洗器
 */
import {
  createKimiInlineReasoningSanitizer,
  isOllamaCloudKimiModelRef,
} from "./kimi-inline-reasoning.js";
import type { OllamaVisibleContentSanitizer } from "./visible-content-contract.js";

const noopVisibleContentSanitizer: OllamaVisibleContentSanitizer = {
  resolveStreamText(params) {
    return { kind: "visible", text: params.text };
  },
  sanitizeFinalText(text) {
    return text;
  },
};

export function createOllamaVisibleContentSanitizer(
  modelId: string,
): OllamaVisibleContentSanitizer {
  if (isOllamaCloudKimiModelRef(modelId)) {
    return createKimiInlineReasoningSanitizer();
  }
  return noopVisibleContentSanitizer;
}

export function sanitizeOllamaFinalVisibleContent(params: {
  modelId: string;
  text: string;
}): string {
  return createOllamaVisibleContentSanitizer(params.modelId).sanitizeFinalText(params.text);
}
