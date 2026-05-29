# status — API

```typescript
function buildStatusText(params: StatusTextParams): Promise<string>
function buildStatusMessage(params: StatusMessageParams): Promise<StatusMessage>
function formatFastModeLabel(enabled: boolean): string
function resolveActiveFallbackState(params: FallbackStateParams): FallbackNoticeState | null
```
