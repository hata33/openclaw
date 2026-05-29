# bindings — 功能定义

## 解决什么问题？

一个渠道对话需要关联到一个 Agent 会话。bindings 模块是 session-binding-service 的门面（Facade），提供简化的 API。

## 设计

委托模式——所有操作委托给 `getSessionBindingService()`：

```typescript
createConversationBindingRecord(input) → service.bind(input)
resolveConversationBindingRecord(conv) → service.resolveByConversation(conv)
listSessionBindingRecords(key) → service.listBySession(key)
unbindConversationBindingRecord(input) → service.unbind(input)
touchConversationBindingRecord(id, at?) → service.touch(id, at)
```
