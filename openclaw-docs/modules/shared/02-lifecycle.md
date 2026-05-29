# shared — 使用场景

## 类型强转

配置解析时大量使用：

```
配置值 → normalizeOptionalString() → string | undefined
```

## 文本处理

消息处理流水线：

```
原始消息 → stripMarkdown() → 纯文本
         → extractCodeRegions() → 代码块
         → handleReasoningTags() → 推理内容
```

## 设备认证

节点连接时的认证流程使用 `device-auth.ts`。

## 节点解析

`node-resolve.ts` 将节点名称/IP/ID 解析为具体节点。
