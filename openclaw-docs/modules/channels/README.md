# channels — 渠道系统

> 214 文件，33304 行。消息渠道的统一抽象层。
> 支持 Telegram、Discord、WhatsApp、Signal、Slack、iMessage、微信等。

## 子模块

| 子目录 | 说明 |
|--------|------|
| `plugins/` | 各渠道插件（Telegram/Discord/WhatsApp/Signal/Slack/iMessage/WeChat 等） |
| `transport/` | 消息传输层 |
| `message/` | 消息格式化 |
| `message-access/` | 消息访问控制 |
| `inbound-event/` | 入站事件处理 |
| `allowlists/` | 渠道白名单 |
| `status/` | 渠道状态 |
| `turn/` | 对话轮次管理 |

## 核心概念

### 渠道适配器

每个渠道有一个适配器，统一消息格式：

```
Telegram 消息 → 渠道适配器 → 统一消息格式 → Agent
```

### 消息类型

- 文本消息
- 图片/视频/音频
- 文件
- 按钮/交互组件
- 反应（Emoji）
