# web — Web 工具共享逻辑

> web-search 和 web-fetch 工具共享的 Provider 解析逻辑。
> 统一处理 Provider 选择、凭证检测和工具定义创建。

## 文件结构

| 文件 | 职责 |
|------|------|
| `provider-runtime-shared.ts`（201 行） | Web Provider 通用解析 |

## 核心函数

### resolveWebProviderConfig

从配置中读取 web 工具配置：

```typescript
resolveWebProviderConfig(config, "search") → config.tools.web.search
resolveWebProviderConfig(config, "fetch")  → config.tools.web.fetch
```

### resolveWebProviderDefinition

根据配置和运行时元数据解析 Provider 并创建工具定义：

```
1. 检查工具是否启用
2. 解析 Provider ID（配置 > 运行时 > 自动检测）
3. 查找 Provider
4. 创建工具定义
```

### hasWebProviderEntryCredential

检查 Provider 是否有有效凭证：

```
配置值 → SecretRef → 环境变量 → authProvider → 回退值
```

## 设计

通用模板函数，支持不同 Provider 类型：

```typescript
resolveWebProviderDefinition<TProvider, TConfig, TDefinition>(params)
```
