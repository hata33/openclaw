# status — 功能定义

## 状态信息收集

从多个模块收集状态信息：

| 来源 | 信息 |
|------|------|
| Agent 配置 | 模型、Provider、温度 |
| 会话 | 上下文使用量、消息数 |
| 队列 | 等待中的任务数 |
| 子 Agent | 运行中的子 Agent |
| 模型运行时 | 活跃模型、回退状态 |

## 模型回退通知

```
⚠️ 模型回退
配置: gpt-4o
实际: gpt-4o-mini
原因: 配额超限
```

## 格式化

适配不同渠道的显示格式：
- Telegram: MarkdownV2
- Discord: Markdown
- CLI: ANSI 颜色
