# interactive — 实现流程与数据流

## 消息渲染流程

```
Agent 生成带交互组件的消息
  ↓
1. 构建 MessagePresentation
   → buttons, options, tone

2. 渠道适配器转换
   Telegram → InlineKeyboardMarkup
   Discord → ActionRow + Button
   Slack → Block Kit
   WhatsApp → Reply Buttons / List

3. 降级处理
   不支持的渠道 → 纯文本列表
```

## 按钮回调流程

```
用户点击按钮
  ↓
1. 渠道发送回调
   callback_data = button.value

2. 路由到 Agent
   → 作为消息输入

3. Agent 处理
   → 根据回调值执行操作
```
