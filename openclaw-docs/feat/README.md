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

## 项目核心特点

从 README 和代码分析中提炼出 OpenClaw 的 6 个核心设计特点：

1. **本地优先（Local-first）** — Gateway 运行在用户设备上，数据不离开本地
2. **渠道无关（Channel-agnostic）** — 25+ 渠道通过统一 ChannelPlugin 接口接入
3. **插件驱动（Plugin-driven）** — Provider、工具、渠道、记忆全部通过插件系统扩展
4. **安全默认（Secure by default）** — 沙箱隔离、DM 配对、工具权限控制
5. **单用户设计（Single-user）** — 为个人助手场景优化，非多租户 SaaS
6. **能力组合（Composable）** — 工具、技能、Hook、MCP 可自由组合

## 阅读建议

- 先读 README 和 VISION.md 理解项目定位
- 按编号顺序阅读，从网关→插件→会话→工具逐层深入
- 每篇文档末尾都有"关键代码入口"，可以直接跳转源码验证
