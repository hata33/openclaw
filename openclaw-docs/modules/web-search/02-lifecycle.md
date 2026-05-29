# web-search — 实现流程与数据流

## 搜索执行流程

```
Agent 调用 web_search({ query: "OpenClaw AI" })
  ↓
1. 解析搜索配置
   resolveWebSearchRuntimeConfig({ config, preferInputConfig })
   → 选择使用输入配置或运行时配置快照

2. 解析 Provider
   resolveWebSearchDefinition(params)
   │
   ├→ 解析配置中的 Provider
   │    resolveWebProviderConfig(cfg, "search")
   │    resolveWebProviderDefinition(providerId)
   │
   ├→ 解析插件 Provider
   │    resolvePluginWebSearchProviders(config)
   │
   └→ 解析运行时 Provider
        resolveRuntimeWebSearchProviders(config)
        getActiveRuntimeWebToolsMetadata()

3. 排序和选择 Provider
   sortWebSearchProvidersForAutoDetect(providers)
   → 选择第一个有凭证的 Provider

4. 执行搜索
   runWebSearch(params)
   │
   ├→ 选择 Provider
   ├→ 检查认证（hasAuthProfileForProvider）
   ├→ 调用 Provider API
   └→ 格式化结果

5. 返回搜索结果
   → { provider: "brave", result: { ... } }
```

## Provider 解析流程

```
resolveWebSearchDefinition(params)
  ↓
1. 获取搜索配置
   resolveSearchConfig(cfg)

2. 检查是否启用
   resolveWebSearchEnabled({ search, sandboxed })
   → 未启用 → { enabled: false }

3. 收集 Provider 列表
   → 配置 Provider + 插件 Provider + 运行时 Provider

4. 过滤有凭证的 Provider
   hasWebProviderEntryCredential(provider)

5. 排序
   sortWebSearchProvidersForAutoDetect()

6. 选择第一个
   → { enabled: true, provider, toolDef }
```

## 工具定义生成

```
resolveWebSearchToolDefinition({ config, sandboxed })
  ↓
1. 解析 Provider 定义
2. 生成工具 schema（参数描述）
3. 返回 WebSearchProviderToolDefinition
```

## 列出可用 Provider

```
listWebSearchProviders({ config })
  ↓
1. 收集所有 Provider
2. 过滤有凭证的
3. 返回 Provider ID 列表
```

## 配置选择流程

```
preferInputConfig = true && config 存在
  → 使用输入的 config

否则
  → getRuntimeConfigSnapshot() — 运行时配置快照
  → getRuntimeConfigSourceSnapshot() — 配置来源快照
  → selectApplicableRuntimeConfig() — 选择适用的配置
```

## 数据流总结

```
配置/插件/运行时 → Provider 列表
                       ↓
                 排序 + 过滤（凭证检查）
                       ↓
                 选择 Provider
                       ↓
                 执行搜索 API
                       ↓
                 格式化结果 → 返回 Agent
```
