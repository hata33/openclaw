/**
 * Kimi 内联推理清洗器
 *
 * 本文件处理 Moonshot Kimi 模型在 Ollama 云端的特殊输出格式。
 * Kimi 模型会将推理过程和最终答案以特殊格式混合在可见文本中，
 * 而不是使用标准的 thinking/reasoning 字段。
 *
 * 格式特点：
 * - 推理内容和答案之间使用 \uFE0F（变体选择器）分隔
 * - 推理过程在前，答案在后
 * - 需要等待足够长的前缀才能判断是否包含内联推理
 *
 * 处理策略：
 * 1. 流式阶段：等待足够字符（最多 512 字符）再判断是否有推理边界
 * 2. 检测到边界后，提取边界后的文本作为最终答案
 * 3. 如果前缀太短（< 80 字符），认为整个文本都是答案
 * 4. 最终阶段：始终返回完整文本，避免丢失内容
 */
import { normalizeLowercaseStringOrEmpty } from "openclaw/plugin-sdk/string-coerce-runtime";
import type {
  OllamaVisibleContentSanitizer,
  OllamaVisibleContentStreamResolution,
} from "./visible-content-contract.js";

const INLINE_REASONING_MIN_PREFIX_CHARS = 80;
const INLINE_REASONING_MAX_PENDING_CHARS = 512;
const INLINE_REASONING_BOUNDARY_RE = /(^|\s)\uFE0F\s*/u;

type InlineReasoningVisibleTextResolution =
  | { kind: "visible"; text: string; bypassInlineReasoning?: boolean }
  | { kind: "pending" };

export function isOllamaCloudKimiModelRef(modelId: string): boolean {
  const normalizedModelId = normalizeLowercaseStringOrEmpty(modelId);
  const slashIndex = normalizedModelId.indexOf("/");
  const normalizedWireModelId =
    slashIndex === -1 ? normalizedModelId : normalizedModelId.slice(slashIndex + 1);
  return normalizedWireModelId.startsWith("kimi-k") && normalizedWireModelId.includes(":cloud");
}

function resolveInlineReasoningVisibleText(params: {
  text: string;
  final: boolean;
}): InlineReasoningVisibleTextResolution {
  const match = INLINE_REASONING_BOUNDARY_RE.exec(params.text);
  if (!match) {
    if (!params.final && params.text.length <= INLINE_REASONING_MAX_PENDING_CHARS) {
      return { kind: "pending" };
    }
    return {
      kind: "visible",
      text: params.text,
      bypassInlineReasoning:
        !params.final && params.text.length > INLINE_REASONING_MAX_PENDING_CHARS,
    };
  }

  const boundaryStartIndex = match.index + match[1].length;
  const boundaryEndIndex = match.index + match[0].length;
  const prefix = params.text.slice(0, boundaryStartIndex).trim();
  const answer = params.text.slice(boundaryEndIndex).trim();
  if (prefix.length >= INLINE_REASONING_MIN_PREFIX_CHARS) {
    return { kind: "visible", text: answer };
  }

  return params.final ? { kind: "visible", text: params.text } : { kind: "pending" };
}

export function createKimiInlineReasoningSanitizer(): OllamaVisibleContentSanitizer {
  let bypassInlineReasoning = false;

  return {
    resolveStreamText(params): OllamaVisibleContentStreamResolution {
      if (bypassInlineReasoning) {
        return { kind: "visible", text: params.text };
      }

      const resolution = resolveInlineReasoningVisibleText(params);
      if (resolution.kind === "pending") {
        return resolution;
      }
      if (resolution.bypassInlineReasoning) {
        bypassInlineReasoning = true;
      }
      return { kind: "visible", text: resolution.text };
    },
    sanitizeFinalText(text) {
      const resolution = resolveInlineReasoningVisibleText({ text, final: true });
      return resolution.kind === "visible" ? resolution.text : text;
    },
  };
}
