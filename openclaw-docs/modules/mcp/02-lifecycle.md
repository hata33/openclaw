# mcp — 实现流程与数据流

## Channel Server 启动流程

```
Claude Desktop 启动 → 连接 MCP Server
  ↓
1. 创建 McpServer
   new McpServer({ name: "openclaw-channel", version })

2. 注册渠道能力
   getChannelMcpCapabilities(claudeChannelMode)
   → experimental: { "claude/channel": {} }

3. 创建 Channel Bridge
   new OpenClawChannelBridge({ gatewayUrl, gatewayToken })

4. 注册工具
   registerChannelMcpTools(server, bridge)
   → send_message, list_conversations, etc.

5. 连接 stdio
   new StdioServerTransport()
   server.connect(transport)
```

## 工具调用流程

```
Claude Desktop 调用 send_message
  ↓
1. MCP Server 接收请求
   CallToolRequestSchema

2. Channel Bridge 处理
   bridge.sendMessage({ channel, to, text })
   → 通过 Gateway WebSocket 发送

3. Gateway 路由
   → 发送到目标渠道

4. 返回结果
   → MCP 响应给 Claude Desktop
```

## Plugin Tools 启动流程

```
启动 plugin-tools-serve
  ↓
1. 加载配置
   getRuntimeConfig()

2. 加载插件工具
   ensureStandalonePluginToolRegistryLoaded()
   resolvePluginTools(config)

3. 创建 MCP Server
   createToolsMcpServer({ name: "openclaw-plugins", tools })

4. 注册工具
   createPluginToolsMcpHandlers(tools)
   → listTools, callTool

5. 连接 stdio
   connectToolsMcpServerToStdio(server)
```
