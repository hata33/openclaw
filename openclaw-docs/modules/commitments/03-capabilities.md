# commitments — API

```typescript
function extractCommitments(messages: AgentMessage[]): Promise<Commitment[]>
function storeCommitments(sessionKey: string, commitments: Commitment[]): Promise<void>
function listCommitments(sessionKey: string): Commitment[]
```
