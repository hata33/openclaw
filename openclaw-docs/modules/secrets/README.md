# secrets — 密钥管理

> 负责所有敏感凭证的安全管理：API Key、OAuth Token、密码等。
> 提供密钥解析、存储、配置、审计和运行时注入能力。

## 文件结构（57 个文件，12052 行）

### 核心解析
| 文件 | 职责 |
|------|------|
| `resolve.ts` | 密钥解析主逻辑（环境变量/文件/exec/引用） |
| `resolve-types.ts` | 解析类型定义 |
| `secret-value.ts` | 密钥值验证 |
| `json-pointer.ts` | JSON Pointer 解析（配置引用） |
| `shared.ts` | 共享工具函数 |
| `path-utils.ts` | 路径工具 |

### 运行时
| 文件 | 职责 |
|------|------|
| `runtime.ts` | 运行时密钥收集与注入 |
| `runtime-fast-path.ts` | 快速路径优化 |
| `runtime-state.ts` | 运行时状态管理 |
| `runtime-prepare.runtime.ts` | 运行时准备 |
| `runtime-shared.ts` | 运行时共享逻辑 |
| `runtime-auth-collectors.ts` | 认证收集器 |
| `runtime-manifest.runtime.ts` | 运行时清单 |

### 配置收集器
| 文件 | 职责 |
|------|------|
| `runtime-config-collectors.ts` | 配置密钥收集入口 |
| `runtime-config-collectors-core.ts` | 核心配置密钥 |
| `runtime-config-collectors-channels.ts` | 渠道密钥 |
| `runtime-config-collectors-plugins.ts` | 插件密钥 |
| `runtime-config-collectors-tts.ts` | TTS 密钥 |

### Web 工具
| 文件 | 职责 |
|------|------|
| `runtime-web-tools.ts` | Web 工具密钥管理 |
| `runtime-web-tools-state.ts` | Web 工具状态 |
| `runtime-web-tools.types.ts` | Web 工具类型 |

### 目标注册表
| 文件 | 职责 |
|------|------|
| `target-registry.ts` | 目标注册表入口 |
| `target-registry-types.ts` | 目标类型 |
| `target-registry-data.ts` | 目标数据 |
| `target-registry-pattern.ts` | 目标匹配模式 |
| `target-registry-query.ts` | 目标查询 |

### 配置与计划
| 文件 | 职责 |
|------|------|
| `plan.ts` | 密钥配置计划 |
| `configure.ts` | 交互式配置向导 |
| `configure-plan.ts` | 配置计划构建 |
| `apply.ts` | 密钥应用（写入配置和 auth store） |
| `config-io.ts` | 配置 I/O |

### 审计与安全
| 文件 | 职责 |
|------|------|
| `audit.ts` | 密钥审计 |
| `auth-profiles-scan.ts` | 认证档案扫描 |
| `exec-resolution-policy.ts` | Exec 解析策略 |
| `model-provider-header-policy.ts` | Provider Header 策略 |

### 渠道密钥
| 文件 | 职责 |
|------|------|
| `channel-env-vars.ts` | 渠道环境变量 |
| `channel-secret-basic-runtime.ts` | 基础渠道密钥 |
| `channel-secret-collector-runtime.ts` | 渠道密钥收集器 |

## 核心概念

- **SecretRef** — 密钥引用（指向环境变量、文件、exec 命令）
- **SecretProvider** — 密钥提供者（env/file/exec）
- **Auth Profile Store** — 认证档案存储（JSON 文件）
- **Target Registry** — 密钥目标注册表（配置位置映射）
- **Apply** — 将解析后的密钥写入配置
