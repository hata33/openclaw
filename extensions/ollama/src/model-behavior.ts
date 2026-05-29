/**
 * Ollama 模型行为判断
 *
 * 本文件提供 Ollama 模型的特殊行为判断函数。
 * 目前主要用于判断是否需要为 Moonshot（Kimi）模型包装思考逻辑。
 *
 * 当通过 Ollama 运行 Kimi 云端模型时，需要特殊的流式处理包装器
 * 来正确解析 Kimi 的内联推理格式。
 */
import { isOllamaCloudKimiModelRef } from "./sanitizers/kimi-inline-reasoning.js";

export function shouldWrapOllamaCompatMoonshotThinking(modelId: string): boolean {
  return isOllamaCloudKimiModelRef(modelId);
}
