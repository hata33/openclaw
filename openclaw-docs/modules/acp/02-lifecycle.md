# acp — 数据流

```
IDE 发起 ACP 请求
  ↓
1. 接收请求
   server.ts

2. 会话映射
   session-mapper.ts → 查找/创建 OpenClaw 会话

3. 审批检查
   approval-classifier.ts → 策略判断

4. 执行
   → Agent 处理请求

5. 返回响应
   → ACP 响应 → IDE
```
