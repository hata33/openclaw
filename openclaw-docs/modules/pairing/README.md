# pairing — 配对系统

> 负责外部用户/设备与 OpenClaw 的配对认证流程。
> 生成配对码、管理配对请求、维护 allowFrom 白名单。

## 文件结构

| 文件 | 职责 |
|------|------|
| `pairing-store.ts` | 配对存储（配对请求、凭证管理、文件锁） |
| `pairing-store.types.ts` | 类型定义 |
| `pairing-challenge.ts` | 配对挑战发放（生成配对码并回复） |
| `pairing-messages.ts` | 配对消息生成（提示用户如何批准） |
| `pairing-labels.ts` | 配对标签（渠道 ID 标签） |
| `allow-from-store-file.ts` | AllowFrom 白名单文件管理 |
| `setup-code.ts` | 设置码生成（首次配置时的 Bootstrap Token） |

## 核心概念

- **Pairing Code** — 配对码（随机生成的认证码）
- **AllowFrom** — 允许列表（哪些用户可以与 Bot 交互）
- **Pairing Challenge** — 配对挑战（未授权用户收到配对码提示）
- **Setup Code** — 设置码（首次配置 Gateway 时使用）

## 配对流程

```
1. 陌生用户发消息给 Bot
   → 不在 allowFrom 白名单中

2. Bot 发出配对挑战
   → 生成随机配对码
   → 回复: "请让 Bot 所有者执行: openclaw pairing approve telegram <code>"

3. Bot 所有者批准
   → openclaw pairing approve telegram <code>
   → 用户 ID 添加到 allowFrom 白名单

4. 用户重新发送消息
   → 在白名单中 → 正常处理
```
