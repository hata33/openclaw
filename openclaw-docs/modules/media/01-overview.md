# media — 功能定义与设计思想

## 这个模块解决什么问题？

Agent 需要处理多种媒体内容：用户发送的图片、语音消息、视频，以及生成的图片、音频。media 模块提供统一的媒体处理基础设施。

核心问题：

1. **存储** — 媒体文件存在哪？如何去重？
2. **类型检测** — 这个文件是什么类型？
3. **转码** — 不同格式如何转换？
4. **安全** — 远程媒体抓取如何防护？

## 设计思想

### 1. SHA-256 去重存储

媒体文件按内容哈希存储：

```
原始文件: photo.jpg
存储路径: media/ab/cd/abcd1234...ef56.jpg
```

相同内容的文件只存储一份，节省磁盘空间。

### 2. MIME 双重检测

```typescript
// 1. 扩展名映射
extensionForMime("image/png") → ".png"

// 2. 魔数检测（file magic bytes）
detectMime(buffer) → "image/png"
```

扩展名可被伪造，魔数检测更可靠。

### 3. FFmpeg 封装

所有音视频操作通过 `ffmpeg-exec.ts` 统一封装：

```typescript
runFfmpeg(args, options) → { stdout, stderr }
runFfprobe(args, options) → { stdout, stderr }
```

自动检测系统 ffmpeg 路径，设置超时和缓冲区限制。

### 4. SSRF 防护

远程媒体抓取使用 SSRF 防护：

```typescript
fetchWithSsrFGuard(url, options)
```

防止 Agent 通过媒体抓取访问内网服务。

### 5. 限流读取

```typescript
readResponseWithLimit(response, maxBytes)
readByteStreamWithLimit(stream, maxBytes)
```

防止恶意大文件耗尽内存。超过限制时抛出错误。

### 6. 音频转码

语音消息通常需要转码为 Opus 格式：

```
输入: 任意音频格式（mp3, m4a, ogg, wav...）
  ↓ ffmpeg
输出: Opus 编码（48kHz, 64kbps, 单声道）
```

### 7. PDF 内容提取

```typescript
extractPdfContent({
  buffer,
  maxPages,
  maxPixels,
  minTextChars,
})
```

提取 PDF 中的文本和图片，供 Agent 理解。

### 8. 图片操作

通过 `rastermill` 库实现：

```
裁剪: crop(image, { x, y, width, height })
缩放: resize(image, { width, height })
元数据: readImageMetadata(buffer) → { width, height, format }
```

### 9. 媒体引用

`media-reference.ts` 解析各种媒体引用格式：

```
ID 引用: "media://abc123"
文件路径: "/path/to/file.jpg"
URL: "https://example.com/image.png"
```

统一转换为本地文件路径。

### 10. QR 码生成

```typescript
generateQrImage(data, options) → Buffer (PNG)
renderQrTerminal(data) → string (终端显示)
```

用于设备配对等场景的 QR 码生成。
