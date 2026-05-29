/**
 * Ollama 模型 ID 规范化
 *
 * 本文件处理 Ollama 模型 ID 的规范化，移除 Provider 前缀。
 * Ollama API 接受的模型 ID 不包含 Provider 前缀（如 "ollama/gemma4" → "gemma4"），
 * 但 OpenClaw 内部使用完整引用格式（provider/modelId）。
 *
 * normalizeOllamaWireModelId 函数：
 * - 移除 Provider 前缀（ollama/、my-ollama/ 等）
 * - 支持多个候选前缀，兼容自定义 Provider ID
 * - 返回 Ollama API 可接受的纯模型名称
 */
import { normalizeProviderId } from "openclaw/plugin-sdk/provider-model-shared";
import { uniqueStrings } from "openclaw/plugin-sdk/string-coerce-runtime";

const OLLAMA_PROVIDER_ID = "ollama";

function uniqueModelPrefixCandidates(providerId?: string): string[] {
  const candidates = [providerId, normalizeProviderId(providerId ?? ""), OLLAMA_PROVIDER_ID]
    .map((candidate) => candidate?.trim())
    .filter((candidate): candidate is string => Boolean(candidate));
  return uniqueStrings(candidates);
}

export function normalizeOllamaWireModelId(modelId: string, providerId?: string): string {
  const trimmed = modelId.trim();
  if (!trimmed) {
    return trimmed;
  }
  for (const candidate of uniqueModelPrefixCandidates(providerId)) {
    const prefix = `${candidate}/`;
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }
  return trimmed;
}
