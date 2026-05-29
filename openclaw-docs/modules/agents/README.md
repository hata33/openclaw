# agents — Agent 系统

> OpenClaw 的核心 Agent 系统。850 个文件，206686 行代码。
> 管理 Agent 生命周期、模型调用、工具执行、会话上下文和子 Agent。

## 子模块

| 子目录 | 说明 |
|--------|------|
| `auth-profiles/` | 认证配置（多 API Key 管理） |
| `cli-runner/` | CLI Agent 运行器 |
| `command/` | Agent 命令处理 |
| `harness/` | Agent Harness（运行时包装） |
| `pi-embedded-helpers/` | Pi 嵌入式辅助 |
| `pi-embedded-runner/` | Pi 嵌入式运行器（核心 Agent 循环） |
| `pi-hooks/` | Pi Hooks（Agent 生命周期钩子） |
| `runtime-plan/` | 运行时计划 |
| `sandbox/` | 沙箱工具策略 |
| `schema/` | Agent Schema |
| `skills/` | 技能系统 |
| `templates/` | 模板 |
| `test-helpers/` | 测试辅助 |
| `tools/` | Agent 工具（exec、fs、browser、memory 等） |

## 核心概念

### Agent 循环

```
接收消息 → 组装上下文 → 调用模型 → 解析工具调用 → 执行工具 → 返回结果
↑                                                              ↓
└──────────────── Agent 循环 ──────────────────────────────────┘
```

### 模型调用

通过 Provider Runtime 调用 AI 模型（OpenAI、Anthropic、Google 等）。

### 工具系统

Agent 可调用的工具：exec、fs、browser、memory、cron、canvas 等。

### 子 Agent

支持生成子 Agent 执行独立任务。

### 上下文管理

管理对话历史、系统提示、工具描述等上下文窗口内容。
