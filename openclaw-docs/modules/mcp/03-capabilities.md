# mcp — 能力清单与对外接口

## Channel Server（channel-server.ts）

```typescript
function serveMcpChannelServer(options: OpenClawMcpServeOptions): Promise<void>

type OpenClawMcpServeOptions = {
  gatewayUrl?: string;
  gatewayToken?: string;
  gatewayPassword?: string;
  config?: OpenClawConfig;
  claudeChannelMode?: ClaudeChannelMode;
  verbose?: boolean;
};
```

## Channel Bridge（channel-bridge.ts）

```typescript
class OpenClawChannelBridge {
  sendMessage(params: SessionMessagePayload): Promise<QueueEvent>
  listConversations(): Promise<ConversationDescriptor[]>
  describeSession(sessionKey: string): Promise<SessionDescribeResult>
  getChatHistory(conversationId: string): Promise<ChatHistoryResult>
  waitForEvent(filter: WaitFilter): Promise<QueueEvent>
  approveRequest(id: string, decision: ApprovalDecision): Promise<void>
}
```

## Channel Tools（channel-tools.ts）

```typescript
function registerChannelMcpTools(server: McpServer, bridge: OpenClawChannelBridge): void
function getChannelMcpCapabilities(mode: ClaudeChannelMode): object | undefined
```

## OpenClaw Tools（openclaw-tools-serve.ts）

```typescript
function resolveOpenClawToolsForMcp(): AnyAgentTool[]
function createOpenClawToolsMcpServer(params?: { tools?: AnyAgentTool[] }): Server
```

## Plugin Tools（plugin-tools-serve.ts）

```typescript
function createPluginToolsMcpServer(params: { config?: OpenClawConfig }): Promise<Server>
```

## 通用 Stdio 服务器（tools-stdio-server.ts）

```typescript
function createToolsMcpServer(params: { name: string; tools: AnyAgentTool[] }): Server
function connectToolsMcpServerToStdio(server: Server): Promise<void>
```
