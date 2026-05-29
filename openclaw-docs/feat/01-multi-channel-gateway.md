# 01 — 多渠道网关架构

> OpenClaw 支持 25+ 消息渠道（WhatsApp、Telegram、Discord、Slack、WeChat 等），
> 通过统一的 ChannelPlugin 抽象层实现"一套 Agent 逻辑，多渠道投递"。

## 核心设计思想

OpenClaw 的渠道层解决一个核心问题：**如何让同一个 AI 助手同时存在于 25+ 个聊天平台？**

答案是**统一抽象 + 插件化**。每个渠道（WhatsApp、Telegram 等）都实现同一个 `ChannelPlugin` 接口，
Gateway 只与这个接口交互，不关心底层是哪个平台。

## 架构总览

```
用户消息 ──→ 渠道插件 ──→ Gateway ──→ Session ──→ Agent ──→ 模型
                │                        │
                │←── 渠道插件 ←── 投递 ←──┘
                │
                └──→ 对应平台的 API
```

## ChannelPlugin 接口

每个渠道插件必须实现的核心接口（定义在 `src/channels/plugins/types.plugin.ts`）：

```typescript
interface ChannelPlugin {
  id: string;                          // 渠道唯一标识
  label: string;                       // 显示名称
  connect(ctx: ChannelConnectContext): Promise<void>;  // 建立连接
  disconnect(): Promise<void>;         // 断开连接
  sendMessage(msg: OutboundMessage): Promise<void>;    // 发送消息
  // ... 更多生命周期钩子
}
```

### 关键设计

1. **双向通信**：每个渠道插件同时负责接收（inbound）和发送（outbound）
2. **事件驱动**：渠道通过事件（`onMessage`、`onReaction`、`onPresence`）通知 Gateway
3. **配置隔离**：每个渠道有独立的配置块（`channels.telegram.*`、`channels.discord.*`）

## 消息流入路径

以 Telegram 消息为例：

```
1. Telegram Bot API 推送 update
2. extensions/telegram/ 的 ChannelPlugin 接收 update
3. 转换为统一的 InboundMessage 格式
4. 传递给 Gateway 的消息路由
5. Gateway 根据 chatId 查找或创建 Session
6. Session 调用 Agent 处理消息
```

### 消息统一格式

```typescript
// 入站消息（从渠道到 Gateway）
interface InboundMessage {
  channel: string;        // 渠道 ID（如 "telegram"）
  chatId: string;         // 聊天 ID
  senderId: string;       // 发送者 ID
  text?: string;          // 文本内容
  media?: MediaAttachment[];  // 媒体附件
  replyTo?: string;       // 回复的消息 ID
  // ... 平台特有字段
}

// 出站消息（从 Gateway 到渠道）
interface OutboundMessage {
  channel: string;
  chatId: string;
  text?: string;
  media?: MediaAttachment[];
  // ...
}
```

## 消息投递路径

Agent 生成回复后，消息需要投递回渠道：

```
Agent 输出 → Gateway → ChannelEventRouter → 目标渠道插件 → 平台 API
```

### 投递策略

Gateway 的投递不是简单的"写回去"，而是经过路由决策：

1. **直接投递**：回复到消息来源渠道（最常见）
2. **跨渠道投递**：用户可以配置将回复发送到其他渠道
3. **多渠道广播**：一条消息同时发送到多个渠道

## 渠道特有功能适配

不同平台能力差异很大。OpenClaw 通过**能力协商**处理：

| 能力 | 说明 | 示例 |
|------|------|------|
| `reactions` | 支持 emoji 反应 | Discord、Slack、WhatsApp |
| `threads` | 支持线程/话题 | Discord、Slack |
| `voice` | 支持语音消息 | WhatsApp、Telegram |
| `inlineButtons` | 支持内联按钮 | Telegram、Discord |
| `richText` | 支持富文本/Markdown | Discord、Slack |
| `fileUpload` | 支持文件上传 | 所有主流渠道 |

渠道插件在注册时声明自己的能力，Gateway 据此决定如何格式化输出。

## DM 安全策略

由于 OpenClaw 连接真实的消息平台，处理来自陌生人的 DM 是一个安全问题：

```
陌生人 DM → DM Policy 检查
  ├─ pairing（默认）→ 生成配对码，等待用户批准
  ├─ open → 允许所有人（需要显式配置）
  └─ blocked → 完全阻止 DM
```

### 配对流程

```
1. 陌生人发送 DM
2. Gateway 检查 dmPolicy === "pairing"
3. 生成 6 位配对码，回复陌生人
4. 用户在终端运行 `openclaw pairing approve telegram ABC123`
5. 发送者被加入 allowlist，后续消息正常处理
```

## 多账户支持

每个渠道支持多个账户实例：

```yaml
channels:
  telegram:
    accounts:
      bot1:
        token: "xxx"
      bot2:
        token: "yyy"
```

账户可以绑定到不同的 Agent，实现**路由隔离**：
- bot1 的消息 → Agent A（工作场景）
- bot2 的消息 → Agent B（个人场景）

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/channels/plugins/types.plugin.ts` | ChannelPlugin 接口定义 |
| `src/channels/channel-config.ts` | 渠道配置解析 |
| `src/channels/allowlist-match.ts` | DM allowlist 匹配逻辑 |
| `src/channels/ack-reactions.ts` | ACK 反应处理 |
| `src/gateway/router/` | 消息路由 |
| `extensions/telegram/` | Telegram 渠道实现（可参考） |
| `extensions/discord/` | Discord 渠道实现（可参考） |
| `extensions/whatsapp/` | WhatsApp 渠道实现（可参考） |

## 总结

OpenClaw 的多渠道架构通过 `ChannelPlugin` 接口实现了完美的渠道解耦：

1. **每个渠道是独立插件** — 可以单独启用/禁用/配置
2. **统一消息格式** — Agent 层不感知具体渠道
3. **能力协商** — 每个渠道声明自己的能力，Gateway 自适配
4. **安全默认** — DM 配对机制防止未授权访问
5. **多账户路由** — 同一渠道的多个实例可以绑定不同 Agent
