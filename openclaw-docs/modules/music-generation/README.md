# music-generation — 音乐生成

> AI 音乐生成工具，支持通过 API 调用音乐生成 Provider（如 Suno、Udio）。
> 从文本描述生成音乐。

## 文件结构

| 文件 | 职责 |
|------|------|
| `types.ts` | 类型定义 |
| `defaults.ts` | 默认值 |
| `resolve.ts` | Provider 解析 |
| `scope.ts` | 作用域 |
| `provider-runtime.ts` | Provider 运行时 |
| `music-generation-tool.ts` | 音乐生成工具 |
| `music-generation-tool.types.ts` | 工具类型 |
| `provider-types.ts` | Provider 类型 |

## 核心流程

```
1. 用户描述音乐（文本）
2. 解析 Provider（配置 + 插件）
3. 调用 Provider API
4. 返回音频 URL
5. 发送音频到渠道
```
