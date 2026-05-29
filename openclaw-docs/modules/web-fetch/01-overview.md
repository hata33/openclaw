# web-fetch — 功能定义与设计思想

## 这个模块解决什么问题？

Agent 需要抓取网页内容并理解其中的信息。直接处理原始 HTML 既低效又浪费 Token。

web-fetch 解决的核心问题：

1. **Provider 选择** — 自动选择可用的 Web Fetch Provider
2. **内容提取** — 将 HTML 转为可读的 Markdown/纯文本
3. **插件化** — 支持插件注册自定义 Provider 和提取器

## 设计思想

### 1. Provider 分层

Web Fetch Provider 有两个来源：

```
内置 Provider（web/provider-runtime-shared.ts）
  → Jina Reader 等内置服务
  → 通过环境变量或配置提供凭证

插件 Provider（plugins/web-fetch-providers.runtime.ts）
  → 插件注册的 Provider
  → 优先级可配置
```

### 2. 自动检测

`resolveWebFetchEnabled()` 自动判断 web_fetch 是否可用：

```
检查条件：
  → 是否有配置的 Provider
  → Provider 是否有凭证
  → 是否有可用的运行时 Provider
  → 任一满足 → 启用
```

### 3. 内容提取链

`extractReadableContent()` 按顺序尝试提取器：

```
插件注册的提取器列表
  ↓
for (const extractor of extractors) {
  result = await extractor.extract({ html, url, extractMode });
  if (result?.text) return result;  // 第一个成功的提取器
}
  ↓
都失败 → 返回 null
```

### 4. 提取模式

```typescript
type WebContentExtractMode = "markdown" | "text";
```

- `markdown` — 保留格式（标题、列表、链接）
- `text` — 纯文本（去除所有格式）

### 5. 配置作用域缓存

```typescript
const webContentExtractorLoader = createConfigScopedPromiseLoader(
  (config) => resolvePluginWebContentExtractors({ config })
);
```

提取器列表按配置对象缓存，避免重复加载。

## Provider 优先级排序

```typescript
sortWebFetchProvidersForAutoDetect(providers)
```

Provider 按以下条件排序：
- 有凭证的优先
- 内置 Provider 和插件 Provider 混合排序
- 相同条件下按注册顺序
