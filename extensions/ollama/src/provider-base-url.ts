/**
 * Ollama Provider baseUrl 读取工具
 *
 * 本文件提供从 Provider 配置中安全读取 baseUrl 的工具函数。
 * 兼容两种命名风格：baseUrl 和 baseURL（驼峰式大小写差异）。
 *
 * 为什么需要这个工具：
 * 不同的配置源可能使用不同的属性名（JSON 配置倾向于 baseUrl，
 * 而某些 Node.js 库使用 baseURL），本函数统一处理两种情况。
 */
import type { ModelProviderConfig } from "openclaw/plugin-sdk/provider-model-shared";

export function readProviderBaseUrl(provider: ModelProviderConfig | undefined): string | undefined {
  if (!provider) {
    return undefined;
  }
  if (
    Object.hasOwn(provider, "baseUrl") &&
    typeof provider.baseUrl === "string" &&
    provider.baseUrl.trim()
  ) {
    return provider.baseUrl.trim();
  }
  const alternate = provider as ModelProviderConfig & { baseURL?: unknown };
  if (
    Object.hasOwn(alternate, "baseURL") &&
    typeof alternate.baseURL === "string" &&
    alternate.baseURL.trim()
  ) {
    return alternate.baseURL.trim();
  }
  return undefined;
}
