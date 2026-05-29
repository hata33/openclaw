# 工具层 (Tools Layer)

> 提供 Agent 可调用的工具系统，是 Agent 能力的直接体现。

## 目录结构

```
src/tools/                           # 工具框架
├── index.ts                         # 工具模块入口
├── types.ts                         # 类型定义
├── protocol.ts                      # 工具协议定义
├── descriptors.ts                   # 工具描述符（名称、参数、能力）
├── availability.ts                  # 工具可用性检查
├── boundary.ts                      # 工具边界（安全沙箱限制）
├── execution.ts                     # 工具执行引擎
├── planner.ts                       # 工具调用规划
└── diagnostics.ts                   # 诊断工具

src/web-fetch/                       # 网页抓取工具
└── ...                              # URL 内容提取、HTML 转 Markdown

src/web-search/                      # 搜索引擎工具
└── ...                              # 搜索 API 集成

src/browser-lifecycle-cleanup.ts     # 浏览器生命周期清理

src/tts/                             # 文字转语音工具
├── directives.ts                    # TTS 指令
├── prepare-text.ts                  # 文本预处理
├── provider-registry.ts             # TTS Provider 注册表
├── provider-types.ts                # Provider 类型
└── openai-compatible-speech-provider.ts  # OpenAI 兼容语音 Provider

src/talk/                            # 对话运行控制
├── agent-run-control.ts             # 运行控制
├── agent-consult-runtime.ts         # 咨询运行时
├── agent-consult-tool.ts            # 咨询工具
└── agent-talkback-runtime.ts        # 回传运行时

src/mcp/                             # Model Context Protocol
├── channel-server.ts                # MCP 通道服务器
├── channel-bridge.ts                # 通道桥接
├── channel-shared.ts                # 共享通道
├── channel-tools.ts                 # 通道工具
├── openclaw-tools-serve.ts          # OpenClaw 工具服务
├── plugin-tools-handlers.ts         # 插件工具处理器
├── plugin-tools-serve.ts            # 插件工具服务
└── tools-stdio-server.ts            # Stdio 工具服务器
```

## 内置工具

| 工具 | 说明 | 实现位置 |
|------|------|----------|
| **Shell** | 远程/本地命令执行 | `src/process/` |
| **Web 搜索** | Brave / Perplexity / Tavily | `src/web-search/` |
| **Web 抓取** | 网页内容提取 | `src/web-fetch/` |
| **浏览器** | Playwright 驱动的浏览器自动化 | `extensions/browser/` |
| **Canvas** | 实时 UI 渲染 | `extensions/canvas/` |
| **TTS** | 文字转语音 | `src/tts/` |
| **文件操作** | 读写文件、目录管理 | `src/infra/` |
| **MCP** | Model Context Protocol 服务 | `src/mcp/` |

## 安全模型

### 工具边界 (Boundary)
`boundary.ts` 定义了工具的安全沙箱：
- 文件系统访问范围限制
- 命令执行白名单
- 网络访问控制
- 敏感操作审批机制

### 可用性检查 (Availability)
`availability.ts` 根据 Agent 作用域和配置动态决定哪些工具可用。

## MCP 协议

Model Context Protocol 是一种标准化协议，允许 Agent 调用外部工具服务：
- **Channel Server** — 在渠道层面提供 MCP 工具
- **Plugin Tools** — 插件暴露的工具
- **Stdio Server** — 通过标准输入输出通信
