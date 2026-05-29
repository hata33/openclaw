/**
 * @file OpenClaw 内置 Provider 索引数据
 *
 * 这是 OpenClaw 内置的 Provider 索引硬编码数据，包含核心 Provider 的预览元数据。
 * 这些数据在插件未安装时作为降级方案使用，确保用户始终能看到核心 Provider 的模型列表。
 *
 * 设计原则：
 * - 只包含最核心的 Provider（目前为 Moonshot 和 DeepSeek）
 * - 模型信息是最小化的（只有 id、name、input、contextWindow）
 * - 不包含定价信息（因为这些可能变化，应该从运行时获取）
 * - 插件安装后，manifest 中的完整数据会覆盖这些预览数据
 */

import type { OpenClawProviderIndex } from "./types.js";

// OpenClaw-owned preview metadata for providers whose plugins may not be
// installed yet. Installed plugin manifests remain authoritative; this index is
// a fallback for installable-provider and pre-install model picker surfaces.
// Preview catalogs use the shared model catalog type, but intentionally keep to
// stable display fields unless runtime adapter metadata is kept in sync with
// the installed plugin manifest.
// When a bundled provider moves to an external package, keep its provider id
// here and add plugin package metadata so pre-install surfaces do not disappear
// before the user installs the new package.
export const OPENCLAW_PROVIDER_INDEX = {
  version: 1,
  providers: {
    moonshot: {
      id: "moonshot",
      name: "Moonshot AI",
      plugin: {
        id: "moonshot",
      },
      docs: "/providers/moonshot",
      categories: ["cloud", "llm"],
      previewCatalog: {
        models: [
          {
            id: "kimi-k2.6",
            name: "Kimi K2.6",
            input: ["text", "image"],
            contextWindow: 262144,
          },
        ],
      },
    },
    deepseek: {
      id: "deepseek",
      name: "DeepSeek",
      plugin: {
        id: "deepseek",
      },
      docs: "/providers/deepseek",
      categories: ["cloud", "llm"],
      previewCatalog: {
        models: [
          {
            id: "deepseek-chat",
            name: "DeepSeek Chat",
            input: ["text"],
            contextWindow: 131072,
          },
          {
            id: "deepseek-reasoner",
            name: "DeepSeek Reasoner",
            input: ["text"],
            reasoning: true,
            contextWindow: 131072,
          },
        ],
      },
    },
  },
} satisfies OpenClawProviderIndex;
