/**
 * Amazon Bedrock Setup API
 *
 * 本文件提供 Bedrock 的轻量级设置钩子，用于：
 * 1. 注册基础 Provider（仅包含认证和 API Key 解析）
 * 2. 注册配置迁移函数，处理旧版 Bedrock 配置的兼容性
 *
 * 与 register.sync.runtime.ts 不同，本文件是简化的设置入口，
 * 主要用于配置向导和初始设置场景。
 */
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { migrateAmazonBedrockLegacyConfig } from "./config-api.js";
import { resolveBedrockConfigApiKey } from "./discovery-shared.js";

export default definePluginEntry({
  id: "amazon-bedrock",
  name: "Amazon Bedrock Setup",
  description: "Lightweight Amazon Bedrock setup hooks",
  register(api) {
    api.registerProvider({
      id: "amazon-bedrock",
      label: "Amazon Bedrock",
      auth: [],
      resolveConfigApiKey: ({ env }) => resolveBedrockConfigApiKey(env),
    });
    api.registerConfigMigration((config) => migrateAmazonBedrockLegacyConfig(config));
  },
});
