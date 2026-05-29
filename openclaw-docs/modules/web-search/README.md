# web-search — 网页搜索

> 负责网页搜索功能的 Provider 解析、工具定义生成和搜索执行。
> 是工具系统中 web_search 功能的实现基础，支持多种搜索后端。

## 文件结构

| 文件 | 职责 |
|------|------|
| `runtime.ts`（503 行） | Web Search 运行时：Provider 解析、启用判断、搜索执行、结果格式化 |
| `runtime-types.ts`（40 行） | 类型定义：参数、结果、配置类型 |

## 核心概念

- **Web Search Provider** — 搜索后端（如 Brave、Google、Perplexity）
- **Provider 自动检测** — 根据凭证自动选择可用的搜索 Provider
- **搜索结果格式化** — 统一不同 Provider 的结果格式

## 功能

1. 解析可用的 Web Search Provider（内置 + 插件注册）
2. 判断 web_search 工具是否启用
3. 生成 web_search 工具定义（包含参数 schema）
4. 执行搜索并返回统一格式的结果
5. 列出所有可用的搜索 Provider

## 与其他模块的关系

```
plugins (插件系统)
    ↓ 注册 Web Search Provider
secrets (密钥管理)
    ↓ 提供运行时 Web 工具凭证
web-search ← 本模块
    ↓ 提供工具定义和搜索执行
tools (工具系统)
    ↓ Agent 调用 web_search
web (Web Provider 共享逻辑)
```
