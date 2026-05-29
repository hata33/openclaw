/**
 * @fileoverview Anthropic 设置 API 入口文件
 *
 * 本文件提供轻量级的 Anthropic 设置钩子，仅注册 Claude CLI 后端。
 * 与完整的 index.ts 入口不同，此文件用于只需 CLI 后端能力的场景，
 * 不包含完整的 Provider 注册逻辑。
 *
 * 使用场景：当只需要 Claude CLI 后端功能而不需要完整 Anthropic Provider 时使用。
 */

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { buildAnthropicCliBackend } from "./cli-backend.js";

/**
 * 轻量级 Anthropic 设置插件
 *
 * 仅注册 Claude CLI 后端，不包含 Provider 认证、模型解析等完整功能。
 * 适用于只需要 CLI 后端能力的简化场景。
 */
export default definePluginEntry({
  /** 插件唯一标识符 */
  id: "anthropic",
  /** 插件显示名称 */
  name: "Anthropic Setup",
  /** 插件功能描述 */
  description: "Lightweight Anthropic setup hooks",
  /**
   * 插件注册钩子 - 仅注册 CLI 后端
   * @param api - OpenClaw 插件 API
   */
  register(api) {
    api.registerCliBackend(buildAnthropicCliBackend());
  },
});
