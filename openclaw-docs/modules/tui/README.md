# tui — 终端用户界面

> OpenClaw 的交互式终端界面（TUI）。
> 提供基于终端的聊天、会话管理、命令处理和实时流式显示。

## 文件结构（35 个文件）

### 核心入口

| 文件 | 职责 |
|------|------|
| `tui.ts` | TUI 主入口 |
| `tui-types.ts` | 类型定义 |
| `tui-launch.ts` | 启动逻辑 |
| `tui-backend.ts` | TUI 后端（与 Gateway 通信） |
| `embedded-backend.ts` | 嵌入式后端（本地运行） |
| `gateway-chat.ts` | Gateway 聊天 |
| `commands.ts` | 命令定义 |

### 事件/命令处理

| 文件 | 职责 |
|------|------|
| `tui-event-handlers.ts` | 事件处理 |
| `tui-command-handlers.ts` | 命令处理 |
| `tui-submit.ts` | 消息提交 |
| `tui-session-actions.ts` | 会话操作 |

### 显示

| 文件 | 职责 |
|------|------|
| `tui-formatters.ts` | 格式化 |
| `tui-overlays.ts` | 叠加层 |
| `tui-status-summary.ts` | 状态摘要 |
| `tui-stream-assembler.ts` | 流式消息组装 |
| `tui-waiting.ts` | 等待状态显示 |
| `tui-last-session.ts` | 最后会话 |

### 会话管理

| 文件 | 职责 |
|------|------|
| `tui-session-list-policy.ts` | 会话列表策略 |
| `tui-local-shell.ts` | 本地 Shell |

### 辅助

| 文件 | 职责 |
|------|------|
| `local-run-shutdown.ts` | 本地运行关闭 |
| `setup-launch-env.ts` | 启动环境设置 |
| `osc8-hyperlinks.ts` | OSC8 超链接 |
| `components/` | UI 组件 |
| `theme/` | 主题 |

## 核心概念

### TUI 模式

OpenClaw 支持两种 TUI 模式：

1. **Gateway 模式** — 连接远程 Gateway
2. **本地模式** — 直接在本地运行 Agent

### 流式显示

Agent 回复实时流式显示在终端，支持 Markdown 渲染。

### 命令系统

```
/status   — 显示状态
/model    — 切换模型
/reasoning — 切换推理模式
/clear    — 清除上下文
/compact  — 压缩上下文
/exit     — 退出
```
