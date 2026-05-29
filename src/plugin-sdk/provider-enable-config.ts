/**
 * @file Provider 启用配置管理
 *
 * 本文件实现了 Provider 插件的启用/禁用逻辑。
 * 当系统需要在配置中启用一个 Provider 插件时，需要经过以下检查：
 *
 * 1. 全局开关检查：plugins.enabled 是否为 false
 * 2. 黑名单检查：plugins.deny 是否包含该插件 ID
 * 3. 启用操作：在 plugins.entries 中标记为 enabled: true
 * 4. 白名单校验：确保插件在允许列表中
 *
 * 为什么单独封装：
 * - Provider 插件的启用逻辑与通道插件不同（不需要通道规范化）
 * - 配置修改需要返回新的配置对象（不可变更新模式）
 * - 启用结果需要包含原因，便于调试和日志记录
 */

import { ensurePluginAllowlisted } from "../config/plugins-allowlist.js";

type ProviderPluginConfig = {
  enabled?: boolean;
};

type ProviderEnableConfigCarrier = {
  plugins?: {
    enabled?: boolean;
    deny?: string[];
    allow?: string[];
    entries?: Record<string, ProviderPluginConfig | undefined>;
  };
};

export type PluginEnableResult<TConfig extends ProviderEnableConfigCarrier> = {
  config: TConfig;
  enabled: boolean;
  reason?: string;
};

/**
 * Provider contract surfaces only ever enable provider plugins, so they do not
 * need the built-in channel normalization path from plugins/enable.ts.
 */
export function enablePluginInConfig<TConfig extends ProviderEnableConfigCarrier>(
  cfg: TConfig,
  pluginId: string,
): PluginEnableResult<TConfig> {
  if (cfg.plugins?.enabled === false) {
    return { config: cfg, enabled: false, reason: "plugins disabled" };
  }
  if (cfg.plugins?.deny?.includes(pluginId)) {
    return { config: cfg, enabled: false, reason: "blocked by denylist" };
  }

  let next = {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      entries: {
        ...cfg.plugins?.entries,
        [pluginId]: {
          ...(cfg.plugins?.entries?.[pluginId] as object | undefined),
          enabled: true,
        },
      },
    },
  } as TConfig;
  next = ensurePluginAllowlisted(next, pluginId);
  return { config: next, enabled: true };
}
