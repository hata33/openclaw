/**
 * DeepSeek Provider 发现模块
 *
 * 本文件实现 DeepSeek 提供者的静态发现机制。
 * "发现"是指系统如何找到并列举某个 Provider 可用的模型列表。
 *
 * DeepSeek 使用静态目录（staticCatalog），即模型列表在构建时就已确定，
 * 不需要运行时从远程 API 获取。这与 Ollama 等需要动态发现的 Provider 不同。
 *
 * 返回的 ProviderPlugin 对象包含：
 * - id/label: 提供者标识和显示名称
 * - docsPath: 文档路径
 * - auth: 认证方式（静态目录不需要额外认证）
 * - staticCatalog: 静态模型目录配置，order 为 "simple" 表示简单排序
 */
import type { ProviderPlugin } from "openclaw/plugin-sdk/provider-model-shared";
import { buildDeepSeekProvider } from "./provider-catalog.js";

const deepSeekProviderDiscovery: ProviderPlugin = {
  id: "deepseek",
  label: "DeepSeek",
  docsPath: "/providers/deepseek",
  auth: [],
  staticCatalog: {
    order: "simple",
    run: async () => ({
      provider: buildDeepSeekProvider(),
    }),
  },
};

export default deepSeekProviderDiscovery;
