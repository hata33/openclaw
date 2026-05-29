/**
 * Google Gemini 思考/推理能力配置
 *
 * 本文件重新导出 Google Gemini 的思考/推理相关接口，
 * 这些接口实际实现在 openclaw/plugin-sdk/provider-stream-shared 中。
 *
 * 支持的思考级别（ThinkingLevel）：
 * - off: 关闭推理
 * - minimal: 最小推理
 * - low/medium/high: 递增推理深度
 * - adaptive: 自适应推理（Gemini 2.5/3.x 支持）
 *
 * 特殊功能：
 * - thinkingBudget: 控制推理 token 预算
 * - thoughtSignature: 推理签名，用于多轮对话中保持推理上下文
 * - Gemini 3 Pro/Flash 支持原生 thinkingLevel 参数
 */
export {
  createGoogleThinkingPayloadWrapper,
  createGoogleThinkingStreamWrapper,
  isGoogleGemini25ThinkingBudgetModel,
  isGoogleGemini3FlashModel,
  isGoogleGemini3ProModel,
  isGoogleGemini3ThinkingLevelModel,
  isGoogleThinkingRequiredModel,
  resolveGoogleGemini3ThinkingLevel,
  sanitizeGoogleThinkingPayload,
  stripInvalidGoogleThinkingBudget,
  type GoogleThinkingInputLevel,
  type GoogleThinkingLevel,
} from "openclaw/plugin-sdk/provider-stream-shared";
