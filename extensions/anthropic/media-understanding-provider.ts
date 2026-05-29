/**
 * @fileoverview Anthropic 媒体理解提供者（Media Understanding Provider）
 *
 * 本文件定义了 Anthropic 的媒体理解能力，主要用于图像描述和分析。
 * 通过 MediaUnderstandingProvider 接口，OpenClaw 可以利用 Claude 模型
 * 来理解图片内容、生成图像描述等。
 *
 * 支持的能力：
 * - 图像描述（单张和批量）
 * - 原生 PDF 文档输入（nativeDocumentInputs）
 *
 * 自动优先级设置为 20（image），意味着当用户请求图像理解时，
 * 系统会优先考虑使用 Anthropic 提供者（如果已配置）。
 */

import {
  describeImageWithModel,
  describeImagesWithModel,
  type MediaUnderstandingProvider,
} from "openclaw/plugin-sdk/media-understanding";

/**
 * Anthropic 媒体理解提供者实例
 *
 * 注册了 Anthropic 的图像理解能力，使用 Claude 模型进行图像分析。
 * 默认使用 claude-opus-4-7 作为图像理解的模型，因为它在视觉任务上表现最佳。
 */
export const anthropicMediaUnderstandingProvider: MediaUnderstandingProvider = {
  /** 提供者标识符 */
  id: "anthropic",
  /** 支持的媒体类型 - 目前仅支持图像 */
  capabilities: ["image"],
  /** 各媒体类型的默认模型 - 图像理解默认使用 Opus 4.7 */
  defaultModels: { image: "claude-opus-4-7" },
  /**
   * 自动选择优先级
   * image: 20 表示在多个可用提供者中，Anthropic 的图像能力优先级为 20
   * 数值越高，越优先被选择
   */
  autoPriority: { image: 20 },
  /**
   * 原生文档输入支持
   * "pdf" 表示 Claude 可以直接处理 PDF 文档，无需先转换为图片
   */
  nativeDocumentInputs: ["pdf"],
  /** 图像描述函数 - 单张图像 */
  describeImage: describeImageWithModel,
  /** 图像描述函数 - 批量图像 */
  describeImages: describeImagesWithModel,
};
