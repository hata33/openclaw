# 30 — 终端 UI（TUI）

> OpenClaw 的 TUI（Terminal User Interface）提供基于终端的交互式聊天界面，
> 让用户可以在终端中直接与 Agent 对话。

## 设计思想

```
传统方式：终端中通过 CLI 命令操作
  → 适合脚本和管理

TUI 方式：终端中的聊天界面
  → 类似 WhatsApp/Telegram 的体验
  → 但在终端中
  → 支持实时消息流、工具调用展示
```

## 架构

```
┌────────────────────────────────────┐
│           TUI 界面                  │
│  ┌──────────────────────────────┐  │
│  │  消息列表（滚动区域）          │  │
│  │  🤖 你好！有什么可以帮你的？    │  │
│  │  👤 帮我查一下天气             │  │
│  │  🤖 [工具: web_search] ...    │  │
│  │  🤖 今天北京晴，25°C          │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  > 输入消息...                │  │
│  └──────────────────────────────┘  │
│  状态栏：模型 | Token | 连接状态    │
└────────────────────────────────────┘
```

## 核心组件

### 网关聊天

`src/tui/gateway-chat.ts` — 与 Gateway 的 WebSocket 通信：

```
TUI 启动
  → gateway-chat 建立 WebSocket 连接
  → 双向消息流：
    → 发送：用户输入 → Gateway
    ← 接收：Agent 回复 → TUI 显示
  → 实时流式输出（逐 token 显示）
```

### 嵌入式后端

`src/tui/embedded-backend.ts` — 内嵌 Gateway 模式：

```
TUI 可以直接内嵌 Gateway 运行
  → 不需要单独启动 Gateway
  → 单进程运行
  → 适合个人使用
```

### 命令处理

`src/tui/commands.ts` — TUI 内的斜杠命令：

```
/model gpt-4o       → 切换模型
/status              → 显示状态
/clear               → 清空对话
/exit                → 退出 TUI
/thinking on         → 开启思考模式
```

### UI 组件

`src/tui/components/` — 界面组件库：

```
components/
  → 消息气泡
  → 工具调用展示
  → 状态栏
  → 输入框
  → 进度指示
```

## 关键特性

### 实时流式输出

```
Agent 生成回复
  → 逐 token 推送到 TUI
  → TUI 实时渲染
  → 用户看到"打字"效果
```

### 工具调用可视化

```
Agent 调用工具
  → TUI 展示工具名称和参数
  → 执行中显示加载状态
  → 完成后展示结果摘要
```

### Markdown 渲染

```
Agent 回复包含 Markdown
  → TUI 渲染为终端彩色文本
  → 代码块高亮
  → 链接可点击
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/tui/gateway-chat.ts` | Gateway 通信 |
| `src/tui/embedded-backend.ts` | 内嵌后端 |
| `src/tui/commands.ts` | 斜杠命令 |
| `src/tui/components/` | UI 组件 |
| `src/tui/local-run-shutdown.ts` | 优雅关闭 |

## 总结

1. **终端聊天** — 在终端中获得类似聊天应用的体验
2. **实时流式** — Agent 回复逐 token 显示
3. **工具可视化** — 直观展示工具调用过程
4. **内嵌模式** — 单进程运行，无需单独启动 Gateway
