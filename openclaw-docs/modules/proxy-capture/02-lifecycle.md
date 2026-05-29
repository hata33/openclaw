# proxy-capture — 数据流

```
应用发送 HTTP 请求
  ↓
1. 设置代理
   HTTP_PROXY / HTTPS_PROXY 环境变量

2. 请求经过代理
   proxy-server.ts 拦截

3. 录制/回放
   录制: 转发请求 + 保存响应
   回放: 查找已录制响应

4. 存储到 SQLite
   store.sqlite.ts
```
