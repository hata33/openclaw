# media-understanding — 媒体理解

> 多媒体内容的理解和处理：图片、音频、视频、文档。
> 调用多模态 AI 模型或 CLI 工具处理媒体内容。

## 文件结构（39 个文件，6826 行）

### 核心

| 文件 | 职责 |
|------|------|
| `types.ts` | 类型定义 |
| `defaults.ts` | 默认值 |
| `resolve.ts` | Provider 解析 |
| `scope.ts` | 作用域和范围 |

### 图片理解

| 文件 | 职责 |
|------|------|
| `image-understanding.ts` | 图片理解主逻辑 |
| `image-description-tool.ts` | 图片描述工具 |
| `image-ocr-tool.ts` | OCR 工具 |

### 音频理解

| 文件 | 职责 |
|------|------|
| `audio-understanding.ts` | 音频理解 |
| `audio-transcription-tool.ts` | 音频转录工具 |

### 视频理解

| 文件 | 职责 |
|------|------|
| `video-understanding.ts` | 视频理解 |

### 文档理解

| 文件 | 职责 |
|------|------|
| `document-understanding.ts` | 文档理解 |

### Provider

| 文件 | 职责 |
|------|------|
| `provider-runtime.ts` | Provider 运行时 |
| `provider-cli.ts` | CLI Provider（调用外部工具） |

## 核心流程

```
1. 检测媒体类型
   → 图片/音频/视频/文档

2. 选择处理方式
   → 多模态模型（GPT-4V、Claude 3）
   → CLI 工具（ffmpeg、whisper、tesseract）
   → Provider API

3. 处理
   → 发送到 Provider
   → 获取结果

4. 返回
   → 文本描述/转录/分析结果
```
