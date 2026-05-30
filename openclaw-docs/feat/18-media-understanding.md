# 18 — 媒体理解

> OpenClaw 的媒体理解模块自动处理消息中的图片、音频、视频和文档附件，
> 通过多 Provider 能力协商，将非文本内容转换为 Agent 可理解的结构化描述。

## 解决的问题

```
用户发送: [一张猫的图片] "这是什么品种？"

没有媒体理解:
  → Agent 只看到一个附件 ID
  → 无法回答关于图片的问题

有媒体理解:
  → 自动检测到图片附件
  → 调用视觉模型分析图片
  → 生成描述：一只橘色短毛猫
  → Agent 基于描述回答问题
```

## 架构

```
用户消息（含附件）
  │
  ▼
┌──────────────────────┐
│  attachments.ts      │  ← 附件检测与分类
│  图片/音频/视频/文档  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  runner.ts           │  ← 能力匹配与执行
│  并发调度多附件处理   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  format.ts           │  ← 结果格式化
│  转换为文本描述       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  apply.ts            │  ← 注入对话上下文
│  附加到消息上下文     │
└──────────────────────┘
```

## 附件分类

`src/media-understanding/attachments.ts` — 检测附件类型并决定处理策略：

```typescript
// 附件类型
type AttachmentKind =
  | "image"      // 图片 → 视觉模型分析
  | "audio"      // 音频 → 语音转录
  | "video"      // 视频 → 关键帧提取 + 分析
  | "document";  // 文档 → 文本提取

resolveAttachmentKind(mimeType)
  → 根据 MIME 类型分类
  → image/png, image/jpeg → "image"
  → audio/mp3, audio/wav → "audio"
  → video/mp4 → "video"
  → application/pdf → "document"
```

### 附件归一化

`src/media-understanding/attachments.normalize.ts` — 将不同来源的附件统一处理：

```
渠道附件 → 归一化为统一的 MediaAttachment 格式
  → 支持：URL 附件、base64 附件、本地文件路径
  → 统一 MIME 类型、大小限制
```

## 能力协商与 Provider 选择

`src/media-understanding/runner.ts` — 根据附件类型和能力选择 Provider：

```typescript
// Provider 能力声明
type MediaUnderstandingCapability = {
  kind: "image" | "audio" | "video" | "document";
  // 详细能力（如支持的最大分辨率、时长等）
};

type MediaUnderstandingProvider = {
  id: string;
  capabilities: MediaUnderstandingCapability[];
  execute(input): Promise<MediaUnderstandingOutput>;
};
```

### Provider 选择流程

```
附件 → 确定 kind (image/audio/video/document)
  → buildProviderRegistry() 构建可用 Provider 列表
  → 对每个附件：
    → 按能力匹配 Provider
    → 选择最合适的 Provider
    → runCapability() 执行
```

### 已支持的媒体理解 Provider

| Provider | 图片 | 音频 | 视频 | 文档 |
|----------|------|------|------|------|
| OpenAI (GPT-4o) | ✓ | ✓ | - | ✓ |
| Anthropic (Claude) | ✓ | - | - | ✓ |
| Google (Gemini) | ✓ | ✓ | ✓ | ✓ |
| Deepgram | - | ✓ | - | - |

## 并发处理

`src/media-understanding/concurrency.ts` — 一条消息可能包含多个附件：

```
3 张图片附件
  → resolveConcurrency() 确定并发数
  → runWithConcurrency() 并行处理
  → 每个附件独立调用 Provider
  → 结果合并
```

### 并发控制

```typescript
// 根据模型和配置确定并发数
resolveConcurrency(config)
  → 默认并发 3
  → 可通过配置调整
```

## 结果格式化

`src/media-understanding/format.ts` — 将 Provider 输出转换为文本：

```
Provider 返回分析结果
  → extractMediaUserText() 提取用户可见文本
  → formatAudioTranscripts() 格式化音频转录
  → formatMediaUnderstandingBody() 组合为完整描述
```

### 输出格式

```
图片附件 → "[图片描述: 一只橘色短毛猫坐在沙发上]"
音频附件 → "[音频转录: 今天天气不错，适合出门散步...]"
视频附件 → "[视频摘要: 日落海滩，有人在冲浪]"
文档附件 → "[文档内容: 摘要...]..."
```

## 上下文注入

`src/media-understanding/apply.ts` — 将理解结果注入对话：

```
所有附件处理完成
  → 将结果附加到消息上下文
  → Agent 收到完整的附件描述
  → 可以基于描述回答问题
```

### 安全处理

`src/media-understanding/apply.sanitize-mime.ts` — MIME 类型安全检查：

```
附件进入处理管线
  → normalizeMimeType() 规范化 MIME 类型
  → 检查是否为允许的类型
  → 可疑类型 → 拒绝处理
```

## Echo Transcript

`src/media-understanding/echo-transcript.ts` — 将媒体理解结果回显给用户：

```
音频附件处理完成
  → sendTranscriptEcho()
  → 将转录文本发送到对话
  → 用户可以看到转录结果
```

## 附件缓存

`src/media-understanding/attachments.cache.ts` — 避免重复处理相同附件：

```
附件处理请求
  → 检查缓存（基于附件哈希）
  → 缓存命中 → 直接返回结果
  → 缓存未命中 → 调用 Provider
  → 结果写入缓存
```

## 活动模型管理

`src/media-understanding/active-model.types.ts` — 跟踪当前活跃的媒体模型：

```typescript
type ActiveMediaModel = {
  provider: string;    // "openai" | "anthropic" | ...
  model?: string;      // "gpt-4o" | "claude-sonnet-4" | ...
};
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/media-understanding/apply.ts` | 上下文注入主入口 |
| `src/media-understanding/apply.runtime.ts` | 运行时应用逻辑 |
| `src/media-understanding/attachments.ts` | 附件分类 |
| `src/media-understanding/attachments.normalize.ts` | 附件归一化 |
| `src/media-understanding/attachments.cache.ts` | 附件缓存 |
| `src/media-understanding/runner.ts` | Provider 选择与执行 |
| `src/media-understanding/format.ts` | 结果格式化 |
| `src/media-understanding/concurrency.ts` | 并发控制 |
| `src/media-understanding/echo-transcript.ts` | 转录回显 |

## 总结

1. **自动理解** — 消息中的图片/音频/视频/文档自动分析，Agent 无需手动调用工具
2. **多 Provider** — 不同媒体类型可选择最合适的 Provider
3. **能力协商** — 根据附件类型和 Provider 能力自动匹配
4. **并发处理** — 多附件并行处理，提升效率
5. **结果缓存** — 相同附件不重复处理
