/**
 * @fileoverview Claude CLI 共享配置与工具函数（CLI Shared）
 *
 * 本文件包含 Claude CLI 后端的共享常量、类型定义和工具函数。
 * 被 cli-backend.ts、cli-migration.ts、cli-catalog.ts 等多个模块引用。
 *
 * 核心功能：
 * 1. 环境变量清理列表（CLAUDE_CLI_CLEAR_ENV）
 *    - Claude CLI 会读取环境变量来决定认证、Provider 和遥测行为
 *    - 为防止宿主 shell 的环境变量干扰 OpenClaw 管理的 CLI 运行，
 *      启动前需要清理这些变量
 *
 * 2. 权限模式管理（Permission Mode）
 *    - 根据 OpenClaw 的安全配置自动设置 Claude CLI 的权限模式
 *    - 当 OpenClaw 配置为完全信任模式时，自动启用 bypassPermissions
 *
 * 3. 设置源标准化（Setting Sources）
 *    - 确保 --setting-sources 参数始终使用 "user"，避免使用项目级设置
 *    - 这保证了 Claude CLI 行为的一致性和可预测性
 *
 * 4. 思考等级到 effort 参数的映射
 *    - OpenClaw 的 thinking level（minimal/low/medium/high/xhigh/max）
 *      映射到 Claude CLI 的 effort 参数
 *
 * 5. 后端配置标准化
 *    - 对 CLI 后端配置进行规范化处理，统一权限模式和设置源
 */

import type {
  CliBackendConfig,
  CliBackendNormalizeConfigContext,
  CliBackendResolveExecutionArgsContext,
} from "openclaw/plugin-sdk/cli-backend";
import { normalizeOptionalLowercaseString } from "openclaw/plugin-sdk/string-coerce-runtime";
import { CLAUDE_CLI_BACKEND_ID } from "./cli-constants.js";
export {
  CLAUDE_CLI_BACKEND_ID,
  CLAUDE_CLI_DEFAULT_ALLOWLIST_REFS,
  CLAUDE_CLI_DEFAULT_MODEL_REF,
  CLAUDE_CLI_MODEL_ALIASES,
  CLAUDE_CLI_SESSION_ID_FIELDS,
} from "./cli-constants.js";

/**
 * Claude CLI 需要清理的环境变量列表
 *
 * Claude Code 在启动时会优先读取这些环境变量来决定：
 * - 认证方式（API key、OAuth token）
 * - Provider 路由（Bedrock、Vertex、Foundry）
 * - 配置目录和插件目录
 * - 遥测（OpenTelemetry）端点
 *
 * 为什么需要清理：
 * OpenClaw 管理的 Claude CLI 运行需要使用 OpenClaw 控制的认证和配置，
 * 而非继承宿主 shell 中可能存在的环境变量。
 * 例如，如果宿主 shell 设置了 ANTHROPIC_API_KEY，
 * Claude CLI 可能会使用该 key 而非 OpenClaw 管理的凭证。
 */
export const CLAUDE_CLI_CLEAR_ENV = [
  /* === 认证相关 === */
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_API_KEY_OLD",
  "ANTHROPIC_API_TOKEN",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_CUSTOM_HEADERS",
  "ANTHROPIC_OAUTH_TOKEN",
  "ANTHROPIC_UNIX_SOCKET",
  /* === Claude CLI 配置目录 === */
  "CLAUDE_CONFIG_DIR",
  "CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR",
  "CLAUDE_CODE_ENTRYPOINT",
  /* === OAuth 相关 === */
  "CLAUDE_CODE_OAUTH_REFRESH_TOKEN",
  "CLAUDE_CODE_OAUTH_SCOPES",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR",
  /* === 插件和远程模式 === */
  "CLAUDE_CODE_PLUGIN_CACHE_DIR",
  "CLAUDE_CODE_PLUGIN_SEED_DIR",
  "CLAUDE_CODE_REMOTE",
  "CLAUDE_CODE_USE_COWORK_PLUGINS",
  /* === Provider 路由（Bedrock/Foundry/Vertex） === */
  "CLAUDE_CODE_USE_BEDROCK",
  "CLAUDE_CODE_USE_FOUNDRY",
  "CLAUDE_CODE_USE_VERTEX",
  /* === OpenTelemetry 遥测配置 === */
  "OTEL_EXPORTER_OTLP_ENDPOINT",
  "OTEL_EXPORTER_OTLP_HEADERS",
  "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
  "OTEL_EXPORTER_OTLP_LOGS_HEADERS",
  "OTEL_EXPORTER_OTLP_LOGS_PROTOCOL",
  "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
  "OTEL_EXPORTER_OTLP_METRICS_HEADERS",
  "OTEL_EXPORTER_OTLP_METRICS_PROTOCOL",
  "OTEL_EXPORTER_OTLP_PROTOCOL",
  "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
  "OTEL_EXPORTER_OTLP_TRACES_HEADERS",
  "OTEL_EXPORTER_OTLP_TRACES_PROTOCOL",
  "OTEL_LOGS_EXPORTER",
  "OTEL_METRICS_EXPORTER",
  "OTEL_SDK_DISABLED",
  "OTEL_TRACES_EXPORTER",
] as const;

/** 旧版权限跳过参数（已废弃，但仍需识别和过滤） */
const CLAUDE_LEGACY_SKIP_PERMISSIONS_ARG = "--dangerously-skip-permissions";
/** 权限模式参数名 */
const CLAUDE_PERMISSION_MODE_ARG = "--permission-mode";
/** 设置源参数名 */
const CLAUDE_SETTING_SOURCES_ARG = "--setting-sources";
/** Effort 参数名 */
const CLAUDE_EFFORT_ARG = "--effort";
/** 安全的设置源值 - 只使用用户级设置 */
const CLAUDE_SAFE_SETTING_SOURCES = "user";
/** 绕过权限模式值 - OpenClaw 完全信任模式下使用 */
const CLAUDE_BYPASS_PERMISSION_MODE = "bypassPermissions";

/**
 * Claude CLI 思考等级类型
 * 对应 Claude CLI 的 --effort 参数值
 */
type ClaudeCliEffort = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * 判断给定的 Provider ID 是否为 Claude CLI
 *
 * @param providerId - Provider 标识符
 * @returns 是否为 Claude CLI Provider
 */
export function isClaudeCliProvider(providerId: string): boolean {
  return normalizeOptionalLowercaseString(providerId) === CLAUDE_CLI_BACKEND_ID;
}

/**
 * 检查 OpenClaw 是否配置为完全信任模式（YOLO 模式）
 *
 * YOLO 模式的条件：security === "full" 且 ask === "off"
 * 在此模式下，工具执行不需要用户确认，Claude CLI 也可以启用 bypassPermissions。
 *
 * @param context - 配置标准化上下文（可选，包含 agentId 用于查找 agent 级配置）
 * @returns 是否为 YOLO 模式
 */
function isOpenClawRequestedYolo(context?: CliBackendNormalizeConfigContext): boolean {
  /* 优先查找 agent 级别的 exec 配置 */
  const agentExec = context?.agentId
    ? context.config?.agents?.list?.find((agent) => agent.id === context.agentId)?.tools?.exec
    : undefined;
  /* 回退到全局 exec 配置 */
  const exec = agentExec ?? context?.config?.tools?.exec;
  const security = exec?.security ?? "full";
  const ask = exec?.ask ?? "off";
  return security === "full" && ask === "off";
}

/**
 * 解析 Claude CLI 的权限模式
 *
 * 当 OpenClaw 配置为 YOLO 模式时，返回 bypassPermissions 权限模式，
 * 让 Claude CLI 无需用户确认即可执行工具操作。
 *
 * @param context - 配置标准化上下文
 * @returns 权限模式解析结果，包含 mode 和是否覆盖已有配置的标志
 */
export function resolveClaudePermissionMode(context?: CliBackendNormalizeConfigContext): {
  mode?: string;
  overrideExisting: boolean;
} {
  return isOpenClawRequestedYolo(context)
    ? { mode: CLAUDE_BYPASS_PERMISSION_MODE, overrideExisting: false }
    : { overrideExisting: false };
}

/**
 * 标准化 Claude CLI 的权限相关参数
 *
 * 处理逻辑：
 * 1. 移除已废弃的 --dangerously-skip-permissions 参数
 * 2. 解析现有的 --permission-mode 参数
 * 3. 根据 options.mode 决定是否添加或覆盖权限模式
 *
 * @param args - 原始参数列表
 * @param options - 权限模式选项
 * @returns 标准化后的参数列表
 */
export function normalizeClaudePermissionArgs(
  args?: string[],
  options?: { mode?: string; overrideExisting?: boolean },
): string[] | undefined {
  if (!args) {
    return options?.mode ? [CLAUDE_PERMISSION_MODE_ARG, options.mode] : args;
  }
  const normalized: string[] = [];
  let hasPermissionMode = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    /* 移除已废弃的 --dangerously-skip-permissions 参数 */
    if (arg === CLAUDE_LEGACY_SKIP_PERMISSIONS_ARG) {
      continue;
    }
    /* 处理 --permission-mode value 形式 */
    if (arg === CLAUDE_PERMISSION_MODE_ARG) {
      const maybeValue = args[i + 1];
      if (
        typeof maybeValue === "string" &&
        maybeValue.trim().length > 0 &&
        !maybeValue.startsWith("-")
      ) {
        hasPermissionMode = true;
        /* 如果不覆盖已有配置，保留原有值 */
        if (!options?.overrideExisting) {
          normalized.push(arg);
          normalized.push(maybeValue);
        }
        i += 1; /* 跳过值 */
      }
      continue;
    }
    /* 处理 --permission-mode=value 形式 */
    if (arg.startsWith(`${CLAUDE_PERMISSION_MODE_ARG}=`)) {
      const maybeValue = arg.slice(`${CLAUDE_PERMISSION_MODE_ARG}=`.length).trim();
      if (maybeValue.length > 0 && !maybeValue.startsWith("-")) {
        hasPermissionMode = true;
        if (!options?.overrideExisting) {
          normalized.push(`${CLAUDE_PERMISSION_MODE_ARG}=${maybeValue}`);
        }
      }
      continue;
    }
    normalized.push(arg);
  }
  /* 如果需要设置权限模式且当前没有或允许覆盖 */
  if (options?.mode && (!hasPermissionMode || options.overrideExisting)) {
    normalized.push(CLAUDE_PERMISSION_MODE_ARG, options.mode);
  }
  return normalized;
}

/**
 * 标准化 Claude CLI 的设置源参数
 *
 * 确保 --setting-sources 参数始终使用 "user" 值，
 * 避免使用项目级设置（project settings）导致行为不一致。
 *
 * @param args - 原始参数列表
 * @returns 标准化后的参数列表
 */
export function normalizeClaudeSettingSourcesArgs(args?: string[]): string[] | undefined {
  if (!args) {
    return args;
  }
  const normalized: string[] = [];
  let hasSettingSources = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    /* 处理 --setting-sources value 形式 */
    if (arg === CLAUDE_SETTING_SOURCES_ARG) {
      const maybeValue = args[i + 1];
      if (
        typeof maybeValue === "string" &&
        maybeValue.trim().length > 0 &&
        !maybeValue.startsWith("-")
      ) {
        hasSettingSources = true;
        /* 强制使用 "user" 设置源 */
        normalized.push(arg, CLAUDE_SAFE_SETTING_SOURCES);
        i += 1;
      }
      continue;
    }
    /* 处理 --setting-sources=value 形式 */
    if (arg.startsWith(`${CLAUDE_SETTING_SOURCES_ARG}=`)) {
      hasSettingSources = true;
      normalized.push(`${CLAUDE_SETTING_SOURCES_ARG}=${CLAUDE_SAFE_SETTING_SOURCES}`);
      continue;
    }
    normalized.push(arg);
  }
  /* 如果没有设置源参数，添加默认值 */
  if (!hasSettingSources) {
    normalized.push(CLAUDE_SETTING_SOURCES_ARG, CLAUDE_SAFE_SETTING_SOURCES);
  }
  return normalized;
}

/**
 * 将 OpenClaw 的 thinking level 映射到 Claude CLI 的 effort 参数
 *
 * 映射关系：
 * - minimal/low → low
 * - adaptive/medium → medium
 * - high → high
 * - xhigh → xhigh
 * - max → max
 *
 * @param thinkingLevel - OpenClaw 的思考等级
 * @returns Claude CLI 的 effort 值，不支持时返回 undefined
 */
export function mapClaudeCliThinkingLevelToEffort(
  thinkingLevel?: string | null,
): ClaudeCliEffort | undefined {
  switch (normalizeOptionalLowercaseString(thinkingLevel)) {
    case "minimal":
    case "low":
      return "low";
    case "adaptive":
    case "medium":
      return "medium";
    case "high":
      return "high";
    case "xhigh":
      return "xhigh";
    case "max":
      return "max";
    default:
      return undefined;
  }
}

/**
 * 从参数列表中移除已有的 effort 参数
 *
 * @param args - 原始参数列表
 * @returns 移除 effort 参数后的列表
 */
function stripClaudeEffortArgs(args: readonly string[]): string[] {
  const normalized: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? "";
    /* 跳过 --effort value 形式 */
    if (arg === CLAUDE_EFFORT_ARG) {
      const maybeValue = args[i + 1];
      if (
        typeof maybeValue === "string" &&
        maybeValue.trim().length > 0 &&
        !maybeValue.startsWith("-")
      ) {
        i += 1; /* 跳过值 */
      }
      continue;
    }
    /* 跳过 --effort=value 形式 */
    if (arg.startsWith(`${CLAUDE_EFFORT_ARG}=`)) {
      continue;
    }
    normalized.push(arg);
  }
  return normalized;
}

/**
 * 解析 Claude CLI 的执行参数
 *
 * 根据 thinking level 为 Claude CLI 添加 --effort 参数。
 * 先移除已有的 effort 参数，再添加新的。
 *
 * @param context - 执行参数解析上下文，包含 baseArgs 和 thinkingLevel
 * @returns 最终的执行参数列表
 */
export function resolveClaudeCliExecutionArgs(
  context: CliBackendResolveExecutionArgsContext,
): string[] {
  const effort = mapClaudeCliThinkingLevelToEffort(context.thinkingLevel);
  if (!effort) {
    return [...context.baseArgs];
  }
  return [...stripClaudeEffortArgs(context.baseArgs), CLAUDE_EFFORT_ARG, effort];
}

/**
 * 标准化 Claude CLI 后端配置
 *
 * 对 CLI 后端配置进行规范化处理：
 * 1. 标准化设置源参数（强制使用 user 设置源）
 * 2. 标准化权限参数（根据 OpenClaw 安全配置设置权限模式）
 * 3. 设置默认的输出和输入格式
 * 4. 配置实时会话协议
 *
 * @param config - 原始 CLI 后端配置
 * @param context - 配置标准化上下文
 * @returns 标准化后的 CLI 后端配置
 */
export function normalizeClaudeBackendConfig(
  config: CliBackendConfig,
  context?: CliBackendNormalizeConfigContext,
): CliBackendConfig {
  const output = config.output ?? "jsonl";
  const input = config.input ?? "stdin";
  const permission = resolveClaudePermissionMode(context);
  return {
    ...config,
    /* 标准化启动参数：先设置源标准化，再权限标准化 */
    args: normalizeClaudePermissionArgs(normalizeClaudeSettingSourcesArgs(config.args), permission),
    /* 标准化恢复会话参数 */
    resumeArgs: normalizeClaudePermissionArgs(
      normalizeClaudeSettingSourcesArgs(config.resumeArgs),
      permission,
    ),
    output,
    /* 当输出为 JSONL 且输入为 stdin 时，使用 claude-stdio 实时会话协议 */
    liveSession:
      config.liveSession ?? (output === "jsonl" && input === "stdin" ? "claude-stdio" : undefined),
    input,
  };
}
