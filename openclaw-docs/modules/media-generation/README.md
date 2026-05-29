# media-generation — 媒体生成共享

> 图像/视频/音乐生成的共享逻辑：模型目录、模型引用解析、参数规范化。
> 为三种媒体生成类型提供统一基础。

## 文件结构

| 文件 | 职责 |
|------|------|
| `catalog.ts` | 媒体生成模型目录 |
| `model-ref.ts` | 模型引用解析（provider/model 格式） |
| `normalization.types.ts` | 参数规范化类型 |
| `runtime-shared.ts` | 运行时共享逻辑（认证、回退） |

## 模型引用

`model-ref.ts` 解析 `provider/model` 格式：

```
"openai/dall-e-3" → { provider: "openai", model: "dall-e-3" }
```

## 参数规范化

`normalization.types.ts` 定义参数规范化元数据：

- size（尺寸）
- aspectRatio（宽高比）
- resolution（分辨率）
- durationSeconds（时长）
