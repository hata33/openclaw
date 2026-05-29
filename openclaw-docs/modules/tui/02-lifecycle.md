# tui — 数据流

## 启动流程

```
openclaw tui
  ↓
1. 解析参数
   tui-launch.ts

2. 选择后端
   → Gateway URL 存在 → tui-backend.ts
   → 无 → embedded-backend.ts

3. 设置环境
   setup-launch-env.ts

4. 启动 UI
   → 渲染聊天界面
   → 等待用户输入
```

## 消息流程

```
用户输入消息
  ↓
1. 解析
   → 命令 → tui-command-handlers.ts
   → 消息 → tui-submit.ts

2. 发送
   → Gateway 模式: WebSocket
   → 本地模式: 直接调用

3. 接收回复
   tui-stream-assembler.ts
   → 流式 Token → 组装 → 显示
```
