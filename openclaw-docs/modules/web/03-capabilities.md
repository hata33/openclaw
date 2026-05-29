# web — API

```typescript
function resolveWebProviderConfig(cfg: OpenClawConfig | undefined, kind: "search" | "fetch"): Record<string, unknown> | undefined
function readWebProviderEnvValue(envVars: string[], processEnv?: NodeJS.ProcessEnv): string | undefined
function providerRequiresCredential(provider: { requiresCredential?: boolean }): boolean
function hasWebProviderEntryCredential<TProvider, TConfig>(params: HasCredentialParams): boolean
function resolveWebProviderDefinition<TProvider, TConfig, TRuntimeMetadata, TDefinition>(params: ResolveParams): { provider: TProvider; definition: TDefinition } | null
```
