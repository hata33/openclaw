# image-generation — 图像生成

> AI 图像生成工具，支持 DALL-E、Midjourney 等 Provider。
> 从文本描述生成图片。

## 文件结构

| 文件 | 职责 |
|------|------|
| `types.ts` | 类型定义 |
| `defaults.ts` | 默认值 |
| `resolve.ts` | Provider 解析 |
| `scope.ts` | 作用域 |
| `provider-runtime.ts` | Provider 运行时 |
| `image-generation-tool.ts` | 图像生成工具 |
| `image-generation-tool.types.ts` | 工具类型 |
| `provider-types.ts` | Provider 类型 |

## 核心流程

```
1. 用户描述图像（文本提示词）
2. 解析 Provider
3. 调用图像生成 API
4. 下载生成的图片
5. 发送到渠道
```
