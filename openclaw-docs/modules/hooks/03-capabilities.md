# hooks — API

```typescript
function registerHook(hook: HookDefinition): void
function fireHook(event: HookEvent, params: HookParams): Promise<HookResult>
function listConfiguredHooks(): HookDefinition[]
```
