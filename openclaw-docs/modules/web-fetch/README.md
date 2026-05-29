# web-fetch — 网页抓取

> 负责网页内容的抓取、提取和格式化，将 HTML 转换为可读的 Markdown/纯文本。
> 是工具系统中 web_fetch 功能的实现基础。

## 文件结构

| 文件 | 职责 |
|------|------|
| `runtime.ts`（220 行） | Web Fetch 运行时：Provider 解析、启用判断、工具定义生成 |
| `content-extractors.runtime.ts`（45 行） | 内容提取器运行时：调用插件注册的内容提取器 |

## 核心概念

- **Web Fetch Provider** — 网页抓取提供商（如 Jina、自定义 Provider）
- **Content Extractor** — 内容提取器，将 HTML 转为可读文本
- **Extract Mode** — 提取模式（markdown / text）

## 功能

1. 解析可用的 Web Fetch Provider（内置 + 插件注册）
2. 判断 web_fetch 工具是否启用
3. 生成 web_fetch 工具定义
4. 调用内容提取器将 HTML 转为可读文本

## 与其他模块的关系

```
plugins (插件系统)
    ↓ 注册 Web Fetch Provider + Content Extractor
web-fetch ← 本模块
    ↓ 提供工具定义和内容提取
tools (工具系统)
    ↓ Agent 调用 web_fetch
web (Web Provider 运行时)
```
