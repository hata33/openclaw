# commitments — 数据流

```
对话消息
  ↓
1. 提取承诺
   extraction.ts → LLM 分析
   → Commitment[]

2. 存储
   store-writer.ts → 持久化

3. 查询
   store.ts → 按会话/状态查询
```
