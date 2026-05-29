/**
 * @fileoverview Claude CLI 迁移逻辑（CLI Migration）
 *
 * 本文件实现了从 Claude CLI 本地认证到 OpenClaw 管理的认证配置的迁移逻辑。
 * 当用户选择 "Anthropic Claude CLI" 认证方式时，此模块负责：
 *
 * 1. 模型引用重写
 *    - 将 claude-cli/* 前缀的模型引用转换为 anthropic/* 前缀
 *    - 例如：claude-cli/claude-opus-4-7 → anthropic/claude-opus-4-7
 *    - 这使得模型引用在不同 Provider 间保持一致
 *
 * 2. 旧模型 ID 升级
 *    - 将已废弃的模型 ID（如 claude-3-opus）升级到最新版本
 *    - 确保用户不会使用已下线的模型
 *
 * 3. 认证配置迁移
 *    - 将 Claude CLI 的凭证（OAuth 或 token）转换为 OpenClaw 认证配置文件
 *    - 保留原有的认证配置以便回滚
 *
 * 4. 模型允许列表播种
 *    - 将 CLAUDE_CLI_DEFAULT_ALLOWLIST_REFS 中的模型添加到配置中
 *    - 为每个模型条目自动设置 claude-cli 运行时
 *
 * 迁移策略：
 * - 非破坏性：保留原有的 anthropic 认证配置
 * - 可回滚：用户可以随时切换回原有配置
 * - 自动化：尽可能自动处理，减少用户手动配置
 */

import {
  CLAUDE_CLI_PROFILE_ID,
  type OpenClawConfig,
  type ProviderAuthResult,
} from "openclaw/plugin-sdk/provider-auth";
import {
  isRecord,
  normalizeLowercaseStringOrEmpty,
} from "openclaw/plugin-sdk/string-coerce-runtime";
import { resolveClaudeCliAnthropicModelRefs } from "./claude-model-refs.js";
import {
  readClaudeCliCredentialsForSetup,
  readClaudeCliCredentialsForSetupNonInteractive,
} from "./cli-auth-seam.js";
import { CLAUDE_CLI_BACKEND_ID, CLAUDE_CLI_DEFAULT_ALLOWLIST_REFS } from "./cli-shared.js";

/** 配置中 agents.defaults.model 的类型 */
type AgentDefaultsModel = NonNullable<NonNullable<OpenClawConfig["agents"]>["defaults"]>["model"];
/** 配置中 agents.defaults.models 的类型 */
type AgentDefaultsModels = NonNullable<NonNullable<OpenClawConfig["agents"]>["defaults"]>["models"];
/** 配置中 agents.defaults.agentRuntime 的类型 */
type AgentDefaultsRuntimePolicy = NonNullable<
  NonNullable<OpenClawConfig["agents"]>["defaults"]
>["agentRuntime"];
/** Claude CLI 凭证类型 */
type ClaudeCliCredential = NonNullable<ReturnType<typeof readClaudeCliCredentialsForSetup>>;

/**
 * 将原始模型引用转换为 Anthropic 规范引用
 *
 * @param raw - 原始模型引用字符串
 * @returns 转换后的 Anthropic 模型引用，无法转换时返回 null
 */
function toAnthropicModelRef(raw: string): string | null {
  return resolveClaudeCliAnthropicModelRefs(raw)?.rewriteRef ?? null;
}

/**
 * 获取模型引用的所有可能的运行时引用
 *
 * @param raw - 原始模型引用字符串
 * @returns 运行时引用列表
 */
function toAnthropicRuntimeRefs(raw: string): string[] {
  return resolveClaudeCliAnthropicModelRefs(raw)?.runtimeRefs ?? [];
}

/**
 * 获取模型引用的选定引用（优先使用 rewriteRef，回退到 selectedRef）
 *
 * @param raw - 原始模型引用字符串
 * @returns 选定的模型引用
 */
function toAnthropicSelectedModelRef(raw: string): string | undefined {
  const resolved = resolveClaudeCliAnthropicModelRefs(raw);
  return resolved?.rewriteRef ?? resolved?.selectedRef;
}

/**
 * 重写模型选择配置
 *
 * 将模型选择配置中的 claude-cli/* 引用转换为 anthropic/* 引用。
 * 支持字符串形式和对象形式（含 primary 和 fallbacks）的模型配置。
 *
 * @param model - 原始模型选择配置
 * @returns 重写后的配置，包含 value、primary、runtimeRefs 和 changed 标志
 */
function rewriteModelSelection(model: AgentDefaultsModel): {
  value: AgentDefaultsModel;
  primary?: string;
  runtimeRefs: string[];
  changed: boolean;
} {
  /* 处理字符串形式的模型配置 */
  if (typeof model === "string") {
    const runtimeRefs = toAnthropicRuntimeRefs(model);
    const converted = toAnthropicModelRef(model);
    const selectedRef = converted ?? toAnthropicSelectedModelRef(model);
    return converted
      ? { value: converted, primary: converted, runtimeRefs, changed: true }
      : {
          value: model,
          ...(selectedRef ? { primary: selectedRef } : {}),
          runtimeRefs,
          changed: false,
        };
  }
  /* 处理非对象类型（null、undefined、数组等） */
  if (!model || typeof model !== "object" || Array.isArray(model)) {
    return { value: model, runtimeRefs: [], changed: false };
  }

  /* 处理对象形式的模型配置（含 primary 和 fallbacks） */
  const current = model as Record<string, unknown>;
  const next: Record<string, unknown> = { ...current };
  const runtimeRefs: string[] = [];
  let changed = false;
  let primary: string | undefined;

  /* 重写 primary 模型引用 */
  if (typeof current.primary === "string") {
    runtimeRefs.push(...toAnthropicRuntimeRefs(current.primary));
    const converted = toAnthropicModelRef(current.primary);
    if (converted) {
      next.primary = converted;
      primary = converted;
      changed = true;
    } else {
      primary = toAnthropicSelectedModelRef(current.primary);
    }
  }

  /* 重写 fallbacks 模型引用 */
  const currentFallbacks = current.fallbacks;
  if (Array.isArray(currentFallbacks)) {
    const nextFallbacks = currentFallbacks.map((entry) => {
      if (typeof entry !== "string") {
        return entry;
      }
      runtimeRefs.push(...toAnthropicRuntimeRefs(entry));
      const converted = toAnthropicModelRef(entry);
      return converted ?? entry;
    });
    if (nextFallbacks.some((entry, index) => entry !== currentFallbacks[index])) {
      next.fallbacks = nextFallbacks;
      changed = true;
    }
  }

  return {
    value: changed ? next : model,
    ...(primary ? { primary } : {}),
    runtimeRefs,
    changed,
  };
}

/**
 * 重写模型条目映射
 *
 * 将 models 配置中的 claude-cli/* 键转换为 anthropic/* 键。
 * 如果转换后的键已存在，保留原有条目；否则创建新条目。
 * 删除以 claude-cli/ 开头的旧键。
 *
 * @param models - 原始模型条目映射
 * @returns 重写后的映射，包含迁移的引用和运行时引用
 */
function rewriteModelEntryMap(models: Record<string, unknown> | undefined): {
  value: Record<string, unknown> | undefined;
  migrated: string[];
  runtimeRefs: string[];
} {
  if (!models) {
    return { value: models, migrated: [], runtimeRefs: [] };
  }

  const next = { ...models };
  const migrated: string[] = [];
  const runtimeRefs: string[] = [];

  for (const [rawKey, value] of Object.entries(models)) {
    runtimeRefs.push(...toAnthropicRuntimeRefs(rawKey));
    const converted = toAnthropicModelRef(rawKey);
    if (!converted) {
      continue;
    }
    if (converted === rawKey) {
      continue;
    }
    /* 如果转换后的键不存在，添加新条目 */
    if (!(converted in next)) {
      next[converted] = value;
    }
    /* 删除以 claude-cli/ 开头的旧键 */
    if (normalizeLowercaseStringOrEmpty(rawKey).startsWith(`${CLAUDE_CLI_BACKEND_ID}/`)) {
      delete next[rawKey];
    }
    migrated.push(converted);
  }

  return {
    value: migrated.length > 0 || runtimeRefs.length > 0 ? next : models,
    migrated,
    runtimeRefs,
  };
}

/**
 * 为 Claude CLI 模型播种允许列表
 *
 * 将 CLAUDE_CLI_DEFAULT_ALLOWLIST_REFS 中的模型添加到 models 配置中，
 * 并为每个模型条目自动设置 claude-cli 运行时。
 *
 * @param models - 现有的模型配置
 * @param selectedRefs - 用户选定的模型引用（额外添加）
 * @returns 更新后的模型配置
 */
function seedClaudeCliAllowlist(
  models: NonNullable<AgentDefaultsModels>,
  selectedRefs: readonly string[] = [],
): NonNullable<AgentDefaultsModels> {
  const next = { ...models };
  const runtimeRefs = new Set<string>();
  /* 将允许列表中的引用转换为 Anthropic 规范引用 */
  for (const ref of CLAUDE_CLI_DEFAULT_ALLOWLIST_REFS) {
    const canonicalRef = toAnthropicModelRef(ref) ?? ref;
    runtimeRefs.add(canonicalRef);
  }
  /* 添加用户选定的引用 */
  for (const ref of selectedRefs) {
    runtimeRefs.add(ref);
  }
  /* 为每个引用设置 claude-cli 运行时 */
  for (const ref of runtimeRefs) {
    next[ref] = modelEntryWithClaudeCliRuntime(next[ref]);
  }
  return next;
}

/**
 * 选择 Claude CLI 运行时
 *
 * 如果当前运行时已配置且不是 "auto"，则保留原有配置；
 * 否则设置为 claude-cli 运行时。
 *
 * @param agentRuntime - 现有的运行时策略
 * @returns 更新后的运行时策略
 */
function selectClaudeCliRuntime(agentRuntime: AgentDefaultsRuntimePolicy | undefined) {
  const currentRuntime = agentRuntime?.id?.trim();
  if (currentRuntime && currentRuntime !== "auto") {
    return agentRuntime;
  }
  return {
    ...agentRuntime,
    id: CLAUDE_CLI_BACKEND_ID,
  };
}

/**
 * 为模型条目添加 Claude CLI 运行时配置
 *
 * 如果模型条目已有非 "auto" 的运行时配置，保留原有配置；
 * 否则添加 claude-cli 运行时。
 *
 * @param entry - 原始模型条目
 * @returns 添加了运行时配置的模型条目
 */
function modelEntryWithClaudeCliRuntime(entry: unknown): Record<string, unknown> {
  const base = isRecord(entry) ? { ...entry } : {};
  const currentRuntimeId = isRecord(base.agentRuntime) ? base.agentRuntime.id : undefined;
  const currentRuntime =
    typeof currentRuntimeId === "string" ? normalizeLowercaseStringOrEmpty(currentRuntimeId) : "";
  /* 如果已有非 "auto" 的运行时配置，保留原有配置 */
  if (currentRuntime && currentRuntime !== "auto") {
    return base;
  }
  /* 添加 claude-cli 运行时 */
  base.agentRuntime = {
    ...(isRecord(base.agentRuntime) ? base.agentRuntime : {}),
    id: CLAUDE_CLI_BACKEND_ID,
  };
  return base;
}

/**
 * 检查是否存在 Claude CLI 认证
 *
 * @param options - 选项，可设置 allowKeychainPrompt 控制是否允许钥匙串提示
 * @returns 是否存在 Claude CLI 认证
 */
export function hasClaudeCliAuth(options?: { allowKeychainPrompt?: boolean }): boolean {
  return Boolean(
    options?.allowKeychainPrompt === false
      ? readClaudeCliCredentialsForSetupNonInteractive()
      : readClaudeCliCredentialsForSetup(),
  );
}

/**
 * 构建 Claude CLI 认证配置文件列表
 *
 * 将 Claude CLI 凭证转换为 OpenClaw 认证配置文件格式。
 * 支持 OAuth 和 token 两种凭证类型。
 *
 * @param credential - Claude CLI 凭证
 * @returns 认证配置文件列表
 */
function buildClaudeCliAuthProfiles(
  credential?: ClaudeCliCredential | null,
): ProviderAuthResult["profiles"] {
  if (!credential) {
    return [];
  }
  if (credential.type === "oauth") {
    return [
      {
        profileId: CLAUDE_CLI_PROFILE_ID,
        credential: {
          type: "oauth",
          provider: CLAUDE_CLI_BACKEND_ID,
          access: credential.access,
          refresh: credential.refresh,
          expires: credential.expires,
        },
      },
    ];
  }
  return [
    {
      profileId: CLAUDE_CLI_PROFILE_ID,
      credential: {
        type: "token",
        provider: CLAUDE_CLI_BACKEND_ID,
        token: credential.token,
        expires: credential.expires,
      },
    },
  ];
}

/**
 * 构建 Anthropic CLI 迁移结果
 *
 * 这是迁移流程的核心函数，负责：
 * 1. 重写模型选择配置（claude-cli/* → anthropic/*）
 * 2. 重写模型条目映射
 * 3. 播种 Claude CLI 允许列表
 * 4. 选择 Claude CLI 运行时
 * 5. 构建认证配置文件
 * 6. 生成迁移说明
 *
 * @param config - OpenClaw 配置
 * @param credential - Claude CLI 凭证
 * @returns 迁移结果，包含配置补丁、默认模型和说明
 */
export function buildAnthropicCliMigrationResult(
  config: OpenClawConfig,
  credential?: ClaudeCliCredential | null,
): ProviderAuthResult {
  const defaults = config.agents?.defaults;
  /* 重写模型选择配置 */
  const rewrittenModel = rewriteModelSelection(defaults?.model);
  /* 重写模型条目映射 */
  const rewrittenModels = rewriteModelEntryMap(defaults?.models);
  const existingModels = (rewrittenModels.value ??
    defaults?.models ??
    {}) as NonNullable<AgentDefaultsModels>;
  /* 播种允许列表，包含重写过程中发现的所有运行时引用 */
  const nextModels = seedClaudeCliAllowlist(existingModels, [
    ...rewrittenModel.runtimeRefs,
    ...rewrittenModels.runtimeRefs,
    ...rewrittenModels.migrated,
  ]);
  const defaultModel = rewrittenModel.primary ?? "anthropic/claude-opus-4-7";

  return {
    profiles: buildClaudeCliAuthProfiles(credential),
    configPatch: {
      agents: {
        defaults: {
          /* 仅在模型选择发生变化时更新 */
          ...(rewrittenModel.changed ? { model: rewrittenModel.value } : {}),
          /* 设置 Claude CLI 运行时 */
          agentRuntime: selectClaudeCliRuntime(defaults?.agentRuntime),
          /* 更新模型配置 */
          models: nextModels,
        },
      },
    },
    /**
     * 重写默认模型映射
     * 将 claude-cli/* 重写为 anthropic/* 后，需要替换整个默认模型映射
     * 以避免保留已过时的 claude-cli/* 键
     */
    replaceDefaultModels: true,
    defaultModel,
    notes: [
      "Claude CLI auth detected; kept Anthropic model refs and selected the local Claude CLI runtime.",
      "Existing Anthropic auth profiles are kept for rollback.",
      ...(rewrittenModels.migrated.length > 0
        ? [`Migrated allowlist entries: ${rewrittenModels.migrated.join(", ")}.`]
        : []),
    ],
  };
}
