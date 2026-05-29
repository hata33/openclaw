# wizard — 能力清单与对外接口

## 主入口（setup.ts）

```typescript
function runSetupWizard(options?: OnboardOptions): Promise<void>
```

## 提示工具（prompts.ts）

```typescript
function wizardSelect<T>(params: WizardSelectParams<T>): Promise<T>
function wizardMultiSelect<T>(params: WizardMultiSelectParams<T>): Promise<T[]>
function wizardText(params: { message: string; initialValue?: string }): Promise<string>
function wizardConfirm(params: { message: string; initialValue?: boolean }): Promise<boolean>
function wizardPassword(params: { message: string }): Promise<string>

class WizardCancelledError extends Error {}
```

## Gateway 配置（setup.gateway-config.ts）

```typescript
function configureGateway(prompter: WizardPrompter): Promise<GatewayWizardSettings>
```

## 密钥输入（setup.secret-input.ts）

```typescript
function resolveSetupSecretInputString(params: {
  prompter: WizardPrompter;
  label: string;
  required?: boolean;
}): Promise<SecretInput>
```

## 插件配置（setup.plugin-config.ts）

```typescript
function configurePlugins(prompter: WizardPrompter, config: OpenClawConfig): Promise<OpenClawConfig>
```

## 官方插件（setup.official-plugins.ts）

```typescript
function selectOfficialPlugins(prompter: WizardPrompter): Promise<string[]>
```

## 完成（setup.completion.ts）

```typescript
function showCompletionSummary(config: OpenClawConfig): void
```

## 国际化（i18n/index.ts）

```typescript
function t(key: string, params?: Record<string, string>): string
```

## 类型（setup.types.ts）

```typescript
type WizardFlow = "quickstart" | "advanced";

type QuickstartGatewayDefaults = {
  hasExisting: boolean;
  port: number;
  bind: "loopback" | "lan" | "auto" | "custom" | "tailnet";
  authMode: GatewayAuthChoice;
  tailscaleMode: "off" | "serve" | "funnel";
  token?: SecretInput;
  password?: SecretInput;
};
```
