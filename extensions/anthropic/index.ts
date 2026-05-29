/**
 * @fileoverview Anthropic Provider 插件入口文件
 *
 * 本文件是 Anthropic（Claude）提供商扩展的主入口点。它使用 OpenClaw 插件 SDK 的
 * definePluginEntry 来定义插件元数据，并在 register 钩子中调用 registerAnthropicPlugin
 * 完成 Provider、CLI 后端和媒体理解提供者的注册。
 *
 * 插件注册流程：
 * 1. OpenClaw 加载本插件时调用 register(api)
 * 2. registerAnthropicPlugin 将 Anthropic Provider 注册到插件系统
 * 3. 注册完成后，系统即可使用 Anthropic/Claude 模型
 */

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { registerAnthropicPlugin } from "./register.runtime.js";

/**
 * Anthropic Provider 插件定义
 *
 * 通过 definePluginEntry 声明插件的 id、名称、描述和注册逻辑。
 * 这是 OpenClaw 插件系统加载 Anthropic 扩展的入口。
 */
export default definePluginEntry({
  /** 插件唯一标识符，与 Provider ID 保持一致 */
  id: "anthropic",
  /** 插件显示名称 */
  name: "Anthropic Provider",
  /** 插件功能描述 */
  description: "Bundled Anthropic provider plugin",
  /**
   * 插件注册钩子
   * @param api - OpenClaw 插件 API，用于注册 Provider、CLI 后端等组件
   */
  register(api) {
    return registerAnthropicPlugin(api);
  },
});
