/**
 * Ollama 默认配置常量
 *
 * 定义 Ollama 提供者的核心默认值：
 * - OLLAMA_DEFAULT_BASE_URL: 本地 Ollama 默认地址（127.0.0.1:11434）
 * - OLLAMA_DOCKER_HOST_BASE_URL: Docker 环境下的宿主机地址（host.docker.internal:11434）
 * - OLLAMA_CLOUD_BASE_URL: Ollama 云端地址（ollama.com）
 * - OLLAMA_DEFAULT_CONTEXT_WINDOW: 默认上下文窗口大小（128K tokens）
 * - OLLAMA_DEFAULT_MAX_TOKENS: 默认最大输出 token 数（8192）
 * - OLLAMA_DEFAULT_COST: 本地模型费用全为 0（免费）
 * - OLLAMA_DEFAULT_MODEL: 默认使用的模型（gemma4）
 *
 * 这些常量在 Ollama Provider 的各个模块中被广泛引用，
 * 集中定义便于统一修改和维护。
 */
export const OLLAMA_DEFAULT_BASE_URL = "http://127.0.0.1:11434";
export const OLLAMA_DOCKER_HOST_BASE_URL = "http://host.docker.internal:11434";
export const OLLAMA_CLOUD_BASE_URL = "https://ollama.com";

export const OLLAMA_DEFAULT_CONTEXT_WINDOW = 128000;
export const OLLAMA_DEFAULT_MAX_TOKENS = 8192;
export const OLLAMA_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

export const OLLAMA_DEFAULT_MODEL = "gemma4";
