/**
 * @fileoverview Claude CLI 模型目录（Model Catalog）
 *
 * 本文件负责构建 Claude CLI 模型的目录条目，供模型选择器（Model Picker）使用。
 * 目录条目包含了模型的元数据信息，如名称、能力、上下文窗口大小等。
 *
 * 设计考量：
 * - Claude CLI 的认证是订阅制的（subscription-backed），因此目录条目只需包含
 *   选择器（picker）所需的元数据，不需要价格或计费信息。
 * - 模型 ID 从 CLAUDE_CLI_DEFAULT_ALLOWLIST_REFS 中提取，确保只展示已允许的模型。
 * - 每个模型的图像输入能力（如最大分辨率）根据模型类型单独配置。
 *
 * 目录条目用途：
 * - 模型选择器 UI 展示
 * - 能力检测（如是否支持图像输入、推理能力）
 * - 上下文窗口大小限制
 */

import type { ModelCatalogEntry } from "openclaw/plugin-sdk/agent-runtime";
import { CLAUDE_CLI_BACKEND_ID, CLAUDE_CLI_DEFAULT_ALLOWLIST_REFS } from "./cli-constants.js";

// Claude CLI auth is subscription-backed, so catalog rows only need picker metadata.
/* Claude CLI 默认上下文窗口大小为 200K tokens */
const CLAUDE_CLI_DEFAULT_CONTEXT_WINDOW = 200_000;

/**
 * Claude CLI 模型显示标签映射
 * 用于在模型选择器中展示友好的模型名称
 */
const CLAUDE_CLI_MODEL_LABELS: Record<string, string> = {
  "claude-opus-4-7": "Claude Opus 4.7 (Claude CLI)",
  "claude-opus-4-6": "Claude Opus 4.6 (Claude CLI)",
  "claude-sonnet-4-6": "Claude Sonnet 4.6 (Claude CLI)",
};

/**
 * 解析 Claude CLI 模型的图像输入媒体参数
 *
 * 不同模型支持不同的最大图像分辨率：
 * - claude-opus-4-7: 2576px（更高的视觉能力）
 * - 其他模型: 1568px（标准分辨率）
 *
 * @param id - 模型 ID
 * @returns 图像媒体输入参数配置
 */
function resolveClaudeCliImageMediaInput(id: string): ModelCatalogEntry["mediaInput"] {
  const maxSidePx = id === "claude-opus-4-7" ? 2576 : 1568;
  return {
    image: {
      maxSidePx,
      preferredSidePx: maxSidePx,
      tokenMode: "provider", /* 使用 Provider 端的 token 计算方式 */
    },
  };
}

/**
 * 从允许列表中提取 Claude CLI 模型 ID
 *
 * 遍历 CLAUDE_CLI_DEFAULT_ALLOWLIST_REFS，提取所有 claude-cli/* 前缀的模型 ID，
 * 并去重返回。用于构建模型目录条目。
 *
 * @returns 去重后的 Claude CLI 模型 ID 列表
 */
function extractClaudeCliModelIds(): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const ref of CLAUDE_CLI_DEFAULT_ALLOWLIST_REFS) {
    /* 只处理 claude-cli/ 前缀的引用 */
    if (!ref.startsWith(`${CLAUDE_CLI_BACKEND_ID}/`)) {
      continue;
    }
    const id = ref.slice(CLAUDE_CLI_BACKEND_ID.length + 1);
    if (id.length === 0 || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/**
 * 构建 Claude CLI 模型目录条目
 *
 * 为每个已允许的 Claude CLI 模型创建目录条目，包含：
 * - 模型 ID 和显示名称
 * - 提供者标识（claude-cli）
 * - 能力标记（推理、图像输入）
 * - 上下文窗口大小（200K tokens）
 * - 图像媒体输入参数
 *
 * @returns 模型目录条目数组，用于模型选择器展示
 */
export function buildClaudeCliCatalogEntries(): ModelCatalogEntry[] {
  return extractClaudeCliModelIds().map((id) => ({
    id,
    name: CLAUDE_CLI_MODEL_LABELS[id] ?? `${id} (Claude CLI)`,
    provider: CLAUDE_CLI_BACKEND_ID,
    reasoning: true,       /* Claude CLI 模型均支持推理能力 */
    input: ["text", "image"],  /* 支持文本和图像输入 */
    mediaInput: resolveClaudeCliImageMediaInput(id),
    contextWindow: CLAUDE_CLI_DEFAULT_CONTEXT_WINDOW,
  }));
}
