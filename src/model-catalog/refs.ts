/**
 * @file 模型目录引用（Refs）工具函数
 *
 * 提供模型目录中 Provider ID 规范化和模型引用（ref）构建的工具函数。
 * 这些函数是模型目录系统的基础构建块，被广泛用于整个系统中的模型标识处理。
 *
 * 设计决策：
 * - Provider ID 统一转为小写，确保大小写不敏感的匹配
 * - 模型引用格式为 "provider/modelId"（类似 GitHub 的 "owner/repo" 格式）
 * - 合并键（mergeKey）用于去重和数据合并，格式为 "provider::modelId"（全小写）
 */

import { normalizeLowercaseStringOrEmpty } from "../shared/string-coerce.js";

/**
 * 规范化 Provider ID - 统一转为小写并去除空白
 * 用于确保 "DeepSeek" 和 "deepseek" 被视为同一个提供商
 */
export function normalizeModelCatalogProviderId(provider: string): string {
  return normalizeLowercaseStringOrEmpty(provider);
}

/**
 * 构建模型目录引用字符串 - 格式为 "provider/modelId"
 * 例如："openai/gpt-4o"、"anthropic/claude-sonnet-4"
 * 这是模型在系统中的唯一人类可读标识符
 */
export function buildModelCatalogRef(provider: string, modelId: string): string {
  return `${normalizeModelCatalogProviderId(provider)}/${modelId}`;
}

/**
 * 构建模型目录合并键 - 格式为 "provider::modelId"（全小写）
 * 用于在数据合并时识别同一模型的不同条目
 * 与 ref 不同，mergeKey 会将 modelId 也转为小写，确保大小写不敏感的匹配
 */
export function buildModelCatalogMergeKey(provider: string, modelId: string): string {
  return `${normalizeModelCatalogProviderId(provider)}::${normalizeLowercaseStringOrEmpty(modelId)}`;
}
