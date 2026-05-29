/**
 * Ollama 可见内容清洗器接口定义
 *
 * 本文件定义了 Ollama 可见文本内容清洗器的类型接口，
 * 用于在流式输出中处理模型生成的特殊格式文本。
 *
 * 接口说明：
 * - resolveStreamText: 流式阶段调用，决定当前文本是否可以显示
 *   - 返回 { kind: "visible", text } 表示可以显示
 *   - 返回 { kind: "pending" } 表示需要等待更多数据
 * - sanitizeFinalText: 最终阶段调用，对完整文本进行清洗
 */
export type OllamaVisibleContentStreamResolution =
  | { kind: "visible"; text: string }
  | { kind: "pending" };

export type OllamaVisibleContentSanitizer = {
  resolveStreamText(params: { text: string; final: boolean }): OllamaVisibleContentStreamResolution;
  sanitizeFinalText(text: string): string;
};
