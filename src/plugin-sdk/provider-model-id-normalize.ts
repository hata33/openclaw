/**
 * @file Provider 模型 ID 规范化
 *
 * 本文件处理特定 Provider 的模型 ID 规范化逻辑，主要针对 Google 和 Antigravity 模型。
 *
 * 为什么需要模型 ID 规范化：
 * 1. Google 经常重命名模型（如 gemini-3-pro → gemini-3.1-pro-preview），
 *    用户配置中可能使用旧名称，系统需要自动映射到新名称
 * 2. Antigravity 的 "bare pro" 模型需要添加 "-low" 后缀才能正常工作
 * 3. 模型名称经常有 preview/ga 后缀的变化，需要统一处理
 *
 * 设计决策：
 * - 规范化是幂等的（多次规范化结果相同）
 * - 支持 "google/" 前缀的透传（保持 provider 前缀不变）
 * - 对于已 GA 的 preview 模型（如 gemini-3.1-flash-lite-preview），直接映射到 GA 名称
 */

const ANTIGRAVITY_BARE_PRO_IDS = new Set(["gemini-3-pro", "gemini-3.1-pro", "gemini-3-1-pro"]);
const GOOGLE_PROVIDER_PREFIX = "google/";

/**
 * 规范化 Google 预览模型 ID
 *
 * 将用户使用的旧模型名称映射到当前正确的名称。
 * 支持 "google/" 前缀的透传处理。
 *
 * @param id - 原始模型 ID
 * @returns 规范化后的模型 ID
 */
export function normalizeGooglePreviewModelId(id: string): string {
  if (id.startsWith(GOOGLE_PROVIDER_PREFIX)) {
    const modelId = id.slice(GOOGLE_PROVIDER_PREFIX.length);
    const normalizedModelId = normalizeGooglePreviewModelId(modelId);
    return normalizedModelId === modelId ? id : `${GOOGLE_PROVIDER_PREFIX}${normalizedModelId}`;
  }
  if (id === "gemini-3-pro" || id === "gemini-3-pro-preview") {
    return "gemini-3.1-pro-preview";
  }
  if (id === "gemini-3-flash") {
    return "gemini-3-flash-preview";
  }
  if (id === "gemini-3.1-pro") {
    return "gemini-3.1-pro-preview";
  }
  // Gemini 3.1 Flash Lite graduated to GA on 2026-05-07; the -preview
  // endpoint is deprecated (shutdown 2026-05-25). Map old preview name
  // to the stable GA id.
  if (id === "gemini-3.1-flash-lite-preview") {
    return "gemini-3.1-flash-lite";
  }
  if (id === "gemini-3.1-flash" || id === "gemini-3.1-flash-preview") {
    return "gemini-3-flash-preview";
  }
  return id;
}

/**
 * 规范化 Antigravity 预览模型 ID
 *
 * 将 Antigravity 的 "bare pro" 模型（如 gemini-3-pro）
 * 添加 "-low" 后缀，使其能在 Antigravity 后端正常工作。
 *
 * @param id - 原始模型 ID
 * @returns 规范化后的模型 ID
 */
export function normalizeAntigravityPreviewModelId(id: string): string {
  if (ANTIGRAVITY_BARE_PRO_IDS.has(id)) {
    return `${id}-low`;
  }
  return id;
}
