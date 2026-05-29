# crestodian — 数据流

```
Agent 执行工具调用
  ↓
1. 探针检测
   probes.ts → 分析行为模式

2. 异常判断
   → 正常 → 放行
   → 异常 → 触发救援

3. 救援流程
   rescue-policy.ts → 决策
   rescue-message.ts → 通知用户
   → 用户干预/自动处理
```
