# 05 — 安全与沙箱机制

> OpenClaw 连接真实的消息平台，执行真实的系统命令，处理真实的个人数据。
> 安全不是附加功能，而是核心设计。本文档剖析 OpenClaw 的多层安全机制。

## 安全设计哲学

VISION.md 明确了安全的设计原则：

> Security in OpenClaw is a deliberate tradeoff: strong defaults without killing capability.
> The goal is to stay powerful for real work while making risky paths explicit and operator-controlled.

翻译：安全和能力之间做有意识的权衡——默认安全，但不阉割能力；高危操作需要显式确认。

## 安全层级总览

```
Layer 1: DM 安全策略（谁能跟 Agent 说话？）
Layer 2: 工具权限控制（Agent 能做什么？）
Layer 3: 沙箱隔离（Agent 在哪里执行？）
Layer 4: 安全审计（配置是否安全？）
Layer 5: 内容安全（输入输出是否安全？）
```

## Layer 1: DM 安全策略

### 配对机制（Pairing）

默认模式下，陌生人发来的 DM 不会被直接处理：

```
陌生人发送 DM
  → Gateway 检查 dmPolicy
  → 默认: "pairing" 模式
  → 生成 6 位配对码，回复陌生人
  → 用户在终端运行: openclaw pairing approve telegram ABC123
  → 配对码验证通过
  → 发送者加入 allowlist
  → 后续消息正常处理
```

### Allowlist 机制

```yaml
channels:
  telegram:
    allowFrom:
      - "+86138xxxx"       # 具体号码
      - "user:username"    # 用户名
      - "*"                # 所有人（需要显式配置）
```

只有在 allowlist 中的发送者才能与 Agent 交互。

### DM Policy 选项

| 策略 | 行为 | 适用场景 |
|------|------|----------|
| `pairing`（默认） | 陌生人需要配对码 | 个人使用 |
| `open` | 允许所有人 | 公开 Bot |
| `blocked` | 完全阻止 DM | 只允许群组 |

## Layer 2: 工具权限控制

### 工具可用性策略

不同场景下，工具的可用性不同：

```typescript
// 典型的沙箱工具策略
const sandboxedTools = {
  allowed: ["bash", "process", "read", "write", "edit",
            "sessions_list", "sessions_history", "sessions_send", "sessions_spawn"],
  denied:  ["browser", "canvas", "nodes", "cron", "discord", "gateway"]
};
```

### Exec 审批机制

高危命令需要用户审批：

```
Agent: tool_call(exec, { command: "rm -rf /tmp/old-data" })
  → 检查安全策略
  → 命令匹配高危模式
  → 返回 approval-pending
  → 用户在终端: /approve
  → 命令执行
```

审批记录存储在 Exec Approvals File 中，支持持久化（允许的命令不需要再次审批）。

### Safe Bin 策略

OpenClaw 维护一个"安全二进制"列表，只有列表中的命令可以直接执行：

```typescript
// 安全二进制示例
const safeBins = ["ls", "cat", "grep", "find", "git", "node", "npm"];
```

不在安全列表中的命令需要额外确认。

## Layer 3: 沙箱隔离

### 沙箱模式

```yaml
agents:
  defaults:
    sandbox:
      mode: "non-main"  # 非 main Session 在沙箱中运行
```

| 模式 | 行为 |
|------|------|
| `off` | 不使用沙箱 |
| `non-main` | 只有非 main Session 在沙箱中运行 |
| `all` | 所有 Session 都在沙箱中运行 |

### 沙箱后端

OpenClaw 支持多种沙箱后端：

1. **Docker（默认）** — 容器隔离
2. **SSH** — 远程机器执行
3. **OpenShell** — 受限 shell 环境

### Docker 沙箱工作流

```
Agent 调用工具（非 main Session）
  → 检查沙箱配置
  → 启动 Docker 容器
  → 在容器内执行命令
  → 收集输出
  → 销毁容器
```

容器配置限制了：
- 文件系统挂载（只读或受限写入）
- 网络访问
- 资源限制（CPU、内存）
- 可用命令

## Layer 4: 安全审计

OpenClaw 内置了完整的安全审计系统（`src/security/audit.ts`），通过 `openclaw doctor` 命令运行：

### 审计检查项

```typescript
type SecurityAuditOptions = {
  config: OpenClawConfig;           // 当前配置
  deep?: boolean;                   // 是否深度扫描
  includeFilesystem?: boolean;      // 是否检查文件系统权限
  includeChannelSecurity?: boolean; // 是否检查渠道安全
  stateDir?: string;                // 状态目录
  configPath?: string;              // 配置文件路径
  deepTimeoutMs?: number;           // 深度扫描超时
};
```

审计涵盖以下维度：

| 审计项 | 检查内容 |
|--------|----------|
| DM Policy | 是否有开放的 DM 策略 |
| 工具权限 | 是否有危险的工具配置 |
| 文件系统 | 敏感文件的权限是否安全 |
| 网关暴露 | 网关是否暴露在公网 |
| 插件安全 | 已安装插件是否有已知风险 |
| 模型配置 | 模型配置是否有安全风险 |
| 沙箱配置 | 沙箱是否正确启用 |
| 配置标志 | 是否启用了危险的配置标志 |

### 审计报告

```typescript
interface SecurityAuditReport {
  findings: SecurityAuditFinding[];    // 发现的问题
  summary: SecurityAuditSummary;       // 摘要
  suppressed: SecurityAuditSuppressedFinding[];  // 被抑制的问题
}
```

每个 finding 有严重级别：

```typescript
type SecurityAuditSeverity = "critical" | "high" | "medium" | "low" | "info";
```

### 自动修复

审计发现问题后，可以尝试自动修复：

```bash
openclaw doctor --yes   # 自动修复可修复的问题
```

## Layer 5: 内容安全

### 外部内容处理

OpenClaw 对外部内容（来自渠道的消息、网页抓取等）有专门的安全处理（`src/security/external-content.ts`）：

1. **来源标记** — 所有外部内容都标记来源
2. **注入防护** — 防止 prompt injection 通过外部内容注入
3. **内容过滤** — 过滤敏感信息

### 上下文可见性

不同来源的内容有不同的可见性级别（`src/security/context-visibility.ts`）：

```
system prompt  → 最高信任
用户消息       → 高信任
工具输出       → 中信任
外部内容       → 低信任
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/security/audit.ts` | 安全审计主逻辑 |
| `src/security/audit.types.ts` | 审计类型定义 |
| `src/security/fix.ts` | 自动修复 |
| `src/security/dangerous-config-flags.ts` | 危险配置标志检测 |
| `src/security/external-content.ts` | 外部内容安全 |
| `src/security/context-visibility.ts` | 上下文可见性 |
| `src/security/exec-filesystem-policy.ts` | 执行文件系统策略 |
| `src/security/audit-fs.ts` | 文件系统权限审计 |
| `src/channels/allowlist-match.ts` | DM Allowlist 匹配 |

## 总结

1. **DM 配对** — 默认阻止陌生人，需要配对码
2. **工具权限** — 根据场景动态控制工具可用性
3. **沙箱隔离** — Docker/SSH 后端实现进程级隔离
4. **安全审计** — `openclaw doctor` 检查并修复配置风险
5. **内容安全** — 外部内容标记和注入防护
