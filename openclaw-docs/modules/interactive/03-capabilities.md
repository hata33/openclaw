# interactive — 能力清单与对外接口

## 类型定义（payload.ts）

### MessagePresentationButton

```typescript
type MessagePresentationButton = {
  label: string;
  value?: string;
  url?: string;
  webApp?: { url: string };
  priority?: number;
  disabled?: boolean;
  reusable?: boolean;
  style?: "primary" | "secondary" | "success" | "danger";
};
```

### MessagePresentationOption

```typescript
type MessagePresentationOption = {
  label: string;
  value: string;
};
```

### MessagePresentationTone

```typescript
type MessagePresentationTone = "info" | "success" | "warning" | "danger" | "neutral";
```

### InteractiveButtonStyle

```typescript
type InteractiveButtonStyle = "primary" | "secondary" | "success" | "danger";
```

### 废弃别名

```typescript
type InteractiveReplyButton = MessagePresentationButton;  // @deprecated
type InteractiveReplyOption = MessagePresentationOption;   // @deprecated
```
