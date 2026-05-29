# security — 安全系统

> 负责 OpenClaw 的全面安全审计、策略执行和威胁防护。
> 是系统的安全基石，涵盖配置审计、执行沙箱、内容安全、路径安全等多个子域。

## 文件结构

### 审计核心
| 文件 | 职责 |
|------|------|
| `audit.ts` | 安全审计主入口（1354 行），收集所有安全发现 |
| `audit.types.ts` | 审计类型定义（Finding、Severity、Report） |
| `audit.runtime.ts` | 审计运行时（触发入口） |
| `audit.deep.runtime.ts` | 深度审计运行时 |
| `audit.nondeep.runtime.ts` | 非深度审计运行时 |

### 审计子域
| 文件 | 职责 |
|------|------|
| `audit-channel.ts` | 渠道配置审计（DM 策略、只读模式、allowFrom） |
| `audit-channel.collect.runtime.ts` | 渠道审计数据收集 |
| `audit-gateway-config.ts` | Gateway 配置审计（认证、暴露、HTTP 策略） |
| `audit-tool-policy.ts` | 工具策略审计 |
| `audit-model-refs.ts` | 模型引用审计 |
| `audit-plugins-trust.ts` | 插件信任审计（569 行） |
| `audit-workspace-skills.ts` | 工作区技能安全审计 |
| `audit-fs.ts` | 文件系统权限审计 |
| `audit-exec-surface.test.ts` | 执行面审计（测试，359 行） |

### 扩展审计
| 文件 | 职责 |
|------|------|
| `audit-extra.sync.ts` | 同步扩展审计（1216 行） |
| `audit-extra.async.ts` | 异步扩展审计（1015 行） |
| `audit-extra.summary.ts` | 审计结果摘要生成 |

### 深度审计
| 文件 | 职责 |
|------|------|
| `audit-deep-code-safety.ts` | 深度代码安全扫描 |
| `audit-deep-probe-findings.ts` | 深度探测发现 |

### 安全策略
| 文件 | 职责 |
|------|------|
| `dangerous-config-flags.ts` | 危险配置标志检测（入口） |
| `dangerous-config-flags-core.ts` | 核心危险标志（143 行） |
| `dangerous-config-flags-current.ts` | 当前快照危险标志 |
| `core-dangerous-config-flags.ts` | 核心标志定义 |
| `dangerous-tools.ts` | 危险工具黑名单（Gateway HTTP 拒绝列表） |
| `dm-policy-shared.ts` | DM 策略共享逻辑（329 行） |
| `exec-filesystem-policy.ts` | 执行文件系统策略 |
| `context-visibility.ts` | 上下文可见性策略 |

### 内容安全
| 文件 | 职责 |
|------|------|
| `external-content.ts` | 外部内容安全包装（426 行） |
| `external-content-source.ts` | 外部内容来源标识 |
| `system-tags.ts` | 系统标签清理（防伪造） |
| `channel-metadata.ts` | 渠道元数据安全处理 |

### 工具与辅助
| 文件 | 职责 |
|------|------|
| `fix.ts` | 安全问题自动修复（473 行） |
| `safe-regex.ts` | 安全正则表达式（ReDoS 防护，365 行） |
| `config-regex.ts` | 配置正则表达式（包装 safe-regex） |
| `skill-scanner.ts` | 技能文件安全扫描（759 行） |
| `scan-paths.ts` | 路径安全扫描 |
| `secret-equal.ts` | 时序安全的密钥比较 |
| `installed-plugin-dirs.ts` | 已安装插件目录过滤 |
| `windows-acl.ts` | Windows ACL 权限管理 |

## 核心概念

- **Security Audit** — 全面检查配置、权限、暴露面的安全审计系统
- **Finding** — 安全发现，分为 info/warn/critical 三级
- **Dangerous Flags** — 危险配置标志检测
- **External Content** — 外部内容安全包装（防注入）
- **Safe Regex** — ReDoS 防护
- **Skill Scanner** — 技能文件静态安全扫描
