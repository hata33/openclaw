# web — 数据流

```
web-search / web-fetch 工具初始化
  ↓
1. 读取配置
   resolveWebProviderConfig(config, kind)

2. 解析 Provider
   resolveWebProviderDefinition({
     config, toolConfig, runtimeMetadata,
     providers, resolveEnabled, resolveAutoProviderId,
     createTool
   })

3. 检查凭证
   hasWebProviderEntryCredential(...)

4. 返回工具定义
   → { provider, definition } | null
```
