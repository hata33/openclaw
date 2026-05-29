# flows — 能力清单与对外接口

## Doctor（doctor-health.ts）

```typescript
function doctorCommand(runtime?: RuntimeEnv, options?: DoctorOptions): Promise<void>
```

## 渠道设置（channel-setup.ts）

```typescript
function runChannelSetupFlow(params: {
  runtime: RuntimeEnv;
  config: OpenClawConfig;
}): Promise<void>
```

## Provider 配置（provider-flow.ts）

```typescript
function resolveProviderFlowContributions(config: OpenClawConfig): FlowContribution[]
function runProviderSetupFlow(params: {
  config: OpenClawConfig;
  providerId: string;
}): Promise<void>
```

## 搜索配置（search-setup.ts）

```typescript
function runSearchSetupFlow(params: {
  config: OpenClawConfig;
}): Promise<void>
```

## 健康检查（health-checks.ts）

```typescript
type HealthFinding = {
  id: string;
  severity: HealthFindingSeverity;
  title: string;
  detail: string;
  remediation?: string;
};

type HealthCheck = {
  id: string;
  label: string;
  run(): Promise<HealthFinding[]>;
};
```

## 注册表（health-check-registry.ts）

```typescript
function registerHealthCheck(check: HealthCheck): void
function listHealthChecks(): HealthCheck[]
```

## 模型选择（model-picker.ts）

```typescript
function pickModel(params: {
  config: OpenClawConfig;
  prompter: DoctorPrompter;
}): Promise<{ provider: string; model: string }>
```

## 类型（types.ts）

```typescript
type FlowContribution = {
  kind: "channel" | "core" | "provider" | "search";
  surface: "auth-choice" | "health" | "model-picker" | "setup";
  options: FlowOption[];
};

type FlowOption = {
  value: string;
  label: string;
  hint?: string;
  group?: FlowOptionGroup;
};
```
