# media-understanding — 数据流

```
用户发送图片/音频/视频
  ↓
1. 检测类型
   MIME type → 图片/音频/视频/文档

2. 解析 Provider
   resolve.ts → 查找可用 Provider

3. 处理
   图片: 发送到多模态 LLM
   音频: 调用 Whisper API
   视频: 提取帧 + 图片理解
   文档: 提取文本

4. 返回结果
   → 注入上下文
   → Agent 看到媒体描述
```
