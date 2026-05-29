# bindings — API

```typescript
function createConversationBindingRecord(input: SessionBindingBindInput): Promise<SessionBindingRecord>
function resolveConversationBindingRecord(conversation: ConversationRef): SessionBindingRecord | null
function listSessionBindingRecords(targetSessionKey: string): SessionBindingRecord[]
function touchConversationBindingRecord(bindingId: string, at?: number): void
function unbindConversationBindingRecord(input: SessionBindingUnbindInput): Promise<SessionBindingRecord[]>
function getConversationBindingCapabilities(params: { channel: string; accountId: string }): SessionBindingCapabilities
```
