/**
 * @fileoverview OpenAI Codex 共享工具模块
 *
 * 提供 Codex Provider 之间共用的字符串处理工具函数。
 * 作为轻量级工具模块，被其他 Codex 相关模块引用，避免重复代码。
 */

import { normalizeOptionalString } from "openclaw/plugin-sdk/string-coerce-runtime";

/**
 * 将值转换为非空字符串（去除首尾空白后），若为空则返回 undefined。
 * 复用 SDK 的 normalizeOptionalString 实现，提供更具语义化的别名。
 *
 * @param value - 待转换的任意值
 * @returns 处理后的非空字符串或 undefined
 */
export const trimNonEmptyString = normalizeOptionalString;
