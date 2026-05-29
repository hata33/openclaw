# web-fetch — 策略、配置与边界情况

## 一、Provider 选择策略

### 1.1 自动检测

当用户未指定 Provider 时，系统自动选择：

```
1. 收集所有 Provider（内置 + 插件 + 运行时）
2. 按优先级排序
   → 有凭证的优先
   → 插件 Provider 可能覆盖内置
3. 选择第一个可用的
```

### 1.2 运行时 Provider

`preferRuntimeProviders` 选项让运行时 Provider 优先于配置中的 Provider：

```typescript
if (params.preferRuntimeProviders) {
  // 优先使用运行时 Provider（如 Jina Cloud）
}
```

### 1.3 沙箱模式

在沙箱环境中，web_fetch 可能被限制：

```typescript
if (params.sandboxed) {
  // 检查沙箱是否允许网络请求
}
```

## 二、内容提取策略

### 2.1 提取器链

多个提取器按注册顺序尝试：

```
提取器 A → 失败（抛出异常）→ 继续
提取器 B → 返回空文本 → 继续
提取器 C → 返回有效文本 → 成功返回
```

### 2.2 容错处理

```typescript
try {
  result = await extractor.extract({ html, url, extractMode });
} catch {
  continue;  // 单个提取器失败不影响其他提取器
}
```

### 2.3 配置作用域缓存

提取器列表按配置对象缓存：

```typescript
const webContentExtractorLoader = createConfigScopedPromiseLoader(...);
```

配置更新时缓存自动失效。

## 三、已知边界情况

### 3.1 无可用 Provider

当所有 Provider 都没有凭证或不可用时：

```
resolveWebFetchEnabled() → false
resolveWebFetchDefinition() → { enabled: false }
```

web_fetch 工具不会出现在 Agent 的可用工具列表中。

### 3.2 所有提取器失败

```typescript
// 所有提取器都失败或返回空文本
return null;
```

调用方需要处理 null 返回值（可能回退到原始 HTML）。

### 3.3 提取器加载失败

```typescript
try {
  extractors = await webContentExtractorLoader.load(params.config);
} catch {
  return null;  // 提取器加载失败 → 返回 null
}
```

### 3.4 沙箱限制

在沙箱环境中，web_fetch 可能需要特殊配置才能使用。`sandboxed` 参数控制此行为。
