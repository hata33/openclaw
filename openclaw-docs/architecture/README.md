# OpenClaw 架构分层说明

> 本文档集按项目大模块分层梳理 OpenClaw 的架构，每个文档对应一个架构层，详细描述该层的目录结构、文件职责与核心设计。

## 架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端层 (Clients)                        │
│   Android App │ iOS App │ macOS App │ TUI │ Web UI (Canvas)     │
└──────────┬──────────────────────────────────────┬───────────────┘
           │                                      │
           ▼                                      ▼
┌─────────────────────┐              ┌──────────────────────────┐
│   Node Host Layer   │              │     UI Layer (ui/)       │
│  移动端/桌面端运行时  │              │  Web 管理面板 + Canvas   │
└─────────┬───────────┘              └──────────┬───────────────┘
          │                                      │
          ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       网关层 (Gateway)                           │
│              src/gateway/ — 核心控制平面                          │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   会话与代理层 (Session & Agent)                  │
│   src/sessions/ │ src/agents/ │ src/talk/ │ src/flows/          │
└──────────┬──────────────────────────────────────────────────────┘
           │
     ┌─────┴─────┬──────────────┬───────────────┐
     ▼           ▼              ▼               ▼
┌─────────┐ ┌─────────┐ ┌─────────────┐ ┌─────────────┐
│ 渠道层   │ │ 模型层   │ │   工具层     │ │  插件层      │
│Channels │ │ Models  │ │   Tools     │ │  Plugins    │
└─────────┘ └─────────┘ └─────────────┘ └─────────────┘
```

## 文档索引

| # | 层级 | 文档 | 核心目录 |
|---|------|------|----------|
| 1 | 入口层 | [01-entry.md](01-entry.md) | `src/entry.ts`, `src/cli/`, `openclaw.mjs` |
| 2 | 网关层 | [02-gateway.md](02-gateway.md) | `src/gateway/` |
| 3 | 会话与代理层 | [03-session-agent.md](03-session-agent.md) | `src/sessions/`, `src/agents/`, `src/talk/`, `src/flows/` |
| 4 | 渠道层 | [04-channels.md](04-channels.md) | `src/channels/` |
| 5 | 模型与运行时层 | [05-model-runtime.md](05-model-runtime.md) | `extensions/`（模型类） |
| 6 | 工具层 | [06-tools.md](06-tools.md) | `src/tools/`, `src/web-fetch/`, `src/web-search/` |
| 7 | 插件与扩展层 | [07-plugins-extensions.md](07-plugins-extensions.md) | `src/plugins/`, `extensions/`, `skills/` |
| 8 | 基础设施层 | [08-infrastructure.md](08-infrastructure.md) | `src/infra/`, `src/config/`, `src/logging/`, `src/security/`, `src/memory/`, `src/cron/` |
| 9 | UI 层 | [09-ui.md](09-ui.md) | `ui/` |
| 10 | 客户端层 | [10-clients.md](10-clients.md) | `apps/` |

## 数据流

```
用户消息 → 渠道传输层 → 渠道会话层 → 网关 → Agent Prompt → LLM Provider → 工具调用 → 渠道输出
```

## 技术栈

| 项目 | 技术 |
|------|------|
| 语言 | TypeScript (ES2023) |
| 运行时 | Node.js |
| 包管理 | pnpm monorepo |
| 构建 | tsdown |
| 测试 | Vitest |
| 前端 | Vite |
| 协议 | MIT |
