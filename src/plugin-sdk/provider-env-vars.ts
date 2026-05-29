// Public provider auth environment variable helpers for plugin runtimes.

/**
 * @file Provider 环境变量公共辅助模块
 *
 * 导出与 Provider 认证环境变量相关的工具函数：
 * - getProviderEnvVars: 获取指定 Provider 的所有环境变量
 * - listKnownProviderAuthEnvVarNames: 列出所有已知的 Provider 认证环境变量名
 * - omitEnvKeysCaseInsensitive: 大小写不敏感地过滤环境变量键
 * - resolveProviderAuthEnvVarCandidates: 解析 Provider 认证环境变量候选列表
 *
 * 这些函数封装了底层 secrets 模块，为 Provider 插件提供统一的环境变量访问接口。
 * 为什么需要单独封装：Provider 插件不应直接依赖 secrets 模块的内部实现。
 */

export {
  getProviderEnvVars,
  listKnownProviderAuthEnvVarNames,
  omitEnvKeysCaseInsensitive,
  resolveProviderAuthEnvVarCandidates,
} from "../secrets/provider-env-vars.js";
