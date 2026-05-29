/**
 * Ollama 网页搜索合同 API
 *
 * 本文件提供 Ollama 网页搜索提供者的合同（contract）接口实现。
 * 合同 API 定义了搜索提供者的标准化接口，供插件注册系统使用。
 *
 * 注意：这里的 createTool 返回 null，因为实际的搜索工具
 * 由 src/web-search-provider.ts 中的完整实现提供。
 * 本文件主要用于满足插件系统的类型要求。
 */
import {
  createWebSearchProviderContractFields,
  type WebSearchProviderPlugin,
} from "openclaw/plugin-sdk/provider-web-search-contract";

export function createOllamaWebSearchProvider(): WebSearchProviderPlugin {
  return {
    id: "ollama",
    label: "Ollama Web Search",
    hint: "Local Ollama host · requires ollama signin",
    onboardingScopes: ["text-inference"],
    requiresCredential: false,
    envVars: [],
    placeholder: "(run ollama signin)",
    signupUrl: "https://ollama.com/",
    docsUrl: "https://docs.openclaw.ai/tools/web",
    autoDetectOrder: 110,
    credentialPath: "",
    ...createWebSearchProviderContractFields({
      credentialPath: "",
      searchCredential: { type: "none" },
      selectionPluginId: "ollama",
    }),
    createTool: () => null,
  };
}
