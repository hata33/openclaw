# bindings — 数据流

## 绑定创建

```
新对话消息到达
  ↓
1. 检查是否已有绑定
   resolveConversationBindingRecord(conversationRef)
   → 已有 → 返回已有绑定，使用对应会话
   → 无 → 创建新绑定

2. 创建绑定
   createConversationBindingRecord({
     sessionKey, channel, accountId, conversationId
   })
   → 委托给 session-binding-service

3. 后续消息
   → 通过绑定找到会话
   → 消息路由到正确会话
```
