# OpenClaw 项目架构

> 本文档描述 OpenClaw 项目的整体架构设计、分层结构、各层职责与核心模块组成。

## 一、项目概览

OpenClaw 是一个 **AI 智能体平台**，提供从消息接入、会话管理、模型调度到工具执行的完整链路。项目采用 TypeScript 编写，运行于 Node.js 环境，使用 pnpm monorepo 管理多包结构。

**技术栈：**

| 项目 | 技术 |
|------|------|
| 语言 | TypeScript (ES2023) |
| 运行时 | Node.js |
| 包管理 | pnpm monorepo |
| 构建 | tsdown |
| 测试 | Vitest |
| 前端 | Vite |

---

## 二、架构分层

OpenClaw 采用 **10 层架构**，从上到下依次为：

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

---

## 三、各层详解

### 3.1 入口层（Entry）

**目录：** `src/entry.ts`、`src/cli/`、`openclaw.mjs`

**职责：** 进程启动、命令行解析、子进程管理。

| 模块 | 功能 |
|------|------|
| `entry.ts` | 主入口，启动 Gateway 守护进程 |
| `cli/` | CLI 命令定义与参数解析 |
| `entry.respawn.ts` | 崩溃自动重启机制 |
| `entry.compile-cache.ts` | V8 编译缓存加速启动 |
| `entry.version-fast-path.ts` | 快速版本查询 |

---

### 3.2 网关层（Gateway）

**目录：** `src/gateway/`

**职责：** 核心控制平面，管理配置热加载、会话调度、路由决策、WebSocket 通信。

| 模块 | 功能 |
|------|------|
| `config.ts` | 配置加载、校验与热更新 |
| `router.ts` | 请求路由与分发 |
| `ws-server.ts` | WebSocket 服务端 |
| `auth.ts` | 认证与鉴权 |
| `health.ts` | 健康检查端点 |

**关键特性：** 配置变更自动热加载，无需重启。

---

### 3.3 会话与代理层（Session & Agent）

**目录：** `src/sessions/`、`src/agents/`、`src/talk/`、`src/flows/`

**职责：** 会话生命周期管理、Agent 调度与执行、对话流程控制。

| 模块 | 功能 |
|------|------|
| `sessions/` | 会话创建、状态管理、上下文维护 |
| `agents/` | Agent 定义、加载、执行调度 |
| `talk/` | 对话消息处理与格式转换 |
| `flows/` | 多步工作流编排 |
| `commitments/` | 承诺与任务追踪 |
| `trajectory/` | 执行轨迹记录 |
| `context-engine/` | 上下文引擎，管理注入内容 |

**Agent 运行模式：**
- **main** — 主会话，直接与用户对话
- **isolated** — 隔离会话，独立执行任务
- **subagent** — 子代理，由父会话派生

---

### 3.4 渠道层（Channels）

**目录：** `src/channels/`

**职责：** 对接各消息平台，统一消息收发接口。

| 模块 | 支持平台 |
|------|----------|
| `telegram/` | Telegram |
| `discord/` | Discord |
| `whatsapp/` | WhatsApp |
| `signal/` | Signal |
| `slack/` | Slack |
| `wechat/` | 微信 |
| `webchat/` | Web 聊天 |
| `email/` | 邮件 |
| `mcp/` | MCP 协议 |

**统一接口：** 所有渠道实现 `ChannelAdapter` 接口，提供 `send`、`receive`、`format` 方法。

---

### 3.5 模型与运行时层（Model Runtime）

**目录：** `extensions/`（模型类扩展）

**职责：** 多模型 Provider 调度、请求路由、token 计费、流式响应。

| 模块 | 功能 |
|------|------|
| `model-catalog/` | 模型注册表，维护可用模型列表 |
| `provider-runtime/` | Provider 运行时适配 |
| `routing/` | 智能路由，选择最优模型 |
| `proxy-capture/` | 代理请求捕获与调试 |

**支持的 Provider：** OpenAI、Anthropic、Google、本地模型等。

---

### 3.6 工具层（Tools）

**目录：** `src/tools/`、`src/web-fetch/`、`src/web-search/`

**职责：** 提供 Agent 可调用的工具集。

| 模块 | 功能 |
|------|------|
| `tools/` | 工具注册与执行框架 |
| `web-fetch/` | 网页内容抓取 |
| `web-search/` | 网络搜索 |
| `browser/` | 浏览器自动化 |
| `media/` | 媒体文件处理 |
| `media-generation/` | 媒体内容生成 |
| `image-generation/` | 图片生成 |
| `video-generation/` | 视频生成 |
| `music-generation/` | 音乐生成 |
| `media-understanding/` | 多模态理解 |
| `link-understanding/` | 链接理解 |
| `tts/` | 文本转语音 |
| `realtime-transcription/` | 实时语音转文字 |
| `terminal/` | 终端命令执行 |
| `mcp/` | MCP 协议客户端 |

---

### 3.7 插件与扩展层（Plugins & Extensions）

**目录：** `src/plugins/`、`extensions/`、`skills/`

**职责：** 插件系统、技能扩展、第三方集成。

| 模块 | 功能 |
|------|------|
| `plugins/` | 插件加载、生命周期管理 |
| `plugin-sdk/` | 插件开发 SDK |
| `plugin-state/` | 插件状态持久化 |
| `skills/` | 技能定义与管理 |
| `extensions/` | 扩展包（模型、工具等） |
| `hooks/` | 钩子系统 |
| `bindings/` | 绑定层 |

---

### 3.8 基础设施层（Infrastructure）

**目录：** `src/infra/`、`src/config/`、`src/logging/`、`src/security/`、`src/memory/`、`src/cron/`

**职责：** 提供底层基础能力。

| 模块 | 功能 |
|------|------|
| `infra/` | 基础设施工具 |
| `config/` | 配置管理 |
| `logging/` | 日志系统 |
| `security/` | 安全与权限控制 |
| `secrets/` | 密钥管理 |
| `memory/` | 向量记忆存储 |
| `memory-host-sdk/` | 记忆宿主 SDK |
| `cron/` | 定时任务调度 |
| `daemon/` | 守护进程管理 |
| `i18n/` | 国际化 |
| `status/` | 状态监控 |
| `process/` | 子进程管理 |
| `compat/` | 兼容性层 |
| `shared/` | 共享工具函数 |
| `utils/` | 通用工具 |

---

### 3.9 UI 层（User Interface）

**目录：** `ui/`

**职责：** Web 管理面板、Canvas 渲染。

| 模块 | 功能 |
|------|------|
| `ui/` | Web 管理界面（Vite 构建） |
| Canvas | 实时渲染画布，支持 HTML/JS 预览 |

---

### 3.10 客户端层（Clients）

**目录：** `apps/`

**职责：** 多平台客户端应用。

| 模块 | 平台 |
|------|------|
| `apps/android/` | Android 应用 |
| `apps/ios/` | iOS 应用 |
| `apps/macos/` | macOS 应用 |
| `src/tui/` | 终端 UI（TUI） |

---

## 四、数据流

```
用户消息
  │
  ▼
渠道传输层（Telegram/Discord/WeChat/...）
  │
  ▼
渠道会话层（消息格式化、上下文注入）
  │
  ▼
网关（路由决策、配置加载）
  │
  ▼
Agent Prompt（系统提示词 + 工具定义 + 用户消息）
  │
  ▼
LLM Provider（模型推理）
  │
  ▼
工具调用（web-search/browser/terminal/...）
  │
  ▼
渠道输出（格式化响应、发送到用户）
```

---

## 五、模块统计

| 类别 | 数量 | 说明 |
|------|------|------|
| 源码目录 | 65+ | `src/` 下的子目录 |
| 工具集 | 20+ | web-search、browser、terminal 等 |
| 渠道 | 9+ | Telegram、Discord、WeChat 等 |
| 模型 Provider | 10+ | OpenAI、Anthropic、Google 等 |
| 插件 | 可扩展 | 通过 plugin-sdk 开发自定义插件 |

---

## 六、关键设计决策

| 决策 | 原因 |
|------|------|
| **TypeScript 全栈** | 前后端统一语言，降低维护成本 |
| **pnpm monorepo** | 多包共享依赖，版本统一管理 |
| **配置热加载** | 网关层支持配置变更不重启 |
| **渠道抽象层** | 统一接口，新增平台只需实现适配器 |
| **工具注册制** | 工具通过注册机制接入，Agent 按需调用 |
| **插件系统** | 核心精简，功能通过插件扩展 |
| **向量记忆** | 基于嵌入的语义记忆，支持长期上下文 |

---

## 七、相关文档

各层详细文档请参阅 [architecture/](architecture/) 目录：

| # | 层级 | 文档 |
|---|------|------|
| 1 | 入口层 | [01-entry.md](architecture/01-entry.md) |
| 2 | 网关层 | [02-gateway.md](architecture/02-gateway.md) |
| 3 | 会话与代理层 | [03-session-agent.md](architecture/03-session-agent.md) |
| 4 | 渠道层 | [04-channels.md](architecture/04-channels.md) |
| 5 | 模型与运行时层 | [05-model-runtime.md](architecture/05-model-runtime.md) |
| 6 | 工具层 | [06-tools.md](architecture/06-tools.md) |
| 7 | 插件与扩展层 | [07-plugins-extensions.md](architecture/07-plugins-extensions.md) |
| 8 | 基础设施层 | [08-infrastructure.md](architecture/08-infrastructure.md) |
| 9 | UI 层 | [09-ui.md](architecture/09-ui.md) |
| 10 | 客户端层 | [10-clients.md](architecture/10-clients.md) |
