/**
 * Ollama API 统一导出模块
 *
 * 本文件是 Ollama Provider 所有公开 API 的重新导出入口，
 * 将内部实现模块（src/）中的关键接口统一暴露给外部使用。
 *
 * 导出内容分组：
 * 1. 默认配置常量（defaults）：基础 URL、上下文窗口大小、费用、默认模型
 * 2. 模型相关（provider-models）：模型定义构建、模型列表获取、上下文窗口查询
 * 3. 设置流程（setup）：交互式配置、非交互式配置、模型拉取
 * 4. 流式处理（stream）：Ollama 原生和 OpenAI 兼容格式的流式处理函数
 *
 * 这种统一导出的设计模式使得外部模块可以通过单一入口访问所有 Ollama 功能，
 * 而无需关心内部模块的具体路径。
 */
export {
  OLLAMA_DEFAULT_BASE_URL,
  OLLAMA_DEFAULT_CONTEXT_WINDOW,
  OLLAMA_DEFAULT_COST,
  OLLAMA_DEFAULT_MAX_TOKENS,
  OLLAMA_DEFAULT_MODEL,
} from "./src/defaults.js";
export {
  buildOllamaModelDefinition,
  enrichOllamaModelsWithContext,
  fetchOllamaModels,
  isReasoningModelHeuristic,
  queryOllamaContextWindow,
  queryOllamaModelShowInfo,
  resolveOllamaApiBase,
  type OllamaModelShowInfo,
  type OllamaModelWithContext,
  type OllamaTagModel,
  type OllamaTagsResponse,
} from "./src/provider-models.js";
export {
  buildOllamaProvider,
  configureOllamaNonInteractive,
  ensureOllamaModelPulled,
  promptAndConfigureOllama,
} from "./src/setup.js";
export {
  buildOllamaChatRequest,
  createConfiguredOllamaCompatStreamWrapper,
  isOllamaCompatProvider,
  resolveOllamaCompatNumCtxEnabled,
  shouldInjectOllamaCompatNumCtx,
  wrapOllamaCompatNumCtx,
} from "./src/stream.js";
