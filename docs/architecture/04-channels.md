# 渠道层 (Channel Layer)

> 抽象了 20+ 消息平台的统一接入，是 OpenClaw 最具特色的部分。

## 目录结构

```
src/channels/
├── registry.ts                  # 渠道注册表
├── registry-lookup.ts           # 渠道查找
├── registry-normalize.ts        # 注册表规范化
├── registry.helpers.test.ts     # 注册表辅助测试
│
├── channel-config.ts            # 渠道配置
├── config-presence.ts           # 配置存在性检查
│
├── session.ts                   # 渠道会话抽象
├── session-envelope.ts          # 会话信封
├── session-meta.ts              # 会话元数据
│
├── conversation-binding-context.ts  # 会话绑定上下文
├── conversation-resolution.ts       # 会话解析
├── conversation-label.ts            # 会话标签
│
├── ids.ts                       # 渠道 ID 定义
├── chat-type.ts                 # 聊天类型
├── chat-meta.ts                 # 聊天元数据
├── chat-meta-shared.ts          # 共享聊天元数据
│
├── targets.ts                   # 消息目标
├── sender-identity.ts           # 发送者身份
├── sender-label.ts              # 发送者标签
├── location.ts                  # 位置信息
│
├── streaming.ts                 # 流式消息
├── typing.ts                    # 输入状态
├── typing-lifecycle.ts          # 输入状态生命周期
├── typing-start-guard.ts        # 输入状态启动守卫
│
├── allow-from.ts                # 来源允许列表
├── allowlist-match.ts           # 白名单匹配
├── allowlists/                  # 白名单管理
│
├── direct-dm.ts                 # 直接私聊
├── direct-dm-access.ts          # 私聊访问控制
├── direct-dm-guard-policy.ts    # 私聊守卫策略
│
├── model-overrides.ts           # 模型覆盖
├── native-command-session-targets.ts  # 原生命令目标
├── command-gating.ts            # 命令门控
│
├── draft-stream-controls.ts     # 草稿流控制
├── draft-stream-loop.ts         # 草稿流循环
├── draft-preview-finalizer.ts   # 草稿预览终结器
│
├── reply-prefix.ts              # 回复前缀
├── run-state-machine.ts         # 运行状态机
├── route-projection.ts          # 路由投影
├── thread-binding-id.ts         # 线程绑定 ID
├── thread-bindings-messages.ts  # 线程绑定消息
├── thread-bindings-policy.ts    # 线程绑定策略
│
├── inbound-event/               # 入站事件处理
├── message/                     # 消息处理
├── message-access/              # 消息访问控制
├── transport/                   # 传输层抽象
├── turn/                        # 对话轮次管理
├── status/                      # 状态管理
├── plugins/                     # 渠道插件
└── allowlists/                  # 白名单
```

## 支持渠道

通过 `extensions/` 目录下的独立扩展实现：

| 分类 | 渠道 | 扩展目录 |
|------|------|----------|
| 国际主流 | WhatsApp | `extensions/whatsapp/` |
| | Telegram | `extensions/telegram/` |
| | Discord | `extensions/discord/` |
| | Slack | `extensions/slack/` |
| | Signal | `extensions/signal/` |
| | iMessage | `extensions/imessage/` |
| | IRC | `extensions/irc/` |
| | Matrix | `extensions/matrix/` |
| 企业级 | Microsoft Teams | `extensions/msteams/` |
| | Google Chat | `extensions/googlechat/` |
| | 飞书 | `extensions/feishu/` |
| | Mattermost | `extensions/mattermost/` |
| 国内 | 微信 | `extensions/wechat/` |
| | QQ | `extensions/qqbot/` |
| 其他 | LINE | `extensions/line/` |
| | Nostr | `extensions/nostr/` |
| | Twitch | `extensions/twitch/` |
| | Synology Chat | `extensions/synology-chat/` |
| | Nextcloud Talk | `extensions/nextcloud-talk/` |
| | Tlon | `extensions/tlon/` |
| | Zalo | `extensions/zalo/` |

## 设计要点

### 统一抽象
所有渠道通过 `registry.ts` 注册，遵循统一的 Channel 接口。渠道之间的差异（消息格式、API 限制、群组模型）被封装在各自的扩展中。

### 消息流转
```
外部消息 → transport/ (传输层) → inbound-event/ (入站事件)
    → session.ts (会话路由) → turn/ (轮次管理)
    → message/ (消息处理) → 输出到渠道
```

### 白名单机制
通过 `allowlists/` 控制哪些用户/群组可以与 Agent 交互，支持通配符和正则匹配。
