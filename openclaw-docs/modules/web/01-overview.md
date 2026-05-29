# web — 功能定义

## 解决什么问题？

web-search 和 web-fetch 有相同的 Provider 解析逻辑：选 Provider、检查凭证、创建工具定义。web 模块提取这些共享逻辑。

## Provider 解析优先级

```
1. 显式指定的 providerId
2. 运行时元数据中的 selectedProvider
3. 自动检测（resolveAutoProviderId）
4. 回退 Provider（resolveFallbackProviderId）
```

## 凭证检查链

```
配置值（SecretRef/明文）→ authProvider → 环境变量 → 回退值
```
任一环节有值即视为已配置。
