/**
 * Ollama 运行时 API 重新导出
 *
 * 本文件统一导出 Ollama 流式处理和嵌入向量相关的运行时 API，
 * 供外部模块在运行时阶段使用。
 *
 * 导出分两组：
 * 1. 流式处理相关：原生和兼容流函数、消息转换、NDJSON 解析等
 * 2. 嵌入向量相关：嵌入提供者创建函数和默认模型
 */
export {
  buildAssistantMessage,
  buildOllamaChatRequest,
  createConfiguredOllamaCompatStreamWrapper,
  convertToOllamaMessages,
  createConfiguredOllamaCompatNumCtxWrapper,
  createConfiguredOllamaStreamFn,
  createOllamaStreamFn,
  isOllamaCompatProvider,
  OLLAMA_NATIVE_BASE_URL,
  parseNdjsonStream,
  resolveOllamaBaseUrlForRun,
  resolveOllamaCompatNumCtxEnabled,
  shouldInjectOllamaCompatNumCtx,
  wrapOllamaCompatNumCtx,
} from "./src/stream.js";
export {
  createOllamaEmbeddingProvider,
  DEFAULT_OLLAMA_EMBEDDING_MODEL,
  type OllamaEmbeddingClient,
  type OllamaEmbeddingProvider,
} from "./src/embedding-provider.js";
