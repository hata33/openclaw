# music-generation — 数据流

```
用户: "生成一首轻快的爵士乐"
  ↓
1. 工具调用
   music-generation-tool.ts

2. 解析 Provider
   resolve.ts → 查找可用 Provider

3. 调用 API
   provider-runtime.ts → HTTP 请求

4. 等待生成
   → 轮询或回调

5. 返回结果
   → 音频 URL → 发送到渠道
```
