# interactive — 交互式消息

> 定义跨渠道的交互式消息格式：按钮、选择菜单、富文本展示。
> 提供统一的交互组件抽象，适配不同渠道的能力差异。

## 文件结构

| 文件 | 职责 |
|------|------|
| `payload.ts`（543 行） | 交互式消息类型定义（按钮、选项、展示格式） |

## 核心概念

### MessagePresentationButton — 按钮

```typescript
type MessagePresentationButton = {
  label: string;           // 按钮文本
  value?: string;          // 回调值
  url?: string;            // 外部链接
  webApp?: { url: string }; // Telegram Web App
  style?: "primary" | "secondary" | "success" | "danger";
  disabled?: boolean;
  reusable?: boolean;
};
```

### MessagePresentationOption — 选择选项

```typescript
type MessagePresentationOption = {
  label: string;   // 显示文本
  value: string;   // 回调值
};
```

### MessagePresentationTone — 展示语调

```typescript
type MessagePresentationTone = "info" | "success" | "warning" | "danger" | "neutral";
```

## 设计目标

不同渠道对交互组件的支持差异很大：

- Telegram：支持 InlineKeyboard（按钮 + 回调）
- Discord：支持 Buttons + Select Menus
- WhatsApp：支持 List Messages + Reply Buttons
- Slack：支持 Block Kit（按钮、选择器）

interactive 模块提供统一抽象，渠道适配器负责转换为平台原生格式。
