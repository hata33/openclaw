# web — 策略

## 凭证优先级

1. 配置中的 SecretRef（非 env 类型）
2. 配置中的明文值
3. authProvider 认证
4. 环境变量
5. 回退配置值

## 空值保护

`requiresCredential !== false` 的 Provider 必须有凭证。无凭证的 Provider 跳过。
