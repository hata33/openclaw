/**
 * @fileoverview Anthropic 重放策略（Replay Policy）
 *
 * 本文件从 OpenClaw 插件 SDK 的原生 Anthropic 重放钩子中提取 buildReplayPolicy 函数，
 * 并以 buildAnthropicReplayPolicy 的名称重新导出。
 *
 * 重放策略的作用：
 * 当流式响应中断或需要重新发送消息时，重放策略决定了如何处理对话历史中的
 * 助手消息（assistant messages），特别是包含工具调用和思考过程的消息。
 * 这对于确保重放后的对话状态一致性至关重要。
 *
 * 为什么从 SDK 导出而不是自行实现：
 * 原生重放钩子包含了 Anthropic API 特定的消息格式处理逻辑，
 * 这些逻辑随 API 版本更新而变化，由 SDK 统一维护更可靠。
 */

import { NATIVE_ANTHROPIC_REPLAY_HOOKS } from "openclaw/plugin-sdk/provider-model-shared";

/** 从原生 Anthropic 重放钩子中提取 buildReplayPolicy 函数 */
const { buildReplayPolicy } = NATIVE_ANTHROPIC_REPLAY_HOOKS;

/* 安全检查：确保原生钩子确实暴露了 buildReplayPolicy */
if (!buildReplayPolicy) {
  throw new Error("Expected native Anthropic replay hooks to expose buildReplayPolicy.");
}

/**
 * Anthropic 重放策略构建函数
 *
 * 用于在流式响应中断时构建重放策略，决定如何处理对话历史中的助手消息。
 * 主要处理包含工具调用、思考过程（thinking）的消息重放逻辑。
 */
export { buildReplayPolicy as buildAnthropicReplayPolicy };
