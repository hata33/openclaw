# 17 — AIGC 生成管线（图片/视频/音乐）

> OpenClaw 内置三种 AI 生成能力——图片、视频、音乐——均采用统一的
> Provider 注册 + 模型路由 + 能力协商架构，通过插件扩展支持数十种生成服务。

## 统一生成架构

三种生成能力共享相同的设计模式：

```
┌─────────────────────────────────────────────┐
│              Agent 调用                      │
│  generate_image / generate_video / 音乐生成   │
└───────────────────┬─────────────────────────┘
                    │
          ┌─────────┴─────────┐
          │  Provider Registry │  ← 注册所有可用生成 Provider
          └─────────┬─────────┘
                    │
          ┌─────────┴─────────┐
          │  Model Resolution  │  ← 解析模型 → 确定 Provider
          └─────────┬─────────┘
                    │
          ┌─────────┴─────────┐
          │  Capability Check  │  ← 检查能力（模式、分辨率等）
          └─────────┬─────────┘
                    │
          ┌─────────┴─────────┐
          │  Provider Execute  │  ← 调用 Provider API
          └─────────┬─────────┘
                    │
          ┌─────────┴─────────┐
          │  Normalization     │  ← 标准化结果（URL、元数据）
          └───────────────────┘
```

## 图片生成

`src/image-generation/` — 支持多种图片生成 Provider。

### 支持的模式

```
text-to-image:    "画一只猫"         → 生成图片
image-to-image:   [上传图片] + "改成水彩风" → 风格转换
inpainting:       [上传图片] + mask  → 局部编辑
```

### Provider 注册

```typescript
// src/image-generation/provider-registry.ts

// 通过插件系统注册
resolvePluginImageGenerationProviders(cfg)
  → 收集所有 imageGenerationProviders 插件
  → buildProviderMaps() 建立 ID → Provider 映射
  → 支持别名（如 "dall-e" → "openai"）
```

### 已支持的图片 Provider

| Provider | 扩展包 | 特点 |
|----------|--------|------|
| OpenAI (DALL-E) | `extensions/openai/` | DALL-E 3 |
| ComfyUI | `extensions/comfy/` | 自定义工作流 |
| Fal.ai | `extensions/fal/` | 快速推理 |
| Replicate | `extensions/...` | 开源模型 |
| 通义万相 | `extensions/alibaba/` | 阿里云 |
| 火山引擎 | `extensions/byteplus/` | 字节跳动 |

### 图片资产管理

`src/image-generation/image-assets.ts` 管理生成图片的存储和引用：

```
图片生成完成
  → 保存到本地媒体存储
  → 生成 mediaId 引用
  → 返回给 Agent（URL + mediaId）
  → 可通过 MEDIA: 指令附加到消息
```

## 视频生成

`src/video-generation/` — 支持视频生成和转换。

### 支持的模式

```
generate:      "生成一段日落视频"     → 纯文本生成
imageToVideo:  [上传图片] → "让画面动起来" → 图片转视频
videoToVideo:  [上传视频] → "改成动画风格"  → 视频转视频
```

### 能力协商

```typescript
// src/video-generation/capabilities.ts

resolveVideoGenerationMode({
  inputImageCount,   // 输入图片数
  inputVideoCount,   // 输入视频数
})
  → 根据输入推断生成模式
  → 检查 Provider 是否支持该模式
  → 不支持则返回错误

listSupportedVideoGenerationModes(provider)
  → 列出 Provider 支持的所有模式
```

### 能力覆盖层

`src/video-generation/capability-overlays.ts` — 某些模型的能力可以通过配置覆盖：

```yaml
videoGeneration:
  overlays:
    - model: "some-model"
      capabilities:
        imageToVideo:
          enabled: true
          maxDuration: 10
```

### 已支持的视频 Provider

| Provider | 扩展包 | 特点 |
|----------|--------|------|
| Runway | `extensions/runway/` | 专业视频生成 |
| Pixverse | `extensions/pixverse/` | 快速生成 |
| 通义万相 | `extensions/alibaba/` | 阿里云 |
| 可灵 | `extensions/byteplus/` | 字节跳动 |

### 持续时间支持

`src/video-generation/duration-support.ts` — 不同 Provider/模型支持的视频时长不同：

```
请求 "生成 10 秒视频"
  → 检查 Provider 的最大时长
  → 超出限制 → 自动调整或报错
```

## 音乐生成

`src/music-generation/` — 支持音乐/音效生成。

### 运行时流程

```typescript
// src/music-generation/runtime.ts

generateMusic(params)
  → 解析模型引用 (parseMusicGenerationModelRef)
  → 获取 Provider (getMusicGenerationProvider)
  → 检查能力
  → 调用 Provider API
  → 标准化结果
  → 记录失败（recordCapabilityCandidateFailure）
  → 返回音频 URL + 元数据
```

### 模型回退

与文本模型类似，音乐生成也支持 fallback：

```
主模型调用失败
  → resolveCapabilityModelCandidates() 获取候选列表
  → 按顺序尝试 fallback 模型
  → 全部失败 → throwCapabilityGenerationFailure()
```

### 已支持的音乐 Provider

| Provider | 扩展包 | 特点 |
|----------|--------|------|
| Udio | `extensions/...` | 高质量音乐 |
| Suno | `extensions/...` | 流行音乐生成 |

## 统一的 Provider 插件接口

三种生成能力都通过 `capabilityProviderRuntime` 统一管理：

```typescript
// src/plugins/capability-provider-runtime.ts

resolvePluginCapabilityProviders({
  key: "imageGenerationProviders",  // 或 videoGenerationProviders / musicGenerationProviders
  cfg,
})
  → 从插件注册表获取对应能力的所有 Provider
```

## 标准化与模型引用

每个生成模块都有独立的模型引用解析和结果标准化：

```
parseModelRef()           → 解析 "provider/model" 格式
normalizeResult()         → 统一结果格式
buildNormalizationMetadata() → 构建元数据
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/image-generation/provider-registry.ts` | 图片 Provider 注册 |
| `src/image-generation/image-assets.ts` | 图片资产管理 |
| `src/video-generation/capabilities.ts` | 视频能力协商 |
| `src/video-generation/capability-overlays.ts` | 能力覆盖层 |
| `src/video-generation/duration-support.ts` | 时长支持 |
| `src/music-generation/runtime.ts` | 音乐生成运行时 |
| `src/music-generation/provider-registry.ts` | 音乐 Provider 注册 |
| `src/media-generation/` | 共享的生成管线基础设施 |

## 总结

1. **统一架构** — 图片/视频/音乐共享 Provider 注册、模型路由、能力协商
2. **插件化** — 所有生成 Provider 通过插件注册，核心不绑定具体服务
3. **能力协商** — 自动检测输入类型，匹配 Provider 支持的模式
4. **模型回退** — 生成失败时自动尝试替代模型
5. **资产管理** — 生成结果统一存储、引用、投递
