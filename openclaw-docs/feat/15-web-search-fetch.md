# 15 — 网页搜索与抓取

> OpenClaw 内置 web-search 和 web-fetch 两个工具，通过可插拔的 Provider 架构
> 支持 Brave、Tavily、DuckDuckGo 等多种搜索引擎，以及多策略的网页内容提取。

## 双工具架构

```
┌─────────────────────────────────────────┐
│              Agent 调用                  │
│                                         │
│   "搜索 XXX" ──→ web_search 工具        │
│   "打开 URL" ──→ web_fetch 工具         │
│                                         │
└──────────────────┬──────────────────────┘
                   │
     ┌─────────────┴─────────────┐
     │    插件化 Provider 层      │
     │  (可插拔的搜索/抓取引擎)   │
     └─────────────┬─────────────┘
                   │
     ┌─────────────┴─────────────┐
     │  Brave / Tavily / DDG /   │
     │  Firecrawl / SearXNG / ...│
     └───────────────────────────┘
```

## web_search — 网页搜索

### 配置

```yaml
tools:
  web:
    search:
      provider: "brave"         # 默认搜索引擎
      # 或自动检测（不指定 provider）
```

### Provider 自动检测

当用户未指定搜索引擎时，OpenClaw 自动检测可用的 Provider：

```
resolveRuntimeWebSearchProviders()
  → 收集所有注册的搜索 Provider 插件
  → sortWebSearchProvidersForAutoDetect() 排序
  → 检查每个 Provider 是否有有效凭证
  → 选择第一个有凭证的 Provider
```

### 搜索 Provider 接口

每个搜索 Provider 插件实现统一接口：

```typescript
type WebSearchProviderToolDefinition = {
  name: string;              // 工具名称
  description: string;       // 工具描述
  execute(params): Promise<WebSearchResult>;
};

type RunWebSearchParams = {
  query: string;             // 搜索关键词
  count?: number;            // 结果数量
  freshness?: string;        // 时间过滤 (day/week/month)
  country?: string;          // 国家代码
  language?: string;         // 语言代码
};
```

### 搜索流程

```
Agent 调用 web_search({ query: "..." })
  → resolveSearchConfig() 解析配置
  → 确定使用的 Provider
  → resolveWebSearchDefinition() 获取工具定义
  → Provider 执行搜索
  → 返回标准化结果 (title, url, snippet)
```

### 已支持的搜索 Provider

| Provider | 扩展包 | 特点 |
|----------|--------|------|
| Brave | `extensions/brave/` | 默认推荐，高质量结果 |
| Tavily | `extensions/tavily/` | AI 优化搜索，带摘要 |
| DuckDuckGo | `extensions/duckduckgo/` | 无需 API Key |
| SearXNG | `extensions/searxng/` | 自托管，隐私优先 |
| Exa | `extensions/exa/` | 语义搜索 |
| Perplexity | `extensions/perplexity/` | AI 问答式搜索 |

## web_fetch — 网页抓取

### 配置

```yaml
tools:
  web:
    fetch:
      enabled: true           # 默认启用
      provider: "default"     # 使用默认提取器
```

### 多策略内容提取

`src/web-fetch/content-extractors.runtime.ts` 管理内容提取策略：

```
URL 请求
  → 判断内容类型
    → HTML 页面 → Readability 提取正文
    → PDF → 文本提取
    → 图片 → 返回图片内容
    → 其他 → 原始文本
  → 返回 Markdown 或纯文本
```

### 抓取 Provider

| Provider | 特点 |
|----------|------|
| 内置 Readability | 默认，免费，无限制 |
| Firecrawl | `extensions/firecrawl/`，高质量结构化提取 |
| Web Readability | `extensions/web-readability/`，增强版 Readability |

### 内容提取流程

```
Agent 调用 web_fetch({ url: "https://..." })
  → 解析配置，确定 Provider
  → HTTP 请求获取内容
  → 内容类型检测
  → 选择合适的提取器
  → 提取正文内容
  → 转换为 Markdown 格式
  → 返回给 Agent
```

## 凭证管理

搜索和抓取的 API Key 管理通过统一的 Provider 凭证系统：

```
resolveWebProviderDefinition()
  → 检查配置中的凭证
  → 检查环境变量
  → providerRequiresCredential() 判断是否需要凭证
  → hasEntryCredential() 检查凭证是否有效
  → 无有效凭证 → 该 Provider 不可用
```

### 凭证来源优先级

1. **配置文件** — `tools.web.search.providers.brave.apiKey`
2. **环境变量** — Provider 定义的环境变量名（如 `BRAVE_API_KEY`）
3. **Secrets 存储** — OpenClaw 安全凭证存储
4. **运行时元数据** — `runtimeWebSearch` 运行时注入

## 运行时 Provider 解析

Provider 解析支持两种来源：

```
插件注册的 Provider
  → resolvePluginWebSearchProviders()
  → 来自扩展包的静态定义

运行时 Provider
  → resolveRuntimeWebSearchProviders()
  → 来自配置和运行时注入
  → 优先级高于插件注册
```

## 沙箱模式

web_fetch 在沙箱模式下有限制：

```typescript
resolveWebFetchEnabled({ fetch, sandboxed: true })
  → 检查配置是否允许沙箱内使用
  → 默认启用，但可配置关闭
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/web-search/runtime.ts` | 搜索运行时核心 |
| `src/web-search/runtime-types.ts` | 搜索类型定义 |
| `src/web-fetch/runtime.ts` | 抓取运行时核心 |
| `src/web-fetch/content-extractors.runtime.ts` | 内容提取策略 |
| `src/web/provider-runtime-shared.ts` | Provider 共享逻辑 |

## 总结

1. **双工具分工** — web_search 负责搜索，web_fetch 负责抓取，各司其职
2. **插件化 Provider** — 搜索引擎和抓取引擎都可插拔替换
3. **自动检测** — 无需手动配置，自动选择有凭证的 Provider
4. **统一凭证** — API Key 管理通过统一系统，支持配置/环境变量/Secrets
5. **多格式提取** — HTML、PDF、图片等多种内容类型的智能提取
