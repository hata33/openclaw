# web-fetch — 实现流程与数据流

## Web Fetch 工具调用流程

```
Agent 调用 web_fetch({ url: "https://example.com" })
  ↓
1. 解析可用的 Provider
   resolveWebFetchDefinition({ config, sandboxed, runtimeWebFetch, providerId })
   │
   ├→ 解析配置中的 Provider
   │    resolveWebProviderConfig(config)
   │    resolveWebProviderDefinition(providerId)
   │
   ├→ 解析插件 Provider
   │    resolvePluginWebFetchProviders(config)
   │
   └→ 解析运行时 Provider
        resolveRuntimeWebFetchProviders(config)
        getActiveRuntimeWebToolsMetadata()

2. 排序 Provider
   sortWebFetchProvidersForAutoDetect(providers)

3. 抓取网页
   → Provider 发起 HTTP 请求
   → 返回 HTML

4. 提取内容
   extractReadableContent({ html, url, extractMode, config })
   │
   ├→ 加载提取器列表（缓存）
   │    webContentExtractorLoader.load(config)
   │
   └→ 依次尝试提取器
        for (const extractor of extractors) {
          result = await extractor.extract({ html, url, extractMode });
          if (result?.text) return { ...result, extractor: extractor.id };
        }

5. 返回可读内容
   → { text, title, extractor } 或 null
```

## 启用判断流程

```
resolveWebFetchEnabled({ fetch, sandboxed })
  ↓
1. 检查配置
   → fetch.disabled === true → false
   → sandboxed → 检查沙箱配置

2. 检查 Provider 可用性
   → hasWebProviderEntryCredential(provider) → 有凭证
   → providerRequiresCredential(provider) → 是否需要凭证

3. 结果
   → 有可用 Provider → true
   → 无可用 Provider → false
```

## 工具定义生成

```
resolveWebFetchToolDefinition({ config, sandboxed })
  ↓
1. 解析 Provider 列表
2. 生成工具描述（包含可用 Provider 信息）
3. 返回 WebFetchProviderToolDefinition
```

## 数据流总结

```
配置 + 插件 → Provider 列表
                    ↓
              排序 + 过滤
                    ↓
              抓取 URL → HTML
                    ↓
              内容提取器 → Markdown/Text
                    ↓
              返回给 Agent
```
