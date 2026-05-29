# secrets — 能力清单与对外接口

## 密钥解析（resolve.ts）

### resolveSecretRef

```typescript
function resolveSecretRef(ref: SecretRef | string): Promise<string | undefined>
```

- **功能**：解析密钥引用为实际值
- **支持**：env / file / exec

### resolveSecretRefs

```typescript
function resolveSecretRefs(refs: Record<string, SecretRef>): Promise<Record<string, string>>
```

- **功能**：批量解析密钥引用

## 运行时（runtime.ts）

### prepareSecretsRuntime

```typescript
function prepareSecretsRuntime(config: OpenClawConfig): Promise<SecretsRuntimeState>
```

- **功能**：准备运行时密钥环境

### SecretsRuntimeState

运行时状态包含所有已解析的密钥和配置。

## 密钥值验证（secret-value.ts）

```typescript
function isExpectedResolvedSecretValue(value: unknown, expected: "string" | "string-or-object"): boolean
function hasConfiguredPlaintextSecretValue(value: unknown, expected: ...): boolean
```

## 配置应用（apply.ts）

### runSecretsApply

```typescript
function runSecretsApply(plan: SecretsApplyPlan): Promise<SecretsApplyResult>
```

### SecretsApplyResult

```typescript
type SecretsApplyResult = {
  applied: number;
  skipped: number;
  errors: string[];
};
```

## 配置向导（configure.ts）

### runSecretsConfigure

```typescript
function runSecretsConfigure(options?: { scope?: string }): Promise<SecretsApplyResult | null>
```

- **功能**：交互式密钥配置

## 计划（plan.ts）

### buildConfigurePlan

```typescript
function buildConfigurePlan(config: OpenClawConfig): SecretsConfigurePlan
```

### SecretsPlanTarget

```typescript
type SecretsPlanTarget = {
  type: string;
  path: string;           // 配置 dot path
  label: string;
  required: boolean;
  provider?: string;
};
```

## 审计（audit.ts）

### runSecretsAudit

```typescript
function runSecretsAudit(config: OpenClawConfig): Promise<SecurityAuditFinding[]>
```

## 目标注册表（target-registry.ts）

### queryTargetRegistry

```typescript
function queryTargetRegistry(type?: string, path?: string): SecretsPlanTarget[]
```

## 配置收集器

### runtime-config-collectors.ts

```typescript
function collectAllSecretTargets(config: OpenClawConfig): SecretsPlanTarget[]
```

### runtime-config-collectors-core.ts

```typescript
function collectCoreSecretTargets(config: OpenClawConfig): SecretsPlanTarget[]
```

### runtime-config-collectors-channels.ts

```typescript
function collectChannelSecretTargets(config: OpenClawConfig): SecretsPlanTarget[]
```

## Web 工具（runtime-web-tools.ts）

```typescript
function resolveRuntimeWebToolsMetadata(config: OpenClawConfig): Promise<RuntimeWebToolsMetadata>
function getActiveRuntimeWebToolsMetadata(): RuntimeWebToolsMetadata | null
```

## 渠道密钥

### channel-secret-basic-runtime.ts

```typescript
function resolveChannelBasicSecrets(config: OpenClawConfig, channelId: string): Record<string, string>
```

### channel-secret-collector-runtime.ts

```typescript
function collectChannelSecrets(config: OpenClawConfig): ChannelSecretCollection
```

## JSON Pointer（json-pointer.ts）

```typescript
function readJsonPointer(obj: unknown, pointer: string): unknown
function writeJsonPointer(obj: unknown, pointer: string, value: unknown): void
```
