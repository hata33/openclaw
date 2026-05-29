/**
 * DeepSeek 流式处理包装器
 *
 * 本文件为 DeepSeek V4 模型提供流式响应的 Thinking（推理）包装器。
 * 当模型是 DeepSeek V4 系列时，流式输出会被包装以支持推理内容的分离和展示。
 *
 * 工作原理：
 * 1. 判断当前模型是否为 DeepSeek V4 模型（通过 isDeepSeekV4ModelRef）
 * 2. 如果是，则使用 createDeepSeekV4OpenAICompatibleThinkingWrapper 包装基础流函数
 * 3. 包装后的流函数会将推理内容（thinking）和普通文本内容分离输出
 *
 * 这使得 DeepSeek 的深度推理能力可以在 UI 中以折叠/展开的形式展示。
 */
import type { ProviderWrapStreamFnContext } from "openclaw/plugin-sdk/plugin-entry";
import { createDeepSeekV4OpenAICompatibleThinkingWrapper } from "openclaw/plugin-sdk/provider-stream-shared";
import { isDeepSeekV4ModelRef } from "./models.js";

export function createDeepSeekV4ThinkingWrapper(
  baseStreamFn: ProviderWrapStreamFnContext["streamFn"],
  thinkingLevel: ProviderWrapStreamFnContext["thinkingLevel"],
): ProviderWrapStreamFnContext["streamFn"] {
  return createDeepSeekV4OpenAICompatibleThinkingWrapper({
    baseStreamFn,
    thinkingLevel,
    shouldPatchModel: isDeepSeekV4ModelRef,
  });
}
