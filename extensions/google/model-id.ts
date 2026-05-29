/**
 * Google 模型 ID 规范化
 *
 * 本文件处理 Google Gemini 模型 ID 的规范化和别名映射。
 * 由于 Google 频繁更新模型命名，本文件维护了完整的名称映射表。
 *
 * 规则：
 * 1. 移除 "google/" 前缀后进行规范化，再恢复前缀
 * 2. 旧模型名称映射到新名称（如 gemini-3-pro → gemini-3.1-pro-preview）
 * 3. 已退役预览版映射到 GA 版本（如 gemini-3.1-flash-lite-preview → gemini-3.1-flash-lite）
 * 4. normalizeAntigravityModelId 为 Antigravity 协议添加 -low 后缀
 *
 * 这种映射确保用户使用旧名称时仍能正常工作，提供平滑的迁移体验。
 */
const ANTIGRAVITY_BARE_PRO_IDS = new Set(["gemini-3-pro", "gemini-3.1-pro", "gemini-3-1-pro"]);
const GOOGLE_PROVIDER_PREFIX = "google/";

export function normalizeGoogleModelId(id: string): string {
  if (id.startsWith(GOOGLE_PROVIDER_PREFIX)) {
    const modelId = id.slice(GOOGLE_PROVIDER_PREFIX.length);
    const normalizedModelId = normalizeGoogleModelId(modelId);
    return normalizedModelId === modelId ? id : `${GOOGLE_PROVIDER_PREFIX}${normalizedModelId}`;
  }
  if (id === "gemini-3-pro" || id === "gemini-3-pro-preview") {
    return "gemini-3.1-pro-preview";
  }
  if (id === "gemini-3-flash") {
    return "gemini-3-flash-preview";
  }
  // Google exposes Gemini 3.1 Pro in the Gemini API as the preview-suffixed id.
  // Keep the bare form as a user convenience alias, not as a canonical API id.
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

export function normalizeAntigravityModelId(id: string): string {
  if (ANTIGRAVITY_BARE_PRO_IDS.has(id)) {
    return `${id}-low`;
  }
  return id;
}
