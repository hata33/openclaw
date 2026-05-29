# video-generation — 数据流

```
用户: "生成一段日落的视频"
  ↓
1. 工具调用
   video-generation-tool.ts

2. 提交生成任务
   provider-runtime.ts → API 调用

3. 等待完成
   → 轮询状态（pending → processing → completed）

4. 下载
   download.ts → 下载视频文件

5. 后处理（可选）
   ffmpeg.ts → 转换/压缩

6. 发送
   → 视频消息
```
