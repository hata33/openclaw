# 33 — 自动回复与命令解析

> OpenClaw 的自动回复模块（Auto-Reply）处理消息路由后的核心逻辑：
> 命令检测、权限验证、工具循环、回复生成和投递。

## 核心职责

```
消息路由到 Agent 后，auto-reply 模块接管：

1. 命令检测 — 是斜杠命令还是普通消息？
2. 权限验证 — 用户是否有权限执行此操作？
3. 工具循环 — Agent 调用工具 → 获取结果 → 继续推理
4. 回复生成 — 流式生成回复
5. 消息分块 — 长回复分成多条消息发送
6. 投递控制 — 发送到哪个渠道、什么格式
```

## 命令检测

`src/auto-reply/command-detection.ts` — 检测消息中的斜杠命令：

```
/status     → 命令：显示状态
/model gpt  → 命令：切换模型
你好        → 普通消息：发送给 Agent
```

### 命令参数解析

`src/auto-reply/commands-args.ts` — 解析命令参数：

```
/model gpt-4o --thinking on
  → command: "model"
  → args: { model: "gpt-4o", thinking: "on" }
```

## 权限控制

`src/auto-reply/command-auth.ts` — 命令执行权限：

```
命令请求
  → 检查用户身份（owner / admin / user）
  → 检查命令权限级别
  → 无权限 → 拒绝并提示
```

## 消息分块

`src/auto-reply/chunk.ts` — 长消息分块发送：

```
Agent 生成 5000 字回复
  → 渠道消息长度限制（如 Telegram 4096 字符）
  → chunk.split() 按限制分块
  → 逐块发送
  → 保持 Markdown 格式完整性
```

## 工具循环

auto-reply 中的工具循环是 Agent 执行的核心：

```
Agent 推理 → 需要调用工具
  → 执行工具调用
  → 工具返回结果
  → Agent 继续推理
  → 可能再次调用工具
  → 直到生成最终回复
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/auto-reply/command-detection.ts` | 命令检测 |
| `src/auto-reply/commands-args.ts` | 命令参数解析 |
| `src/auto-reply/command-auth.ts` | 权限控制 |
| `src/auto-reply/chunk.ts` | 消息分块 |

## 总结

1. **命令系统** — 斜杠命令和普通消息分流处理
2. **权限控制** — 不同用户级别对应不同操作权限
3. **消息分块** — 自动适配渠道消息长度限制
4. **工具循环** — Agent 可以多轮调用工具完成任务
