# acp — API

```typescript
function startAcpServer(options: AcpServerOptions): Promise<AcpServer>
function createAcpClient(params: AcpClientParams): AcpClient
function classifyApproval(operation: AcpOperation): ApprovalLevel
function mapSession(conversationId: string): SessionKey
```
