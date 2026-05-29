/**
 * @file Provider 索引加载器
 *
 * 负责加载和规范化 OpenClaw Provider 索引数据。
 * 默认使用内置的 OPENCLAW_PROVIDER_INDEX 常量，
 * 但也可以接受外部传入的自定义索引数据。
 */

import { normalizeOpenClawProviderIndex } from "./normalize.js";
import { OPENCLAW_PROVIDER_INDEX } from "./openclaw-provider-index.js";
import type { OpenClawProviderIndex } from "./types.js";

/**
 * 加载 OpenClaw Provider 索引
 * 如果规范化失败（如版本不匹配），返回空索引作为安全降级
 *
 * @param source - 原始索引数据，默认使用内置的 OPENCLAW_PROVIDER_INDEX
 * @returns 规范化后的 Provider 索引，至少包含 version 和空 providers
 */
export function loadOpenClawProviderIndex(
  source: unknown = OPENCLAW_PROVIDER_INDEX,
): OpenClawProviderIndex {
  return normalizeOpenClawProviderIndex(source) ?? { version: 1, providers: {} };
}
