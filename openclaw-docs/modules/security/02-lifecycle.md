# security — 实现流程与数据流

## 安全审计完整流程

### 1. 审计触发

```
Gateway 启动 / openclaw status / openclaw audit
  ↓
audit.runtime.ts → runSecurityAudit(cfg)
  ↓
audit.ts → runFullSecurityAudit(cfg, options)
```

### 2. 审计执行流程

```
runFullSecurityAudit(cfg, options)
  │
  ├→ 1. 基础审计（sync，快速）
  │    ├→ collectConfigBasicsFindings()    — 配置基础检查
  │    ├→ collectGatewayConfigFindings()   — Gateway 配置检查
  │    ├→ collectChannelFindings()         — 渠道配置检查
  │    ├→ collectExecSurfaceFindings()     — 执行面检查
  │    ├→ collectDangerousFlagsFindings()  — 危险标志检查
  │    ├→ collectModelRefFindings()        — 模型引用检查
  │    └→ collectToolPolicyFindings()      — 工具策略检查
  │
  ├→ 2. 扩展同步审计（sync）
  │    └→ audit-extra.sync.ts
  │         ├→ 文件系统权限检查
  │         ├→ 配置文件包含链检查
  │         ├→ 沙箱配置检查
  │         └→ 浏览器安全检查
  │
  ├→ 3. 扩展异步审计（async，可能耗时）
  │    └→ audit-extra.async.ts
  │         ├→ 插件信任链验证
  │         ├→ 外部可访问性检测
  │         ├→ DNS 解析检查
  │         └→ 端口扫描检查
  │
  ├→ 4. 深度审计（可选，耗时最长）
  │    └→ audit.deep.runtime.ts
  │         ├→ audit-deep-code-safety.ts   — 代码安全深度扫描
  │         └→ audit-deep-probe-findings.ts — 深度探测
  │
  └→ 5. 汇总
       ├→ 合并所有发现
       ├→ 分类（info/warn/critical）
       ├→ 应用抑制规则（suppressions）
       └→ 生成 SecurityAuditReport
```

### 3. 安全报告结构

```typescript
type SecurityAuditReport = {
  ts: number;                    // 审计时间戳
  summary: {                     // 摘要
    critical: number;
    warn: number;
    info: number;
  };
  findings: SecurityAuditFinding[];          // 活跃发现
  suppressedFindings?: SecurityAuditSuppressedFinding[]; // 被抑制的发现
  deep?: { ... };               // 深度审计结果
};
```

### 4. 发现结构

```typescript
type SecurityAuditFinding = {
  checkId: string;       // 检查项 ID（如 "gateway-no-auth"）
  severity: "info" | "warn" | "critical";
  title: string;         // 发现标题
  detail: string;        // 详细描述
  remediation?: string;  // 修复建议
};
```

## 外部内容安全流程

### wrapExternalContent

```
外部内容（邮件/Webhook）
  ↓
1. 注入安全边界标记
   → "--- BEGIN EXTERNAL CONTENT ---"
   → 标记来源类型（email/webhook/web）

2. 可疑模式检测
   → SUSPICIOUS_PATTERNS 正则扫描
   → 检测到 → 记录日志（不丢弃内容）
   → 未检测到 → 继续

3. 长度限制
   → 超过限制时截断并标记

4. 返回安全包装后的内容
   → "--- END EXTERNAL CONTENT ---"
```

### 外部内容来源

```typescript
type HookExternalContentSource = 
  | { kind: "gmail"; messageId?: string }
  | { kind: "webhook"; provider: string }
  | { kind: "web"; url: string }
  | { kind: "other"; label: string };
```

## DM 策略流程

### dm-policy-shared.ts

```
入站 DM 消息
  ↓
1. 检查 dmScope 配置
   → "main" → 所有 DM 汇聚（检查 allowFrom 列表）
   → 其他 → 独立会话

2. 解析 allowFrom 列表
   → "*" → 允许所有人
   → 具体列表 → 只允许列表中的人
   → 空 → 使用渠道默认策略

3. 解析 pinned DM owner
   → dmScope=main 且有 allowFrom → 确定唯一 DM owner

4. 群组访问策略
   → resolveGroupAccess → 允许/拒绝/只读
```

## 执行文件系统策略

### exec-filesystem-policy.ts

```
工具调用请求
  ↓
1. 解析沙箱配置
   → sandboxMode: "off" | "non-main" | "all"
   → workspaceAccess: "none" | "ro" | "rw"

2. 检查工具策略
   → mutating FS tools: write, edit, apply_patch
   → runtime tools: exec, process

3. 检测策略漂移
   → 沙箱关闭但 FS 工具可用 → 警告
   → 沙箱开启但配置矛盾 → 警告

4. 返回漂移报告
```

## 技能扫描流程

### skill-scanner.ts

```
技能目录
  ↓
1. 遍历技能文件
   → 递归扫描 SKILL.md 和关联文件
   → 跳过 node_modules 和隐藏目录

2. 静态分析每个文件
   → 正则匹配危险模式：
     - eval() / Function() 构造
     - exec/spawn 调用
     - fs 操作（非通过工具系统）
     - process.env 访问
     - 网络请求（fetch/http）
     - child_process

3. 生成发现
   → SkillScanFinding: { ruleId, severity, file, line, message, evidence }

4. 汇总
   → SkillScanSummary: { scannedFiles, critical, warn, info, findings }
```

## 配置标志检测流程

### dangerous-config-flags.ts

```
配置加载
  ↓
1. collectCoreInsecureOrDangerousFlags(cfg)
   → 检查 gateway.controlUi.allowInsecureAuth
   → 检查 gateway.controlUi.dangerouslyDisableDeviceAuth
   → 检查 hooks.*.allowUnsafeExternalContent
   → 检查 tools.exec.elevated
   → 检查 session 配置

2. collectPluginConfigContractMatches(cfg)
   → 检查插件配置合约中的危险标志

3. 合并结果
   → 返回所有启用的危险标志列表
```

## 自动修复流程

### fix.ts

```
安全审计发现 → 选择可自动修复的问题
  ↓
1. 文件权限修复
   → Linux: chmod 600（配置文件）
   → Windows: icacls 重置 ACL

2. 配置修复
   → 添加缺失的认证配置
   → 关闭危险标志

3. 执行修复动作
   → SecurityFixChmodAction / SecurityFixIcaclsAction

4. 返回修复结果
   → 每个 action 的 ok/error/skipped 状态
```

## 上下文可见性评估

### context-visibility.ts

```
消息到达 → 检查上下文可见性
  ↓
mode === "all"
  → 所有上下文可见 → { include: true, reason: "mode_all" }

senderAllowed
  → 发送者在允许列表中 → { include: true, reason: "sender_allowed" }

mode === "allowlist_quote" && kind === "quote"
  → 引用消息特殊处理 → { include: true, reason: "quote_override" }

默认
  → 阻止 → { include: false, reason: "blocked" }
```
