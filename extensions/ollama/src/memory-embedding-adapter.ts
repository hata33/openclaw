/**
 * Ollama 内存嵌入适配器
 *
 * 本文件将 Ollama 的嵌入向量提供者适配为 OpenClaw 内存系统的嵌入接口。
 * 内存搜索功能需要将文本转换为向量进行语义检索，本适配器负责桥接这一需求。
 *
 * 配置说明：
 * - id: "ollama" - 标识这是 Ollama 提供的嵌入服务
 * - defaultModel: "nomic-embed-text" - 默认嵌入模型
 * - transport: "remote" - 使用远程 HTTP 传输（即使本地也通过 HTTP 调用）
 * - authProviderId: "ollama" - 使用 Ollama 的认证配置
 * - inlineBatchTimeoutMs: 10 分钟 - 批量嵌入的超时时间
 *
 * create 函数在运行时被调用，创建实际的嵌入客户端实例。
 */
import type { MemoryEmbeddingProviderAdapter } from "openclaw/plugin-sdk/memory-core-host-engine-embeddings";
import {
  DEFAULT_OLLAMA_EMBEDDING_MODEL,
  createOllamaEmbeddingProvider,
} from "./embedding-provider.js";

export const ollamaMemoryEmbeddingProviderAdapter: MemoryEmbeddingProviderAdapter = {
  id: "ollama",
  defaultModel: DEFAULT_OLLAMA_EMBEDDING_MODEL,
  transport: "remote",
  authProviderId: "ollama",
  create: async (options) => {
    const { provider, client } = await createOllamaEmbeddingProvider({
      ...options,
      provider: "ollama",
      fallback: "none",
    });
    return {
      provider,
      runtime: {
        id: "ollama",
        inlineBatchTimeoutMs: 10 * 60_000,
        cacheKeyData: {
          provider: "ollama",
          model: client.model,
        },
      },
    };
  },
};
