# bootstrap — 功能定义

## resolveAutoNodeExtraCaCerts

检测是否需要自动设置 `NODE_EXTRA_CA_CERTS`：

```
条件: Linux + nvm 环境 + 未设置 NODE_EXTRA_CA_CERTS
→ 查找系统 CA 证书路径
→ 返回路径（由调用者设置环境变量）
```

## resolveNodeStartupTlsEnvironment

解析启动时的完整 TLS 环境：

```typescript
function resolveNodeStartupTlsEnvironment(params?): {
  NODE_EXTRA_CA_CERTS?: string;
  NODE_USE_SYSTEM_CA?: string;
}
```

- macOS: `/etc/ssl/cert.pem` + `NODE_USE_SYSTEM_CA=1`
- Linux + nvm: 自动检测 CA 证书路径
- 其他: 不设置
