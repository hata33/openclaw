# bootstrap — API

```typescript
function resolveAutoNodeExtraCaCerts(params?: {
  env?: EnvMap;
  platform?: NodeJS.Platform;
  execPath?: string;
  accessSync?: AccessSyncFn;
}): string | undefined

function resolveNodeStartupTlsEnvironment(params?: {
  env?: EnvMap;
  platform?: NodeJS.Platform;
  execPath?: string;
  includeDarwinDefaults?: boolean;
  accessSync?: AccessSyncFn;
}): NodeStartupTlsEnvironment

function resolveLinuxSystemCaBundle(params?: {
  platform?: NodeJS.Platform;
  accessSync?: AccessSyncFn;
}): string | undefined

function isNodeVersionManagerRuntime(env?: EnvMap, execPath?: string): boolean
```
