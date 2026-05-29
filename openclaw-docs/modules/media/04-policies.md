# media — 策略、配置与边界情况

## 一、存储策略

### 1.1 SHA-256 去重

```typescript
// 内容哈希决定存储路径
const hash = crypto.createHash("sha256").update(buffer).digest("hex");
const dir = path.join(mediaDir, hash.slice(0, 2), hash.slice(2, 4));
const filePath = path.join(dir, `${hash}${extension}`);
```

相同内容的文件只存储一份。

### 1.2 原子写入

```typescript
writeSiblingTempFile(targetPath, buffer) → 临时文件 + rename
```

防止写入中断导致文件损坏。

### 1.3 文件名安全化

```typescript
sanitizeUntrustedFileName(name)
```

用户提供的文件名经过安全化处理，防止路径穿越。

## 二、大小限制策略

### 2.1 硬限制

```typescript
MAX_IMAGE_BYTES = 6 MB
MAX_AUDIO_BYTES = 16 MB
MAX_VIDEO_BYTES = 16 MB
MAX_DOCUMENT_BYTES = 100 MB
```

### 2.2 可配置限制

`configured-max-bytes.ts` 允许配置覆盖默认限制。

### 2.3 限流读取

```typescript
readResponseWithLimit(response, maxBytes)
```

超过限制时立即中止读取，抛出错误。

## 三、安全策略

### 3.1 SSRF 防护

```typescript
fetchWithSsrFGuard(url)
```

远程媒体抓取时：
- 解析目标 IP
- 拒绝内网地址（10.x, 172.16-31.x, 192.168.x, 127.x）
- 拒绝 link-local 地址

### 3.2 路径安全

```typescript
isPathInside(filePath, allowedDir)
```

媒体引用解析时检查路径是否在允许的目录内。

### 3.3 入站路径策略

`inbound-path-policy.ts` 控制哪些路径的文件可以作为入站媒体处理。

## 四、FFmpeg 策略

### 4.1 资源限制

```typescript
MEDIA_FFMPEG_TIMEOUT_MS  → 超时时间
MEDIA_FFMPEG_MAX_BUFFER_BYTES → 最大缓冲区
MEDIA_FFPROBE_TIMEOUT_MS → ffprobe 超时
```

### 4.2 路径检测

```typescript
resolveSystemBin("ffmpeg")
```

自动检测系统安装的 ffmpeg 路径。

### 4.3 音频转码参数

```
默认 Opus 参数:
  编码: libopus
  比特率: 64kbps
  采样率: 48kHz
  声道: 单声道
```

## 五、MIME 检测策略

### 5.1 双重检测

```
1. 魔数检测（可靠）
   → 读取文件头 1MB
   → 匹配已知魔数模式

2. 扩展名检测（回退）
   → 从文件名提取扩展名
   → 映射到 MIME 类型
```

### 5.2 Base64 MIME 嗅探

`sniff-mime-from-base64.ts` 从 Base64 数据中嗅探 MIME 类型。

## 六、已知边界情况

### 6.1 FFmpeg 未安装

ffmpeg 不可用时，音频转码和视频尺寸检测会失败。系统记录错误并跳过。

### 6.2 大文件处理

100MB 的文档需要足够内存。`readResponseWithLimit` 使用流式读取，避免一次性加载全部内容。

### 6.3 MIME 误判

某些文件魔数可能被误判。例如 SVG 文件（XML 文本）可能被识别为 `text/xml` 而非 `image/svg+xml`。

### 6.4 并发存储

多个并发存储同一内容时，原子写入确保最终一致性。

### 6.5 跨域重定向

远程抓取时处理跨域重定向：

```typescript
retainSafeHeadersForCrossOriginRedirect(headers)
```

只保留安全的 Header 到重定向请求。

### 6.6 PDF 加密

加密的 PDF 无法提取内容，extractPdfContent 会返回错误。
