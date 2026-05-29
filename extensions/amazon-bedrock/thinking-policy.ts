/**
 * Amazon Bedrock 思考策略配置
 *
 * 本文件定义 Bedrock 上 Claude 模型的思考/推理能力配置。
 *
 * 支持的模型和级别：
 * - Claude Opus 4.7: 支持 off/minimal/low/medium/high/xhigh/adaptive/max，默认 off
 * - Claude 4.6 (Opus/Sonnet): 支持 off/minimal/low/medium/high/adaptive，默认 adaptive
 * - 其他 Claude: 支持 off/minimal/low/medium/high
 *
 * isOpus47BedrockModelRef 用于识别 Opus 4.7 模型，
 * 该模型需要特殊处理（如省略废弃的 temperature 参数）。
 */
import type { ProviderThinkingProfile } from "openclaw/plugin-sdk/plugin-entry";

const BASE_CLAUDE_THINKING_LEVELS = [
  { id: "off" },
  { id: "minimal" },
  { id: "low" },
  { id: "medium" },
  { id: "high" },
] as const satisfies ProviderThinkingProfile["levels"];

export function isOpus47BedrockModelRef(modelRef: string): boolean {
  return /(?:^|[/.:])(?:(?:us|eu|ap|apac|au|jp|global)\.)?anthropic\.claude-opus-4[.-]7(?:$|[-.:/])/i.test(
    modelRef,
  );
}

export function resolveBedrockClaudeThinkingProfile(modelId: string): ProviderThinkingProfile {
  const trimmed = modelId.trim();
  if (isOpus47BedrockModelRef(trimmed)) {
    return {
      levels: [...BASE_CLAUDE_THINKING_LEVELS, { id: "xhigh" }, { id: "adaptive" }, { id: "max" }],
      defaultLevel: "off",
    };
  }
  if (/claude-(?:opus|sonnet)-4(?:\.|-)6(?:$|[-.])/i.test(trimmed)) {
    return {
      levels: [...BASE_CLAUDE_THINKING_LEVELS, { id: "adaptive" }],
      defaultLevel: "adaptive",
    };
  }
  return { levels: BASE_CLAUDE_THINKING_LEVELS };
}
