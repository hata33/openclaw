# OpenClaw 架构分层说明

> 本文档梳理 OpenClaw 项目的整体架构，按大模块分层说明各层职责、核心组件及相互关系。

---

## 目录

- [1. 项目概览](#1-项目概览)
- [2. 整体架构图](#2-整体架构图)
- [3. 分层架构详解](#3-分层架构详解)
  - [3.1 入口层 (Entry Layer)](#31-入口层-entry-layer)
  - [3.2 网关层 (Gateway Layer)](#32-网关层-gateway-layer)
  - [3.3 会话与代理层 (Session & Agent Layer)](#33-会话与代理层-session--agent-layer)
  - [3.4 渠道层 (Channel Layer)](#34-渠道层-channel-layer)
  - [3.5 模型与运行时层 (Model & Runtime Layer)](#35-模型与运行时层-model--runtime-layer)
  - [3.6 工具层 (Tools Layer)](#36-工具层-tools-layer)
  - [3.7 插件与扩展层 (Plugin & Extension Layer)](#37-插件与扩展层-plugin--extension-layer)
  - [3.8 基础设施层 (Infrastructure Layer)](#38-基础设施层-infrastructure-layer)
  - [3.9 UI 层 (Frontend Layer)](#39-ui层-frontend-layer)
  - [3.10 客户端层 (Client Apps Layer)](#310-客户端层-client-apps-layer)
- [4. 数据流概览](#4-数据流概览)
- [5. 目录结构速查](#5-目录结构速查)

---

## 1. 项目概览

| 属性 | 值 |
|------|-----|
| **名称** | OpenClaw |
| **版本** | 2026.5.26 |
| **描述** | Multi-channel AI gateway with extensible messaging integrations |
| **协议** | MIT |
| **技术栈** | TypeScript / Node.js (ES2023) / pnpm monorepo |
| **核心定位** | 个人 AI 助手，运行在用户自己的设备上 |

OpenClaw 是一个多渠道 AI 网关，将用户的聊天渠道（微信、Telegram、Discord、WhatsApp 等 20+）统一接入大语言模型，提供个人 AI 助手服务。它既是控制面（Gateway），也是产品本身（Assistant）。

---

## 2. 整体架构图

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
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ 认证鉴权  │ │ 路由分发  │ │ 会话管理  │ │ Agent Prompt 构建 │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   会话与代理层 (Session & Agent)                  │
│   src/sessions/ │ src/agents/ │ src/talk/ │ src/flows/          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ 会话生命周期 │ │ Agent 作用域 │ │ 对话运行控制 │ │  多步流程   │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
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

## 3. 分层架构详解

### 3.1 入口层 (Entry Layer)

**目录：** `src/entry.ts`, `src/cli/`, `openclaw.mjs`

职责：
- 程序启动入口，负责进程引导和编译缓存
- CLI 参数解析与命令分发（`openclaw gateway`, `openclaw onboard` 等）
- 进程重生（respawn）机制，确保崩溃后自动恢复
- 版本快速路径检测

核心文件：
- `entry.ts` — 主入口
- `entry.respawn.ts` — 进程重生逻辑
- `entry.compile-cache.ts` — 编译缓存加速
- `cli/argv.ts` — CLI 参数解析
- `cli/banner.ts` — 启动 banner

---

### 3.2 网关层 (Gateway Layer)

**目录：** `src/gateway/`

这是整个系统的核心控制平面，负责：

| 职责 | 说明 |
|------|------|
| **认证鉴权** | 安装策略、模式策略、速率限制 |
| **Agent 管理** | Agent 列表、作用域配置、Prompt 构建、身份管理 |
| **会话调度** | 活跃会话追踪、关闭协调 |
| **事件分发** | Assistant 文本事件、Agent 事件发射 |
| **配置管理** | 通道配置、能力协商、运行时状态 |

核心组件：
- `agent-prompt.ts` — Agent Prompt 构建引擎
- `agent-scope.ts` — Agent 作用域与权限
- `auth-mode-policy.ts` — 认证模式策略
- `auth-rate-limit.ts` — 速率限制
- `assistant-identity.ts` — 助手身份管理
- `active-sessions-shutdown-tracker.ts` — 会话关闭追踪

---

### 3.3 会话与代理层 (Session & Agent Layer)

**目录：** `src/sessions/`, `src/agents/`, `src/talk/`, `src/flows/`

这一层管理对话的核心生命周期：

**会话管理 (sessions/)**
- 会话 ID 生成与解析
- 会话分类（DM / Group / Direct）
- 模型覆盖与级别覆盖
- 发送策略与输入来源追踪

**代理管理 (agents/)**
- Agent 生命周期（创建、删除、配置）
- Agent 作用域（scope）隔离
- Agent 运行时配置与元数据
- ACP（Agent Client Protocol）绑定与 spawn
- 子 Agent 调度

**对话控制 (talk/)**
- Agent 运行控制（开始、中断、恢复）
- Agent 对话回传（consult）
- Agent 运行状态共享

**流程编排 (flows/)**
- 多步骤任务流程
- 任务状态机

---

### 3.4 渠道层 (Channel Layer)

**目录：** `src/channels/`

渠道层是 OpenClaw 最具特色的部分，抽象了 20+ 消息平台的统一接入：

```
src/channels/
├── registry.ts           # 渠道注册表
├── session.ts            # 渠道会话抽象
├── channel-config.ts     # 渠道配置
├── conversation-*.ts     # 会话绑定与解析
├── message/              # 消息处理
├── transport/            # 传输层抽象
├── turn/                 # 对话轮次管理
├── inbound-event/        # 入站事件处理
├── status/               # 状态管理
├── allowlists/           # 白名单机制
└── plugins/              # 渠道插件
```

支持的渠道（通过 `extensions/` 实现）：

| 分类 | 渠道 |
|------|------|
| **国际主流** | WhatsApp, Telegram, Slack, Discord, Signal, iMessage, IRC, Matrix |
| **企业级** | Microsoft Teams, Google Chat, Feishu(飞书), Mattermost |
| **国内主流** | WeChat(微信), QQ, Zalo |
| **其他** | LINE, Nostr, Twitch, Synology Chat, Nextcloud Talk, Tlon |

每个渠道通过 `extensions/` 下的独立扩展包实现，遵循统一的 Channel 接口协议。

---

### 3.5 模型与运行时层 (Model & Runtime Layer)

**目录：** `src/provider-runtime/`, `src/model-catalog/`, `extensions/` (模型相关)

负责对接各种 LLM 提供商：

| 扩展 | 提供商 |
|------|--------|
| `anthropic/` | Anthropic (Claude) |
| `openai/` | OpenAI (GPT) |
| `amazon-bedrock/` | AWS Bedrock |
| `azure-openai/` | Azure OpenAI |
| `google-*/` | Google Gemini |
| `alibaba/` | 阿里通义 |
| `deepseek/` | DeepSeek |
| `ollama/` | Ollama 本地模型 |
| `cerebras/`, `together/`, `groq/` | 其他推理服务 |

核心职责：
- 模型目录（model-catalog）：管理可用模型列表与能力
- Provider 运行时：统一的模型调用接口
- 操作重试（operation-retry）：网络异常自动重试
- 流式响应处理

---

### 3.6 工具层 (Tools Layer)

**目录：** `src/tools/`

提供 Agent 可调用的工具系统：

```
src/tools/
├── availability.ts    # 工具可用性检查
├── boundary.ts        # 工具边界（安全沙箱）
├── descriptors.ts     # 工具描述符
├── diagnostics.ts     # 诊断工具
├── execution.ts       # 工具执行引擎
├── planner.ts         # 工具调用规划
├── protocol.ts        # 工具协议定义
└── types.ts           # 类型定义
```

内置工具能力：
- **Shell 执行** — 远程/本地命令执行
- **Web 搜索** — Brave / Perplexity / Tavily
- **Web 抓取** — 网页内容提取
- **浏览器控制** — Playwright 驱动的浏览器自动化
- **文件操作** — 读写文件、目录管理
- **Canvas 渲染** — 实时 UI 渲染
- **TTS 语音** — 文字转语音
- **MCP 协议** — Model Context Protocol 支持

---

### 3.7 插件与扩展层 (Plugin & Extension Layer)

**目录：** `src/plugins/`, `extensions/`, `skills/`

这是 OpenClaw 的扩展性核心，三层扩展机制：

**1. Plugins (src/plugins/)**
核心插件框架，提供：
- 插件激活与生命周期管理
- 插件 API 构建器
- 工具中间件（agent-tool-result-middleware）
- 运行时注册表

**2. Extensions (extensions/) — 136 个扩展**
独立的功能扩展包，每个都是 pnpm workspace 成员：
- 模型提供商扩展（anthropic, openai, etc.）
- 渠道扩展（whatsapp, telegram, discord, etc.）
- 功能扩展（browser, canvas, tts, etc.）

扩展命名规则：`@openclaw/<provider-name>`

**3. Skills (skills/) — 58 个技能**
Agent 可调用的技能模块：
- 每个技能包含 `SKILL.md` 描述文件
- 技能发现与安装（clawhub）
- 动态加载，按需激活

---

### 3.8 基础设施层 (Infrastructure Layer)

**目录：** `src/infra/`, `src/config/`, `src/logging/`, `src/security/`

提供底层基础能力：

| 子系统 | 说明 |
|--------|------|
| **配置管理** (`config/`) | Agent 配置、渠道配置、能力协商、缓存管理 |
| **日志系统** (`logging/`) | 结构化日志、诊断日志、敏感信息脱敏 |
| **安全系统** (`security/`) | TLS、密钥管理、安全边界 |
| **基础设施** (`infra/`) | SSH 隧道、文件操作、Shell 环境、重启协调、更新管理 |
| **内存系统** (`memory/`) | 向量记忆（LanceDB）、根目录记忆文件 |
| **调度系统** (`cron/`) | 定时任务、投递计划、任务生命周期 |
| **进程管理** (`process/`) | 子进程管理、终端会话 |
| **Web 抓取** (`web-fetch/`, `web-search/`) | 网页内容提取、搜索引擎集成 |
| **TTS** (`tts/`) | 语音合成（OpenAI、Azure、ElevenLabs 等） |
| **MCP** (`mcp/`) | Model Context Protocol 服务端/客户端 |

---

### 3.9 UI 层 (Frontend Layer)

**目录：** `ui/`

Web 管理面板，基于 Vite 构建：

```
ui/
├── src/
│   ├── ui/
│   │   ├── views/        # 页面视图
│   │   │   ├── overview.ts      # 总览
│   │   │   ├── sessions.ts      # 会话管理
│   │   │   ├── skills.ts        # 技能管理
│   │   │   ├── usage.ts         # 用量统计
│   │   │   ├── nodes.ts         # 节点管理
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── vite.config.ts
└── vitest.config.ts
```

功能：
- Gateway 状态总览
- 会话管理与聊天界面
- 技能/插件管理
- 用量与计费统计
- 节点（Node）管理
- 配置编辑

---

### 3.10 客户端层 (Client Apps Layer)

**目录：** `apps/`

原生客户端应用：

| 应用 | 目录 | 说明 |
|------|------|------|
| **Android** | `apps/android/` | Android 原生应用 |
| **iOS** | `apps/ios/` | iOS 原生应用 |
| **macOS** | `apps/macos/` | macOS 原生应用 + MLX TTS |
| **Swabble** | `apps/swabble/` | 轻量客户端 |

这些客户端通过 Node Host 协议与 Gateway 通信，支持：
- 语音通话（Voice）
- 摄像头/屏幕共享（Vision）
- 本地 TTS 推理
- 推送通知

---

## 4. 数据流概览

一条消息从用户到 AI 再到回复的完整流程：

```
用户发送消息 (微信/Telegram/...)
        │
        ▼
┌─ Channel Transport ─┐
│  渠道适配层接收消息    │
│  转换为统一内部格式    │
└─────────┬───────────┘
          │
          ▼
┌─ Channel Session ───┐
│  会话路由与解析       │
│  确定 Agent / 模型   │
│  权限检查与白名单     │
└─────────┬───────────┘
          │
          ▼
┌─ Gateway ───────────┐
│  构建 Agent Prompt   │
│  注入系统上下文       │
│  加载记忆与技能       │
└─────────┬───────────┘
          │
          ▼
┌─ Talk Runtime ──────┐
│  调用 LLM Provider   │
│  处理流式响应         │
│  工具调用循环         │
│  多步骤流程编排       │
└─────────┬───────────┘
          │
          ▼
┌─ Channel Output ────┐
│  格式化回复消息       │
│  处理媒体/附件       │
│  发送回用户渠道       │
└─────────────────────┘
```

---

## 5. 目录结构速查

```
openclaw/
├── src/                    # 核心源码（TypeScript）
│   ├── gateway/            # 网关层 — 核心控制平面
│   ├── sessions/           # 会话管理
│   ├── agents/             # Agent 管理
│   ├── channels/           # 渠道抽象层
│   ├── tools/              # 工具系统
│   ├── plugins/            # 插件框架
│   ├── talk/               # 对话运行时
│   ├── flows/              # 多步流程
│   ├── cli/                # CLI 命令
│   ├── config/             # 配置管理
│   ├── infra/              # 基础设施
│   ├── logging/            # 日志系统
│   ├── memory/             # 记忆系统
│   ├── mcp/                # MCP 协议
│   ├── tts/                # 语音合成
│   ├── cron/               # 定时任务
│   ├── routing/            # 路由与绑定
│   ├── hooks/              # 钩子系统
│   ├── security/           # 安全模块
│   ├── web/                # Web 相关
│   ├── web-fetch/          # 网页抓取
│   ├── web-search/         # 搜索引擎
│   ├── bootstrap/          # 启动引导
│   ├── provider-runtime/   # 模型运行时
│   ├── model-catalog/      # 模型目录
│   └── ...
│
├── extensions/             # 扩展包（136 个）
│   ├── anthropic/          # Anthropic 模型
│   ├── openai/             # OpenAI 模型
│   ├── whatsapp/           # WhatsApp 渠道
│   ├── telegram/           # Telegram 渠道
│   ├── discord/            # Discord 渠道
│   ├── wechat/             # 微信渠道
│   ├── browser/            # 浏览器控制
│   ├── canvas/             # Canvas 渲染
│   └── ...                 # 更多模型/渠道/功能扩展
│
├── skills/                 # 技能模块（58 个）
├── packages/               # 共享包（SDK、插件 SDK 等）
├── apps/                   # 原生客户端（Android/iOS/macOS）
├── ui/                     # Web 管理面板
├── docs/                   # 文档
├── config/                 # 配置文件
├── scripts/                # 构建/部署脚本
├── deploy/                 # 部署配置
├── qa/                     # 测试相关
├── test/                   # 测试工具
├── Dockerfile              # Docker 构建
├── docker-compose.yml      # Docker 编排
├── fly.toml                # Fly.io 部署
├── render.yaml             # Render 部署
└── package.json            # pnpm monorepo 根配置
```

---

> 📝 本文档基于 OpenClaw v2026.5.26 源码结构编写。随着项目迭代，具体模块可能有所调整。
>
> 🔗 相关文档：[README.md](README.md) | [CONTRIBUTING.md](CONTRIBUTING.md) | [VISION.md](VISION.md) | [docs/](docs/)
