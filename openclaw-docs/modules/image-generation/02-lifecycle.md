# image-generation — 数据流

```
用户: "生成一只可爱的猫咪"
  ↓
1. 工具调用
   image-generation-tool.ts

2. 解析 Provider
   resolve.ts

3. 调用 API
   provider-runtime.ts → POST /images/generations

4. 下载图片
   → Provider 返回 URL → 下载

5. 发送到渠道
   → 图片消息
```
