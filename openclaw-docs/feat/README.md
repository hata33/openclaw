# OpenClaw 核心特性实现原理

> 本目录基于 OpenClaw 项目实际代码，深入分析每个核心特性的实现原理。
> 每篇文档聚焦一个特性，从"它是什么"到"它怎么实现的"，帮助开发者快速理解项目的技术细节。

## 特性索引

| 文档 | 特性 | 核心代码位置 |
|------|------|-------------|
| [01-multi-channel-gateway.md](01-multi-channel-gateway.md) | 多渠道网关架构 | `src/channels/`, `src/gateway/` |
| [02-plugin-provider-system.md](02-plugin-provider-system.md) | 插件与 Provider 系统 | `src/plugins/`, `src/plugin-sdk/`, `extensions/` |
| [03-session-model.md](03-session-model.md) | 会话模型与多 Agent 路由 | `src/sessions/`, `src/agents/`, `src/routing/` |
| [04-tool-system.md](04-tool-system.md) | 工具系统 | `src/tools/`, `extensions/` |
| [05-security-sandbox.md](05-security-sandbox.md) | 安全与沙箱机制 | `src/security/`, `src/agents/sandbox/` |
| [06-voice-media.md](06-voice-media.md) | 语音与媒体处理管线 | `src/talk/`, `src/tts/`, `src/media/` |
| [07-memory-system.md](07-memory-system.md) | 记忆系统 | `src/memory/`, `extensions/memory-*` |
| [08-skill-system.md](08-skill-system.md) | 技能系统 | `src/plugins/`, `extensions/` |
| [09-cron-automation.md](09-cron-automation.md) | 定时任务与自动化 | `src/cron/` |
| [10-canvas-a2ui.md](10-canvas-a2ui.md) | 实时 Canvas 与 A2UI | `extensions/canvas/` |
| [11-mcp-support.md](11-mcp-support.md) | MCP 协议支持 | `src/mcp/` |
| [12-acp-agent-protocol.md](12-acp-agent-protocol.md) | ACP 子 Agent 通信协议 | `src/acp/` |
| [13-context-engine.md](13-context-engine.md) | 上下文引擎 | `src/context-engine/` |
| [14-model-catalog-provider.md](14-model-catalog-provider.md) | 模型目录与 Provider 运行时 | `src/model-catalog/`, `src/provider-runtime/` |
| [15-web-search-fetch.md](15-web-search-fetch.md) | 网页搜索与抓取 | `src/web-search/`, `src/web-fetch/` |
| [16-link-understanding.md](16-link-understanding.md) | 链接理解 | `src/link-understanding/` |
| [17-aigc-generation.md](17-aigc-generation.md) | AIGC 生成管线（图片/视频/音乐） | `src/image-generation/`, `src/video-generation/`, `src/music-generation/` |
| [18-media-understanding.md](18-media-understanding.md) | 媒体理解 | `src/media-understanding/` |
| [19-realtime-transcription.md](19-realtime-transcription.md) | 实时转录 | `src/realtime-transcription/` |
| [20-hook-system.md](20-hook-system.md) | Hook 系统 | `src/hooks/` |
| [21-flow-orchestration.md](21-flow-orchestration.md) | 流程编排 | `src/flows/` |
| [22-commitment-system.md](22-commitment-system.md) | 承诺系统 | `src/commitments/` |
| [23-node-host-remote-exec.md](23-node-host-remote-exec.md) | 节点宿主与远程执行 | `src/node-host/` |
| [24-device-pairing.md](24-device-pairing.md) | 设备配对 | `src/pairing/` |
| [25-transcript-storage.md](25-transcript-storage.md) | 对话转录与存储 | `src/transcripts/` |
| [26-trajectory-recording.md](26-trajectory-recording.md) | 轨迹记录与导出 | `src/trajectory/` |
| [27-proxy-capture.md](27-proxy-capture.md) | 代理抓取与流量捕获 | `src/proxy-capture/` |
| [28-config-system.md](28-config-system.md) | 配置系统 | `src/config/` |
| [29-cli-commands.md](29-cli-commands.md) | CLI 命令系统 | `src/cli/`, `src/commands/` |
| [30-tui.md](30-tui.md) | 终端 UI（TUI） | `src/tui/` |
| [31-onboard-wizard.md](31-onboard-wizard.md) | 引导向导 | `src/wizard/` |
| [32-daemon.md](32-daemon.md) | 守护进程管理 | `src/daemon/` |
| [33-auto-reply.md](33-auto-reply.md) | 自动回复与命令解析 | `src/auto-reply/` |
| [34-i18n.md](34-i18n.md) | 国际化 | `src/i18n/` |
| [35-secrets-management.md](35-secrets-management.md) | 密钥管理 | `src/secrets/` |
| [36-crestodian-audit.md](36-crestodian-audit.md) | Crestodian 审计助手 | `src/crestodian/` |
| [37-bootstrap.md](37-bootstrap.md) | 启动引导 | `src/bootstrap/` |

## 项目核心特点

从 README 和代码分析中提炼出 OpenClaw 的 6 个核心设计特点：

1. **本地优先（Local-first）** — Gateway 运行在用户设备上，数据不离开本地
2. **渠道无关（Channel-agnostic）** — 25+ 渠道通过统一 ChannelPlugin 接口接入
3. **插件驱动（Plugin-driven）** — Provider、工具、渠道、记忆全部通过插件系统扩展
4. **安全默认（Secure by default）** — 沙箱隔离、DM 配对、工具权限控制
5. **单用户设计（Single-user）** — 为个人助手场景优化，非多租户 SaaS
6. **能力组合（Composable）** — 工具、技能、Hook、MCP 可自由组合

## 特性分类

### 核心平台
- 01 多渠道网关 / 03 会话模型 / 28 配置系统 / 29 CLI 命令 / 32 守护进程 / 37 启动引导

### Agent 能力
- 04 工具系统 / 08 技能系统 / 09 定时任务 / 20 Hook 系统 / 22 承诺系统

### AI 与模型
- 13 上下文引擎 / 14 模型目录 / 17 AIGC 生成 / 18 媒体理解 / 19 实时转录

### 通信协议
- 11 MCP 协议 / 12 ACP 子 Agent 协议

### 知识与记忆
- 07 记忆系统 / 25 对话转录 / 26 轨迹记录

### Web 能力
- 15 网页搜索与抓取 / 16 链接理解 / 27 代理抓取

### 安全与审计
- 05 安全与沙箱 / 23 节点宿主 / 24 设备配对 / 35 密钥管理 / 36 Crestodian 审计

### 用户体验
- 06 语音与媒体 / 10 Canvas 与 A2UI / 30 终端 UI / 31 引导向导 / 33 自动回复 / 34 国际化

### 扩展系统
- 02 插件与 Provider / 21 流程编排
