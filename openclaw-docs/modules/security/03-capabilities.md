# security — 能力清单与对外接口

## 公共 API 总览

安全模块的 API 分为 8 类：审计核心、审计子域、配置标志、内容安全、路径安全、正则安全、技能扫描、自动修复。

## 一、审计核心

### audit.runtime.ts

```typescript
function runSecurityAudit(cfg: OpenClawConfig, options?: AuditOptions): Promise<SecurityAuditReport>
```

- **功能**：安全审计主入口

### audit.ts

```typescript
function runFullSecurityAudit(cfg: OpenClawConfig, options?: FullAuditOptions): Promise<SecurityAuditReport>
```

### audit.types.ts

```typescript
type SecurityAuditSeverity = "info" | "warn" | "critical";

type SecurityAuditFinding = {
  checkId: string;
  severity: SecurityAuditSeverity;
  title: string;
  detail: string;
  remediation?: string;
};

type SecurityAuditReport = {
  ts: number;
  summary: { critical: number; warn: number; info: number; };
  findings: SecurityAuditFinding[];
  suppressedFindings?: SecurityAuditSuppressedFinding[];
  deep?: { gateway?: { attempted: boolean; error?: string; }; };
};
```

## 二、审计子域

### audit-gateway-config.ts

```typescript
function collectGatewayConfigFindings(cfg: OpenClawConfig, options?: Options): SecurityAuditFinding[]
```

- **功能**：Gateway 配置审计（认证、端口暴露、HTTP 策略）
- **检查项**：gateway-no-auth、gateway-exposed、gateway-insecure-cors 等

### audit-channel.ts

```typescript
function collectChannelFindings(cfg: OpenClawConfig, plugins: ChannelPlugin[]): SecurityAuditFinding[]
```

- **功能**：渠道配置审计（DM 策略、allowFrom、只读模式）

### audit-model-refs.ts

```typescript
function collectModelRefFindings(cfg: OpenClawConfig): SecurityAuditFinding[]
```

- **功能**：模型引用审计（不存在的模型、无效 provider）

### audit-plugins-trust.ts

```typescript
function collectPluginTrustFindings(cfg: OpenClawConfig, options?: Options): SecurityAuditFinding[]
```

- **功能**：插件信任链审计

### audit-workspace-skills.ts

```typescript
function collectWorkspaceSkillFindings(cfg: OpenClawConfig): SecurityAuditFinding[]
```

- **功能**：工作区技能安全检查

### audit-tool-policy.ts

```typescript
function collectToolPolicyFindings(cfg: OpenClawConfig): SecurityAuditFinding[]
```

### audit-fs.ts

```typescript
function collectFilesystemFindings(cfg: OpenClawConfig): SecurityAuditFinding[]
```

### audit-extra.sync.ts / audit-extra.async.ts

```typescript
function collectExtraSyncFindings(cfg: OpenClawConfig, options?: Options): SecurityAuditFinding[]
function collectExtraAsyncFindings(cfg: OpenClawConfig, options?: Options): Promise<SecurityAuditFinding[]>
```

### audit-extra.summary.ts

```typescript
function summarizeFindings(findings: SecurityAuditFinding[]): SecurityAuditSummary
```

## 三、配置标志

### dangerous-config-flags.ts

```typescript
function collectEnabledInsecureOrDangerousFlags(cfg: OpenClawConfig, options?: Options): string[]
```

- **功能**：收集所有启用的不安全或危险配置标志

### dangerous-config-flags-core.ts

```typescript
function collectCoreInsecureOrDangerousFlags(cfg: OpenClawConfig): string[]
```

### dangerous-config-flags-current.ts

```typescript
function collectEnabledInsecureOrDangerousFlagsFromCurrentSnapshot(cfg: OpenClawConfig): string[] | null
```

### core-dangerous-config-flags.ts

```typescript
function collectCoreInsecureOrDangerousFlagsFromConfig(cfg: OpenClawConfig): string[]
```

### dangerous-tools.ts

```typescript
const DEFAULT_GATEWAY_HTTP_TOOL_DENY: string[]
```

- **功能**：HTTP Gateway 禁止的工具列表

## 四、内容安全

### external-content.ts

```typescript
function wrapExternalContent(params: {
  content: string;
  source: HookExternalContentSource;
  maxChars?: number;
}): string
```

- **功能**：安全包装外部内容

```typescript
function isExternalContentWrapped(text: string): boolean
```

```typescript
function sanitizeExternalContent(content: string): string
```

### external-content-source.ts

```typescript
type HookExternalContentSource = 
  | { kind: "gmail"; messageId?: string }
  | { kind: "webhook"; provider: string }
  | { kind: "web"; url: string }
  | { kind: "other"; label: string };

function resolveHookExternalContentSource(hook: HookConfig): HookExternalContentSource
```

### system-tags.ts

```typescript
function sanitizeInboundSystemTags(input: string): string
```

- **功能**：清理用户消息中的伪造系统标签
- `[System Message]` → `(System Message)`
- `System:` → `System (untrusted):`

### channel-metadata.ts

```typescript
function collectChannelMetadata(params: {
  entries: string[];
  maxChars?: number;
  maxEntryChars?: number;
}): string
```

- **功能**：安全收集渠道元数据（截断、去重）

## 五、路径安全

### scan-paths.ts

```typescript
function isPathInside(childPath: string, parentPath: string): boolean
function isPathInsideWithRealpath(childPath: string, parentPath: string): boolean

function extensionUsesSkippedScannerPath(entry: string): boolean
```

- **功能**：检查路径是否在指定目录内（防路径穿越）

### installed-plugin-dirs.ts

```typescript
function shouldIgnoreInstalledPluginDirName(name: string): boolean
```

- **功能**：过滤不安全的插件目录名（node_modules、.bak 等）

## 六、正则安全

### safe-regex.ts

```typescript
function compileSafeRegexDetailed(pattern: string, flags?: string): SafeRegexCompileResult

type SafeRegexCompileResult = 
  | { regex: RegExp; reason: null; }
  | { regex: null; reason: SafeRegexRejectReason; detail: string; };

type SafeRegexRejectReason = "exponential" | "polynomial" | "empty" | "invalid";
```

- **功能**：安全编译正则表达式，检测 ReDoS 风险

### config-regex.ts

```typescript
function compileConfigRegex(pattern: string, flags?: string): CompiledConfigRegex

type CompiledConfigRegex =
  | { regex: RegExp; pattern: string; flags: string; reason: null; }
  | { regex: null; pattern: string; flags: string; reason: ConfigRegexRejectReason; };
```

## 七、密钥安全

### secret-equal.ts

```typescript
function safeEqualSecret(provided: string | null | undefined, expected: string | null | undefined): boolean
```

- **功能**：时序安全的密钥比较（防时序攻击）

## 八、技能扫描

### skill-scanner.ts

```typescript
function scanSkillFiles(params: {
  skillDir: string;
  options?: SkillScanOptions;
}): Promise<SkillScanSummary>

type SkillScanSummary = {
  scannedFiles: number;
  critical: number;
  warn: number;
  info: number;
  truncated: boolean;
  findings: SkillScanFinding[];
};

type SkillScanFinding = {
  ruleId: string;
  severity: SkillScanSeverity;
  file: string;
  line: number;
  message: string;
  evidence: string;
};
```

## 九、自动修复

### fix.ts

```typescript
function applySecurityFixes(params: {
  cfg: OpenClawConfig;
  findings: SecurityAuditFinding[];
  execFn?: ExecFn;
}): Promise<SecurityFixResult>

type SecurityFixAction = SecurityFixChmodAction | SecurityFixIcaclsAction;

type SecurityFixResult = {
  actions: SecurityFixAction[];
};
```

## 十、上下文可见性

### context-visibility.ts

```typescript
function evaluateSupplementalContextVisibility(params: {
  mode: ContextVisibilityMode;
  kind: ContextVisibilityKind;
  senderAllowed: boolean;
}): ContextVisibilityDecision

type ContextVisibilityDecision = {
  include: boolean;
  reason: ContextVisibilityDecisionReason;
};
```

## 十一、DM 策略

### dm-policy-shared.ts

```typescript
function resolvePinnedMainDmOwnerFromAllowlist(params: {
  dmScope?: string | null;
  allowFrom?: Array<string | number> | null;
  normalizeEntry: (entry: string) => string | undefined;
}): string | null
```

## 十二、执行文件系统策略

### exec-filesystem-policy.ts

```typescript
function detectExecFilesystemPolicyDrift(params: {
  cfg: OpenClawConfig;
  agentTools?: AgentToolsConfig;
  agentId?: string;
}): ExecFilesystemPolicyDriftHit[]
```

## 十三、Windows ACL

### windows-acl.ts

```typescript
function createIcaclsResetCommand(filePath: string): string
function formatIcaclsResetCommand(filePath: string): string
```
