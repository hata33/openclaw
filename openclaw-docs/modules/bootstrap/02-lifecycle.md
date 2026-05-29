# bootstrap — 启动流程

```
OpenClaw 进程启动
  ↓
1. 解析 TLS 环境
   resolveNodeStartupTlsEnvironment()
   → 检测平台 + Node 版本管理器

2. 设置环境变量
   process.env.NODE_EXTRA_CA_CERTS = ...
   process.env.NODE_USE_SYSTEM_CA = ...

3. 后续 HTTPS 请求使用正确 CA
```
