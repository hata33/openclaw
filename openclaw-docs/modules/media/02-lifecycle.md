# media — 实现流程与数据流

## 媒体存储流程

```
媒体文件到达（上传/下载/生成）
  ↓
1. 生成存储路径
   SHA-256(内容) → 哈希前缀目录 + 哈希文件名
   → media/ab/cdef1234...jpg

2. 检查是否已存在
   fs.access(path) → 存在 → 返回路径（去重）

3. 写入文件
   saveMediaBuffer(buffer, { mimeType })
   → 原子写入（临时文件 + rename）

4. 返回存储信息
   { path, mediaId, mimeType, size }
```

## 远程媒体抓取流程

```
fetch.ts → fetchMedia(url, options)
  ↓
1. SSRF 防护检查
   fetchWithSsrFGuard(url)
   → 解析目标 IP → 拒绝内网地址

2. 发起 HTTP 请求
   重试: retryAsync({ attempts: 3 })

3. 检查响应大小
   Content-Length > maxBytes → 拒绝

4. 读取响应体（限流）
   readResponseWithLimit(response, maxBytes)

5. 检测 MIME 类型
   Content-Type header → 初步判断
   detectMime(buffer) → 魔数确认

6. 保存到媒体存储
   saveMediaBuffer(buffer, { mimeType })

7. 返回结果
   { buffer, mimeType, size, savedPath }
```

## 音频转码流程

```
audio-transcode.ts
  ↓
1. 检测输入格式
   getFileExtension(inputPath) → ".mp3"

2. 构建 ffmpeg 命令
   ffmpeg -i input.mp3 -c:a libopus -b:a 64k -ar 48000 -ac 1 output.opus

3. 执行转码
   runFfmpeg(args, { timeoutMs: 30000 })

4. 返回转码后文件
   → Opus 格式音频
```

## PDF 提取流程

```
pdf-extract.ts → extractPdfContent(params)
  ↓
1. 调用文档提取器
   extractDocumentContent({
     buffer,
     extractMode: "full",
     maxPages,
     maxPixels,
   })

2. 提取内容
   → 文本内容
   → 嵌入图片列表

3. 后处理
   → 过滤短文本（minTextChars）
   → 图片元数据规范化

4. 返回结果
   { text, images, pageCount }
```

## 图片操作流程

```
image-ops.ts
  ↓
1. 读取图片元数据
   readImageMetadataFromHeader(buffer)
   → { width, height, format }

2. 执行操作
   裁剪: createRastermill().crop(image, region)
   缩放: createRastermill().resize(image, dimensions)

3. 返回处理后的图片
   → PNG Buffer
```

## 媒体引用解析流程

```
media-reference.ts → resolveMediaReference(ref)
  ↓
1. 判断引用类型
   │
   ├→ ID 引用 ("media://xxx")
   │    → 在媒体存储中查找
   │
   ├→ 文件路径 ("/path/to/file")
   │    → 安全检查（路径穿越防护）
   │    → 返回本地路径
   │
   └→ URL ("https://...")
        → fetchMedia(url)
        → 保存到本地
        → 返回本地路径

2. 返回解析结果
   { path, mimeType, exists }
```

## MIME 检测流程

```
mime.ts → detectMime(buffer)
  ↓
1. 魔数检测（前 1MB）
   PNG: 89 50 4E 47
   JPEG: FF D8 FF
   GIF: 47 49 46 38
   PDF: 25 50 44 46
   ...

2. 回退到扩展名
   如果魔数无法识别 → 从文件名推断

3. 返回 MIME 类型
   "image/png", "audio/ogg", "application/pdf" 等
```

## QR 码生成流程

```
qr-image.ts → generateQrImage(data)
  ↓
1. 编码数据为 QR 矩阵
2. 渲染为 PNG 图片
3. 返回图片 Buffer
```
