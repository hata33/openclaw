# web-search — 策略、配置与边界情况

## 一、Provider 选择策略

### 1.1 自动检测

未指定 Provider 时自动选择：

```
1. 收集所有 Provider（配置 + 插件 + 运行时）
2. 过滤：只保留有凭证的
3. 排序：有凭证优先，然后按优先级
4. 选择第一个
```

### 1.2 指定 Provider

```typescript
providerId?: string  // 显式指定 Provider ID
```

指定时直接使用该 Provider，不再自动选择。

### 1.3 运行时 Provider 优先

```typescript
preferRuntimeProviders?: boolean
```

启用时运行时 Provider 优先于配置中的 Provider。

### 1.4 输入配置优先

```typescript
preferInputConfig?: boolean
```

启用时优先使用传入的 config 参数，而非运行时配置快照。

## 二、凭证检查策略

### 2.1 凭证检测

```typescript
hasWebProviderEntryCredential(provider)
```

检查 Provider 是否有可用的凭证（API Key 等）。

### 2.2 是否需要凭证

```typescript
providerRequiresCredential(provider)
```

某些 Provider 可能不需要凭证（如免费的搜索服务）。

### 2.3 环境变量读取

```typescript
readWebProviderEnvValue(provider, envKey)
```

从环境变量中读取 Provider 凭证。

## 三、搜索结果策略

### 3.1 结果标准化

不同 Provider 的结果格式不同，但统一包装为：

```typescript
type RunWebSearchResult = {
  provider: string;              // 标识使用的 Provider
  result: Record<string, unknown>; // 原始结果（由 Provider 决定格式）
};
```

### 3.2 Provider 标识

结果中的 `provider` 字段标识使用了哪个搜索后端，方便调试和日志。

## 四、沙箱策略

### 4.1 沙箱中默认启用

```typescript
if (params.sandboxed) return true;  // 沙箱中默认启用搜索
```

沙箱环境通常需要搜索能力。

## 五、已知边界情况

### 5.1 无可用 Provider

```
resolveWebSearchDefinition() → { enabled: false }
```

web_search 工具不会出现在 Agent 的可用工具列表中。

### 5.2 搜索失败

搜索 API 调用可能失败（网络错误、配额耗尽等），错误由 Provider 层处理。

### 5.3 配置快照过期

运行时配置快照可能不是最新的。`preferInputConfig` 选项允许使用最新配置。

### 5.4 多 Provider 竞争

当多个 Provider 都有凭证时，排序决定使用哪个。用户可以通过 `providerId` 显式指定。
