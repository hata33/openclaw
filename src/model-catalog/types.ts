/**
 * @file 模型目录（Model Catalog）核心类型定义
 *
 * 本文件定义了 OpenClaw 模型目录系统的所有基础类型。模型目录是 OpenClaw 的核心组件之一，
 * 负责管理所有可用 AI 模型的元数据，包括模型的能力、定价、状态等信息。
 *
 * 主要类型层次：
 * - 模型级别：ModelCatalogModel - 单个模型的完整描述
 * - 提供商级别：ModelCatalogProvider - 一个 AI 提供商及其所有模型
 * - 目录级别：ModelCatalog - 整个模型目录的顶层结构
 * - 规范化行：NormalizedModelCatalogRow - 经过标准化处理后的模型行记录
 *
 * 设计原则：
 * - 所有字段都是可选的，以支持渐进式数据填充（从最小配置到完整配置）
 * - 状态字段使用枚举类型，便于后续扩展和类型安全检查
 * - 来源（Source）和发现模式（Discovery）区分了模型信息的不同获取渠道
 */

import type { ModelApi, ModelCompatConfig, ModelMediaInputConfig } from "../config/types.models.js";

/** 模型支持的输入类型：文本、图片、文档 */
export type ModelCatalogInput = "text" | "image" | "document";
/**
 * 模型发现模式：
 * - static: 静态定义，不会自动更新（如 manifest 中的硬编码模型列表）
 * - refreshable: 可刷新的，定期从远程获取最新数据（如 provider-index）
 * - runtime: 运行时发现，通过 API 调用动态获取模型列表
 */
export type ModelCatalogDiscovery = "static" | "refreshable" | "runtime";

/** 模型可用状态：可用、预览版、已弃用、已禁用 */
export type ModelCatalogStatus = "available" | "preview" | "deprecated" | "disabled";

/**
 * 模型数据来源：
 * - manifest: 插件清单文件中定义
 * - provider-index: 来自 OpenClaw 提供商索引
 * - cache: 缓存数据
 * - config: 用户配置文件
 * - runtime-refresh: 运行时刷新获取
 */
export type ModelCatalogSource =
  | "manifest"
  | "provider-index"
  | "cache"
  | "config"
  | "runtime-refresh";

/**
 * 统一模型目录的模型类型分类：
 * - text: 文本生成模型
 * - image_generation: 图像生成模型
 * - video_generation: 视频生成模型
 * - music_generation: 音乐生成模型
 */
export type UnifiedModelCatalogKind =
  | "text"
  | "image_generation"
  | "video_generation"
  | "music_generation";

/**
 * 统一模型目录的数据来源：
 * - manifest/provider-index/static/cache/configured: 与 ModelCatalogSource 对应
 * - live: 实时从 Provider API 获取
 */
export type UnifiedModelCatalogSource =
  | "manifest"
  | "provider-index"
  | "static"
  | "live"
  | "cache"
  | "configured"
  | "runtime-refresh";

/**
 * 统一模型目录条目 - 跨所有模型类型（文本/图像/视频/音乐）的统一表示
 * 这是模型目录对外暴露的标准化数据结构，用于 UI 展示和模型选择
 *
 * @template TCapabilities - 模型特定能力的泛型参数，默认为 unknown
 */
export type UnifiedModelCatalogEntry<TCapabilities = unknown> = {
  kind: UnifiedModelCatalogKind;
  provider: string;
  model: string;
  label?: string;
  source: UnifiedModelCatalogSource;
  default?: boolean;
  configured?: boolean;
  capabilities?: TCapabilities;
  modes?: readonly string[];
  authEnvVars?: readonly string[];
  docsPath?: string;
  fetchedAt?: number;
  expiresAt?: number;
  warnings?: readonly string[];
};

/** 分层定价结构 - 用于支持按使用量阶梯计费的模型 */
export type ModelCatalogTieredCost = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  range: [number, number] | [number];
};

/** 模型定价信息（单位：美元/每百万 token） */
export type ModelCatalogCost = {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  tieredPricing?: ModelCatalogTieredCost[];
};

/**
 * 单个模型的完整描述 - 模型目录中最核心的数据结构
 * 包含模型的所有元数据：标识、能力、定价、状态等
 */
export type ModelCatalogModel = {
  id: string;
  name?: string;
  api?: ModelApi;
  baseUrl?: string;
  headers?: Record<string, string>;
  input?: ModelCatalogInput[];
  reasoning?: boolean;
  contextWindow?: number;
  contextTokens?: number;
  maxTokens?: number;
  cost?: ModelCatalogCost;
  compat?: ModelCompatConfig;
  mediaInput?: ModelMediaInputConfig;
  status?: ModelCatalogStatus;
  statusReason?: string;
  replaces?: string[];
  replacedBy?: string;
  tags?: string[];
};

/**
 * AI 提供商配置 - 包含提供商级别的默认设置和模型列表
 * 提供商级别的 api/baseUrl/headers 会作为该提供商下所有模型的默认值
 */
export type ModelCatalogProvider = {
  baseUrl?: string;
  api?: ModelApi;
  headers?: Record<string, string>;
  models: ModelCatalogModel[];
};

/**
 * 提供商别名 - 允许将一个提供商 ID 映射到另一个提供商
 * 例如：将 "openrouter" 映射到其实际的 provider/api/baseUrl
 */
export type ModelCatalogAlias = {
  provider: string;
  api?: ModelApi;
  baseUrl?: string;
};

/**
 * 模型抑制规则 - 用于在特定条件下隐藏某些模型
 * 例如：在某些 baseUrl 下不显示特定模型，避免兼容性问题
 */
export type ModelCatalogSuppression = {
  provider: string;
  model: string;
  reason?: string;
  when?: {
    baseUrlHosts?: string[];
    providerConfigApiIn?: string[];
  };
};

/**
 * 完整的模型目录结构 - 顶层数据结构
 * 包含所有提供商、别名、抑制规则和发现配置
 */
export type ModelCatalog = {
  providers?: Record<string, ModelCatalogProvider>;
  aliases?: Record<string, ModelCatalogAlias>;
  suppressions?: ModelCatalogSuppression[];
  discovery?: Record<string, ModelCatalogDiscovery>;
  runtimeAugment?: boolean;
};

/**
 * 规范化后的模型目录行 - 所有字段都已填充默认值
 * 这是经过 normalizeModelCatalog 处理后的标准化数据格式
 * 用于统一不同来源（manifest、config、runtime 等）的模型数据
 */
export type NormalizedModelCatalogRow = {
  provider: string;
  id: string;
  ref: string;
  mergeKey: string;
  name: string;
  source: ModelCatalogSource;
  input: ModelCatalogInput[];
  reasoning: boolean;
  status: ModelCatalogStatus;
  api?: ModelApi;
  baseUrl?: string;
  headers?: Record<string, string>;
  contextWindow?: number;
  contextTokens?: number;
  maxTokens?: number;
  cost?: ModelCatalogCost;
  compat?: ModelCompatConfig;
  mediaInput?: ModelMediaInputConfig;
  statusReason?: string;
  replaces?: string[];
  replacedBy?: string;
  tags?: string[];
};
