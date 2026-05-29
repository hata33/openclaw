/**
 * @file Provider 工具 Schema 兼容性处理
 *
 * 本文件实现了不同 AI Provider 对工具（Tool/Function Calling）JSON Schema 的兼容性处理。
 * 不同 Provider 对 JSON Schema 规范的支持程度不同，需要进行相应的转换和裁剪。
 *
 * 支持的兼容性族（Provider Tool Compat Family）：
 * - gemini: Google Gemini 不支持部分 JSON Schema 关键字（如 $schema、exclusiveMaximum 等）
 * - deepseek: DeepSeek 不支持 anyOf/oneOf，需要展平联合类型
 * - openai: OpenAI 的 strict 模式要求所有属性必须在 required 中，不能有 additionalProperties
 *
 * 设计原则：
 * - normalizeToolSchemas: 转换 Schema 以符合目标 Provider 的要求
 * - inspectToolSchemas: 检测 Schema 中的违规项，用于诊断和警告
 * - 两个函数独立工作：normalize 负责修复，inspect 负责报告
 * - 通过 buildProviderToolCompatFamilyHooks 工厂函数统一创建
 */

import type { TSchema } from "typebox";
import {
  cleanSchemaForGemini,
  GEMINI_UNSUPPORTED_SCHEMA_KEYWORDS,
} from "../agents/schema/clean-for-gemini.js";
import type {
  AnyAgentTool,
  ProviderNormalizeToolSchemasContext,
  ProviderToolSchemaDiagnostic,
} from "./plugin-entry.js";

// Shared provider-tool helpers for plugin-owned schema compatibility rewrites.
export { cleanSchemaForGemini, GEMINI_UNSUPPORTED_SCHEMA_KEYWORDS };

/**
 * 递归地从 Schema 中移除不支持的关键字
 * 只处理 properties/items/anyOf/oneOf/allOf 等嵌套结构，保持数据完整性
 */
export function stripUnsupportedSchemaKeywords(
  schema: unknown,
  unsupportedKeywords: ReadonlySet<string>,
): unknown {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map((entry) => stripUnsupportedSchemaKeywords(entry, unsupportedKeywords));
  }
  const obj = schema as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (unsupportedKeywords.has(key)) {
      continue;
    }
    if (key === "properties" && value && typeof value === "object" && !Array.isArray(value)) {
      cleaned[key] = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [
          childKey,
          stripUnsupportedSchemaKeywords(childValue, unsupportedKeywords),
        ]),
      );
      continue;
    }
    if (key === "items" && value && typeof value === "object") {
      cleaned[key] = Array.isArray(value)
        ? value.map((entry) => stripUnsupportedSchemaKeywords(entry, unsupportedKeywords))
        : stripUnsupportedSchemaKeywords(value, unsupportedKeywords);
      continue;
    }
    if ((key === "anyOf" || key === "oneOf" || key === "allOf") && Array.isArray(value)) {
      cleaned[key] = value.map((entry) =>
        stripUnsupportedSchemaKeywords(entry, unsupportedKeywords),
      );
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
}

/**
 * 递归查找 Schema 中使用了不支持的关键字的位置
 * 返回包含路径信息的违规列表，用于诊断报告
 */
export function findUnsupportedSchemaKeywords(
  schema: unknown,
  path: string,
  unsupportedKeywords: ReadonlySet<string>,
): string[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }
  if (Array.isArray(schema)) {
    return schema.flatMap((item, index) =>
      findUnsupportedSchemaKeywords(item, `${path}[${index}]`, unsupportedKeywords),
    );
  }
  const record = schema as Record<string, unknown>;
  const violations: string[] = [];
  const properties =
    record.properties && typeof record.properties === "object" && !Array.isArray(record.properties)
      ? (record.properties as Record<string, unknown>)
      : undefined;
  if (properties) {
    for (const [key, value] of Object.entries(properties)) {
      violations.push(
        ...findUnsupportedSchemaKeywords(value, `${path}.properties.${key}`, unsupportedKeywords),
      );
    }
  }
  for (const [key, value] of Object.entries(record)) {
    if (key === "properties") {
      continue;
    }
    if (unsupportedKeywords.has(key)) {
      violations.push(`${path}.${key}`);
    }
    if (value && typeof value === "object") {
      violations.push(
        ...findUnsupportedSchemaKeywords(value, `${path}.${key}`, unsupportedKeywords),
      );
    }
  }
  return violations;
}

/**
 * 规范化 Gemini 工具 Schema - 移除 Gemini 不支持的关键字
 * 使用 cleanSchemaForGemini 进行深度清理
 */
export function normalizeGeminiToolSchemas(
  ctx: ProviderNormalizeToolSchemasContext,
): AnyAgentTool[] {
  return ctx.tools.map((tool) => {
    if (!tool.parameters || typeof tool.parameters !== "object") {
      return tool;
    }
    return {
      ...tool,
      parameters: cleanSchemaForGemini(tool.parameters),
    };
  });
}

export function inspectGeminiToolSchemas(
  ctx: ProviderNormalizeToolSchemasContext,
): ProviderToolSchemaDiagnostic[] {
  return ctx.tools.flatMap((tool, toolIndex) => {
    const violations = findUnsupportedSchemaKeywords(
      tool.parameters,
      `${tool.name}.parameters`,
      GEMINI_UNSUPPORTED_SCHEMA_KEYWORDS,
    );
    if (violations.length === 0) {
      return [];
    }
    return [{ toolName: tool.name, toolIndex, violations }];
  });
}

/**
 * 规范化 OpenAI 工具 Schema - 转换为 strict 模式兼容格式
 * 仅在 OpenAI Responses API 和 OpenAI Codex Responses API 时生效
 *
 * strict 模式要求：
 * - 所有对象必须有 type: "object"
 * - 所有属性必须在 required 中
 * - 不能使用 anyOf/oneOf/allOf
 * - additionalProperties 必须为 false
 */
export function normalizeOpenAIToolSchemas(
  ctx: ProviderNormalizeToolSchemasContext,
): AnyAgentTool[] {
  if (!shouldApplyOpenAIToolCompat(ctx)) {
    return ctx.tools;
  }
  return ctx.tools.map((tool) => {
    if (tool.parameters == null) {
      return {
        ...tool,
        parameters: normalizeOpenAIStrictCompatSchema({}),
      };
    }
    if (typeof tool.parameters !== "object") {
      return tool;
    }
    return {
      ...tool,
      parameters: normalizeOpenAIStrictCompatSchema(tool.parameters),
    };
  });
}

function normalizeOpenAIStrictCompatSchema(schema: unknown): TSchema {
  return normalizeOpenAIStrictCompatSchemaRecursive(schema, {
    promoteEmptyObject: true,
  }) as TSchema;
}

function shouldApplyOpenAIToolCompat(ctx: ProviderNormalizeToolSchemasContext): boolean {
  const provider = (ctx.model?.provider ?? ctx.provider ?? "").trim().toLowerCase();
  const api = (ctx.model?.api ?? ctx.modelApi ?? "").trim().toLowerCase();
  const baseUrl = (ctx.model?.baseUrl ?? "").trim().toLowerCase();

  if (provider === "openai") {
    return api === "openai-responses" && (!baseUrl || isOpenAIResponsesBaseUrl(baseUrl));
  }
  if (provider === "openai-codex") {
    return (
      api === "openai-codex-responses" &&
      (!baseUrl || isOpenAIResponsesBaseUrl(baseUrl) || isOpenAICodexBaseUrl(baseUrl))
    );
  }
  return false;
}

function isOpenAIResponsesBaseUrl(baseUrl: string): boolean {
  return /^https:\/\/api\.openai\.com(?:\/v1)?(?:\/|$)/i.test(baseUrl);
}

function isOpenAICodexBaseUrl(baseUrl: string): boolean {
  return /^https:\/\/chatgpt\.com\/backend-api(?:\/|$)/i.test(baseUrl);
}

type NormalizeOpenAIStrictCompatOptions = {
  promoteEmptyObject: boolean;
};

const OPENAI_STRICT_COMPAT_SCHEMA_MAP_KEYS = new Set([
  "$defs",
  "definitions",
  "dependentSchemas",
  "patternProperties",
  "properties",
]);

const OPENAI_STRICT_COMPAT_SCHEMA_NESTED_KEYS = new Set([
  "additionalProperties",
  "allOf",
  "anyOf",
  "contains",
  "else",
  "if",
  "items",
  "not",
  "oneOf",
  "prefixItems",
  "propertyNames",
  "then",
  "unevaluatedItems",
  "unevaluatedProperties",
]);

function normalizeOpenAIStrictCompatSchemaMap(schema: unknown): unknown {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return schema;
  }

  let changed = false;
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    const next = normalizeOpenAIStrictCompatSchemaRecursive(value, {
      promoteEmptyObject: false,
    });
    normalized[key] = next;
    changed ||= next !== value;
  }
  return changed ? normalized : schema;
}

function normalizeOpenAIStrictCompatSchemaRecursive(
  schema: unknown,
  options: NormalizeOpenAIStrictCompatOptions,
): unknown {
  if (Array.isArray(schema)) {
    let changed = false;
    const normalized = schema.map((entry) => {
      const next = normalizeOpenAIStrictCompatSchemaRecursive(entry, {
        promoteEmptyObject: false,
      });
      changed ||= next !== entry;
      return next;
    });
    return changed ? normalized : schema;
  }
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  const record = schema as Record<string, unknown>;
  let changed = false;
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    const next = OPENAI_STRICT_COMPAT_SCHEMA_MAP_KEYS.has(key)
      ? normalizeOpenAIStrictCompatSchemaMap(value)
      : OPENAI_STRICT_COMPAT_SCHEMA_NESTED_KEYS.has(key)
        ? normalizeOpenAIStrictCompatSchemaRecursive(value, {
            promoteEmptyObject: false,
          })
        : value;
    normalized[key] = next;
    changed ||= next !== value;
  }

  if (Object.keys(normalized).length === 0) {
    if (!options.promoteEmptyObject) {
      return schema;
    }
    return {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    };
  }

  const hasObjectShapeHints =
    !("type" in normalized) &&
    ((normalized.properties &&
      typeof normalized.properties === "object" &&
      !Array.isArray(normalized.properties)) ||
      Array.isArray(normalized.required));
  if (hasObjectShapeHints) {
    normalized.type = "object";
    changed = true;
  }
  if (normalized.type === "object" && !("properties" in normalized)) {
    normalized.properties = {};
    changed = true;
  }

  const hasEmptyProperties =
    normalized.properties &&
    typeof normalized.properties === "object" &&
    !Array.isArray(normalized.properties) &&
    Object.keys(normalized.properties as Record<string, unknown>).length === 0;

  if (normalized.type === "object" && !Array.isArray(normalized.required) && hasEmptyProperties) {
    normalized.required = [];
    changed = true;
  }

  if (
    normalized.type === "object" &&
    hasEmptyProperties &&
    !("additionalProperties" in normalized)
  ) {
    normalized.additionalProperties = false;
    changed = true;
  }

  return changed ? normalized : schema;
}

export function findOpenAIStrictSchemaViolations(
  schema: unknown,
  path: string,
  options?: { requireObjectRoot?: boolean },
): string[] {
  if (Array.isArray(schema)) {
    if (options?.requireObjectRoot) {
      return [`${path}.type`];
    }
    return schema.flatMap((item, index) =>
      findOpenAIStrictSchemaViolations(item, `${path}[${index}]`),
    );
  }
  if (!schema || typeof schema !== "object") {
    if (options?.requireObjectRoot) {
      return [`${path}.type`];
    }
    return [];
  }

  const record = schema as Record<string, unknown>;
  const violations: string[] = [];
  for (const key of ["anyOf", "oneOf", "allOf"] as const) {
    if (Array.isArray(record[key])) {
      violations.push(`${path}.${key}`);
    }
  }
  if (Array.isArray(record.type)) {
    violations.push(`${path}.type`);
  }

  const properties =
    record.properties && typeof record.properties === "object" && !Array.isArray(record.properties)
      ? (record.properties as Record<string, unknown>)
      : undefined;

  if (record.type === "object") {
    if (record.additionalProperties !== false) {
      violations.push(`${path}.additionalProperties`);
    }
    const required = Array.isArray(record.required)
      ? record.required.filter((entry): entry is string => typeof entry === "string")
      : undefined;
    if (!required) {
      violations.push(`${path}.required`);
    } else if (properties) {
      const requiredSet = new Set(required);
      for (const key of Object.keys(properties)) {
        if (!requiredSet.has(key)) {
          violations.push(`${path}.required.${key}`);
        }
      }
    }
  }

  if (properties) {
    for (const [key, value] of Object.entries(properties)) {
      violations.push(...findOpenAIStrictSchemaViolations(value, `${path}.properties.${key}`));
    }
  }

  for (const [key, value] of Object.entries(record)) {
    if (key === "properties") {
      continue;
    }
    if (value && typeof value === "object") {
      violations.push(...findOpenAIStrictSchemaViolations(value, `${path}.${key}`));
    }
  }

  return violations;
}

export function inspectOpenAIToolSchemas(
  ctx: ProviderNormalizeToolSchemasContext,
): ProviderToolSchemaDiagnostic[] {
  if (!shouldApplyOpenAIToolCompat(ctx)) {
    return [];
  }
  // Native OpenAI transports fall back to `strict: false` when any tool schema is not
  // strict-compatible, so these findings are expected for optional-heavy tool schemas.
  return [];
}

/** DeepSeek 不支持的 Schema 关键字集合 */
export const DEEPSEEK_UNSUPPORTED_SCHEMA_KEYWORDS = new Set(["anyOf", "oneOf"]);

function isNullSchemaVariant(schema: unknown): boolean {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return false;
  }
  const record = schema as Record<string, unknown>;
  if (record.type === "null") {
    return true;
  }
  if (Array.isArray(record.type) && record.type.length === 1 && record.type[0] === "null") {
    return true;
  }
  if ("const" in record && record.const === null) {
    return true;
  }
  return Array.isArray(record.enum) && record.enum.length === 1 && record.enum[0] === null;
}

function normalizeDeepSeekSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    let changed = false;
    const normalized = schema.map((entry) => {
      const next = normalizeDeepSeekSchema(entry);
      changed ||= next !== entry;
      return next;
    });
    return changed ? normalized : schema;
  }
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  const record = schema as Record<string, unknown>;
  const unionKey = Array.isArray(record.anyOf)
    ? "anyOf"
    : Array.isArray(record.oneOf)
      ? "oneOf"
      : undefined;

  let changed = false;
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === "anyOf" || key === "oneOf") {
      if (key === unionKey) {
        changed = true;
        continue;
      }
    }
    const next = normalizeDeepSeekSchema(value);
    normalized[key] = next;
    changed ||= next !== value;
  }

  if (!unionKey) {
    return changed ? normalized : schema;
  }

  const variants = record[unionKey] as unknown[];
  const normalizedVariants = variants.map((entry) => normalizeDeepSeekSchema(entry));
  const nonNullVariants = normalizedVariants.filter((entry) => !isNullSchemaVariant(entry));
  const hasNullVariant = nonNullVariants.length < normalizedVariants.length;

  // Preserve string-const unions as a flat string enum so DeepSeek tool
  // callers still see every allowed literal. Without this, a Typebox
  // `Type.Union([Type.Literal("a"), Type.Literal("b"), ...])` collapses to
  // only the first const and the model can never pick any other value.
  if (nonNullVariants.length > 1 && nonNullVariants.every((entry) => isStringConstVariant(entry))) {
    const enumValues = nonNullVariants.map((entry) => (entry as { const: string }).const);
    const merged: Record<string, unknown> = {
      ...normalized,
      type: "string",
      enum: enumValues,
    };
    if (hasNullVariant) {
      merged.nullable = true;
    }
    return merged;
  }

  const selected = nonNullVariants[0] ?? normalizedVariants[0];
  if (!selected || typeof selected !== "object" || Array.isArray(selected)) {
    return normalized;
  }

  const merged = {
    ...(selected as Record<string, unknown>),
    ...normalized,
  };
  if (hasNullVariant) {
    merged.nullable = true;
  }
  return merged;
}

function isStringConstVariant(entry: unknown): entry is { const: string } {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return false;
  }
  const record = entry as Record<string, unknown>;
  return typeof record.const === "string";
}

/**
 * 规范化 DeepSeek 工具 Schema
 * 将 anyOf/oneOf 联合类型展平为单个类型
 * 对于字符串字面量联合，转换为 enum 类型
 */
export function normalizeDeepSeekToolSchemas(
  ctx: ProviderNormalizeToolSchemasContext,
): AnyAgentTool[] {
  return ctx.tools.map((tool) => {
    if (!tool.parameters || typeof tool.parameters !== "object") {
      return tool;
    }
    const parameters = normalizeDeepSeekSchema(tool.parameters);
    return parameters === tool.parameters
      ? tool
      : {
          ...tool,
          parameters: parameters as TSchema,
        };
  });
}

export function inspectDeepSeekToolSchemas(
  ctx: ProviderNormalizeToolSchemasContext,
): ProviderToolSchemaDiagnostic[] {
  return ctx.tools.flatMap((tool, toolIndex) => {
    const violations = findUnsupportedSchemaKeywords(
      tool.parameters,
      `${tool.name}.parameters`,
      DEEPSEEK_UNSUPPORTED_SCHEMA_KEYWORDS,
    );
    if (violations.length === 0) {
      return [];
    }
    return [{ toolName: tool.name, toolIndex, violations }];
  });
}

/** Provider 工具兼容性族类型 */
export type ProviderToolCompatFamily = "deepseek" | "gemini" | "openai";

/**
 * 构建指定兼容性族的工具 Schema 处理钩子
 * 返回 normalizeToolSchemas 和 inspectToolSchemas 两个函数
 *
 * @param family - 兼容性族名称
 * @returns 包含规范化和检测函数的对象
 */
export function buildProviderToolCompatFamilyHooks(family: ProviderToolCompatFamily): {
  normalizeToolSchemas: (ctx: ProviderNormalizeToolSchemasContext) => AnyAgentTool[];
  inspectToolSchemas: (ctx: ProviderNormalizeToolSchemasContext) => ProviderToolSchemaDiagnostic[];
} {
  switch (family) {
    case "deepseek":
      return {
        normalizeToolSchemas: normalizeDeepSeekToolSchemas,
        inspectToolSchemas: inspectDeepSeekToolSchemas,
      };
    case "gemini":
      return {
        normalizeToolSchemas: normalizeGeminiToolSchemas,
        inspectToolSchemas: inspectGeminiToolSchemas,
      };
    case "openai":
      return {
        normalizeToolSchemas: normalizeOpenAIToolSchemas,
        inspectToolSchemas: inspectOpenAIToolSchemas,
      };
  }
  throw new Error("Unsupported provider tool compatibility family");
}
