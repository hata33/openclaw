# interactive — 功能定义与设计思想

## 这个模块解决什么问题？

不同消息渠道支持不同的交互组件。interactive 模块提供统一的消息展示格式。

## 按钮类型

| 类型 | 说明 | 渠道支持 |
|------|------|----------|
| 回调按钮 | 点击发送回调值 | Telegram/Discord/Slack |
| URL 按钮 | 点击打开链接 | 所有 |
| Web App 按钮 | Telegram 迷你应用 | Telegram |

## 选择菜单

`MessagePresentationOption` 定义下拉选择项。Discord 和 Slack 原生支持，其他渠道降级为按钮列表。

## 渐进降级

不支持交互组件的渠道将按钮转换为纯文本：

```
[Approve] [Deny]
→ "Reply with: Approve / Deny"
```

## 安全

- `value` 字段不包含敏感信息
- `url` 字段需要 HTTPS
- `disabled` 控制按钮状态
