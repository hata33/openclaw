# tui — 功能定义

## 解决什么问题？

提供终端内的交互式聊天体验，让用户在命令行中与 Agent 对话。

## 两种后端

| 后端 | 说明 |
|------|------|
| `tui-backend.ts` | 通过 Gateway WebSocket 通信 |
| `embedded-backend.ts` | 本地直接运行，无需 Gateway |

## 流式显示

`tui-stream-assembler.ts` 组装流式消息：

```
Token 片段 → 组装完整消息 → Markdown 渲染 → 终端显示
```

## 命令处理

`tui-command-handlers.ts` 处理 `/` 开头的命令：

```
用户输入 → 解析命令 → 执行 → 显示结果
```

## 会话管理

支持多个会话切换，会话列表策略控制可见性。
