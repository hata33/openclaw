# proxy-capture — 代理抓包

> HTTP 代理服务器，用于捕获和回放 API 请求。
> 支持请求录制、回放和覆盖率分析，主要用于测试和调试。

## 文件结构

| 文件 | 职责 |
|------|------|
| `proxy-server.ts` | HTTP 代理服务器 |
| `ca.ts` | CA 证书管理（HTTPS 拦截） |
| `blob-store.ts` | Blob 存储 |
| `store.sqlite.ts` | SQLite 存储 |
| `coverage.ts` | 覆盖率分析 |
| `runtime.ts` | 运行时管理 |
| `paths.ts` | 文件路径管理 |
| `env.ts` | 环境变量 |
| `types.ts` | 类型定义 |

## 核心功能

### HTTPS 拦截

`ca.ts` 生成自签名 CA 证书，用于拦截 HTTPS 请求：

```
1. 生成 CA 证书
2. 动态签发站点证书
3. MITM 拦截请求/响应
```

### 请求录制

```
代理服务器 → 拦截请求 → 保存到 SQLite → 返回响应
```

### 请求回放

```
代理服务器 → 查找已录制请求 → 返回录制响应
```

### 覆盖率

`coverage.ts` 分析录制请求的覆盖率。
