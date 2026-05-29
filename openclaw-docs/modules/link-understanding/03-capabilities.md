# link-understanding — API

```typescript
function extractLinksFromMessage(message: string, options?: { maxLinks?: number }): string[]
async function runLinkUnderstanding(params: { ctx: MsgContext; cfg: OpenClawConfig }): Promise<LinkUnderstandingResult>
async function applyLinkUnderstanding(params: { ctx: MsgContext; cfg: OpenClawConfig }): Promise<ApplyLinkUnderstandingResult>
function formatLinkUnderstandingBody(params: { body?: string; outputs: string[] }): string
```

## 默认值

```typescript
DEFAULT_LINK_TIMEOUT_SECONDS = 30
DEFAULT_MAX_LINKS = 3
```
