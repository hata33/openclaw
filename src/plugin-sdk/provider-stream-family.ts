/**
 * @file Provider 流式处理策略族公共导出
 *
 * 重新导出 provider-stream.js 中的所有内容。
 * 流式策略族（stream family）封装了不同 Provider 的流式响应处理逻辑，
 * 包括文本解析、工具调用识别、思考模式处理等。
 *
 * 为什么需要策略族：
 * - 不同 Provider 的流式响应格式差异很大（SSE、WebSocket、自定义协议）
 * - 策略族模式将这些差异封装在可组合的包装器中
 * - Provider 插件可以混合使用不同的策略来处理复杂的响应场景
 */

export * from "./provider-stream.js";
