# media — 媒体处理

> 负责所有媒体文件的处理：图片、音频、视频、文档的存储、转码、提取和引用。
> 是 Agent 处理多媒体内容的基础设施层。

## 文件结构

| 文件 | 职责 |
|------|------|
| `constants.ts` | 常量定义（大小限制、MediaKind 分类） |
| `mime.ts` | MIME 类型检测与扩展名映射 |
| `store.ts` | 媒体文件存储（下载、保存、SHA-256 命名） |
| `store.runtime.ts` | 存储运行时（文件系统安全操作） |
| `media-reference.ts` | 媒体引用解析（ID/URL/路径 → 文件） |
| `fetch.ts` | 远程媒体抓取（SSRF 防护、大小限制） |
| `audio.ts` | 音频类型判断（语音消息兼容性） |
| `audio-transcode.ts` | 音频转码（ffmpeg → Opus） |
| `audio-tags.ts` | 音频标签（ID3 等元数据） |
| `image-ops.ts` | 图片操作（裁剪、缩放、元数据读取） |
| `video-dimensions.ts` | 视频尺寸检测 |
| `pdf-extract.ts` | PDF 内容提取（文本 + 图片） |
| `document-extractors.runtime.ts` | 文档提取器运行时 |
| `ffmpeg-exec.ts` | ffmpeg/ffprobe 执行封装 |
| `ffmpeg-limits.ts` | ffmpeg 资源限制 |
| `base64.ts` | Base64 编解码 |
| `parse.ts` | 媒体数据解析 |
| `qr-image.ts` | QR 码图片生成 |
| `qr-runtime.ts` | QR 码运行时 |
| `qr-terminal.ts` | 终端 QR 码显示 |
| `png-encode.ts` | PNG 编码 |
| `file-name.ts` | 文件名处理（安全化、扩展名提取） |
| `file-context.ts` | 文件上下文（媒体在对话中的角色） |
| `input-files.ts` | 输入文件处理 |
| `inbound-path-policy.ts` | 入站路径策略 |
| `local-media-access.ts` | 本地媒体访问 |
| `local-roots.ts` | 本地存储根目录 |
| `channel-inbound-roots.ts` | 渠道入站根目录 |
| `configured-max-bytes.ts` | 可配置大小限制 |
| `load-options.ts` | 加载选项 |
| `media-services.ts` | 媒体服务集成 |
| `media-source-url.ts` | 媒体源 URL 解析 |
| `outbound-attachment.ts` | 出站附件处理 |
| `prompt-image-order.ts` | 提示词图片排序 |
| `read-byte-stream-with-limit.ts` | 限流字节流读取 |
| `read-response-with-limit.ts` | 限流 HTTP 响应读取 |
| `read-capability.ts` | 读取能力检测 |
| `sniff-mime-from-base64.ts` | Base64 MIME 嗅探 |
| `temp-files.ts` | 临时文件管理 |

## 核心概念

- **MediaKind** — 媒体类型分类（image/audio/video/document）
- **Media Store** — 媒体文件持久化存储（SHA-256 去重）
- **MIME 检测** — 自动检测文件类型（扩展名 + 魔数）
- **FFmpeg** — 音视频转码工具

## 大小限制

| 类型 | 最大大小 |
|------|----------|
| 图片 | 6 MB |
| 音频 | 16 MB |
| 视频 | 16 MB |
| 文档 | 100 MB |
