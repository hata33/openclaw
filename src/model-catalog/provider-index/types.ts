/**
 * @file Provider 索引类型定义
 *
 * 定义 OpenClaw Provider 索引中所有数据结构的类型。
 * Provider 索引是一个轻量级元数据数据库，用于在插件未安装时
 * 展示 Provider 的基本信息和预览模型列表。
 *
 * 主要类型：
 * - OpenClawProviderIndex: 索引顶层结构
 * - OpenClawProviderIndexProvider: 单个 Provider 的完整信息
 * - OpenClawProviderIndexPlugin: Provider 关联的插件信息
 * - OpenClawProviderIndexProviderAuthChoice: Provider 支持的认证方式
 */

import type { ModelCatalogProvider } from "../types.js";

/** 插件安装规范 - 支持 ClawHub 和 NPM 两种安装渠道 */
export type OpenClawProviderIndexPluginInstall = {
  clawhubSpec?: string;
  npmSpec?: string;
  defaultChoice?: "clawhub" | "npm";
  minHostVersion?: string;
  expectedIntegrity?: string;
};

export type OpenClawProviderIndexPlugin = {
  id: string;
  package?: string;
  source?: string;
  install?: OpenClawProviderIndexPluginInstall;
};

export type OpenClawProviderIndexProviderAuthChoice = {
  method: string;
  choiceId: string;
  choiceLabel: string;
  choiceHint?: string;
  assistantPriority?: number;
  assistantVisibility?: "visible" | "manual-only";
  groupId?: string;
  groupLabel?: string;
  groupHint?: string;
  optionKey?: string;
  cliFlag?: string;
  cliOption?: string;
  cliDescription?: string;
  onboardingScopes?: readonly ("text-inference" | "image-generation" | "music-generation")[];
};

export type OpenClawProviderIndexProvider = {
  id: string;
  name: string;
  plugin: OpenClawProviderIndexPlugin;
  docs?: string;
  categories?: readonly string[];
  authChoices?: readonly OpenClawProviderIndexProviderAuthChoice[];
  previewCatalog?: ModelCatalogProvider;
};

export type OpenClawProviderIndex = {
  version: number;
  providers: Readonly<Record<string, OpenClawProviderIndexProvider>>;
};
