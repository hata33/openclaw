# node-host — API

## 节点启动（runner.ts）

```typescript
function runNodeHost(params?: { config?: OpenClawConfig }): Promise<void>
```

## 命令执行（invoke.ts）

```typescript
function invokeCommand(params: InvokeCommandParams): Promise<InvokeCommandResult>
```

## 系统执行（invoke-system-run.ts）

```typescript
function invokeSystemRun(params: {
  command: string;
  config: OpenClawConfig;
  client: GatewayClient;
}): Promise<SystemRunResult>
```

## 白名单（invoke-system-run-allowlist.ts）

```typescript
function evaluateExecAllowlist(command: string, approvals: ExecApprovalsResolved): ExecSegmentSatisfiedBy | null
```

## 配置（config.ts）

```typescript
type NodeHostGatewayConfig = {
  host?: string;
  port?: number;
  tls?: boolean;
  tlsFingerprint?: string;
};
function ensureNodeHostConfig(): Promise<NodeHostGatewayConfig>
function saveNodeHostConfig(config: NodeHostGatewayConfig): Promise<void>
```

## 超时（with-timeout.ts）

```typescript
function withTimeout<T>(work: (signal?: AbortSignal) => Promise<T>, timeoutMs?: number, label?: string): Promise<T>
```
