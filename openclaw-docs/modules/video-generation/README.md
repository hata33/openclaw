# video-generation — 视频生成

> AI 视频生成工具，支持多种视频生成 Provider。
> 从文本或图片生成视频。

## 文件结构

| 文件 | 职责 |
|------|------|
| `types.ts` | 类型定义 |
| `defaults.ts` | 默认值 |
| `resolve.ts` | Provider 解析 |
| `scope.ts` | 作用域 |
| `provider-runtime.ts` | Provider 运行时 |
| `video-generation-tool.ts` | 视频生成工具 |
| `video-generation-tool.types.ts` | 工具类型 |
| `provider-types.ts` | Provider 类型 |
| `download.ts` | 视频下载 |
| `ffmpeg.ts` | FFmpeg 工具 |

## 核心流程

```
1. 用户描述视频（文本/图片）
2. 解析 Provider
3. 调用视频生成 API
4. 等待生成完成（异步）
5. 下载视频
6. 可选：FFmpeg 后处理
7. 发送到渠道
```
