# 27 — 代理抓取与流量捕获

> OpenClaw 的代理抓取模块（Proxy Capture）通过本地 HTTPS 代理捕获浏览器流量，
> 用于调试、审计和安全分析，让 Agent 的网页操作可观测。

## 设计思想

```
Agent 通过浏览器操作网页
  → 但浏览器操作通常是黑盒
  → 无法看到具体请求了什么 URL
  → 无法看到发送了什么数据

Proxy Capture 解决这个问题：
  → 启动本地 HTTPS 代理
  → 浏览器流量经过代理
  → 代理记录所有请求和响应
  → 供调试和安全审计使用
```

## 架构

```
┌──────────────────┐
│   Agent/浏览器    │
│   (Puppeteer等)   │
└────────┬─────────┘
         │ HTTP(S) 请求
         ▼
┌──────────────────┐
│  Proxy Server    │  ← 本地 HTTPS 代理
│  proxy-server.ts │
│  拦截 + 转发      │
│  记录请求/响应    │
└────────┬─────────┘
         │ 转发到目标
         ▼
┌──────────────────┐
│   目标网站        │
└──────────────────┘
```

## HTTPS 代理服务器

`src/proxy-capture/proxy-server.ts` — 核心的代理服务器实现：

```
启动代理
  → 监听本地端口（如 8080）
  → 生成自签名 CA 证书（用于 HTTPS 拦截）
  → 接受来自浏览器的连接

请求拦截
  → 浏览器请求 https://example.com
  → 代理使用自签名证书伪装为目标站点
  → 解密请求内容
  → 记录请求（URL、Headers、Body）
  → 转发到真实目标
  → 接收响应
  → 记录响应（Status、Headers、Body）
  → 返回给浏览器
```

## CA 证书管理

`src/proxy-capture/ca.ts` — 管理用于 HTTPS 拦截的 CA 证书：

```
首次启动
  → 生成自签名 Root CA
  → Root CA 需要安装到浏览器/系统信任存储
  → 每个 HTTPS 请求 → 动态生成域名证书（用 Root CA 签名）
  → 浏览器信任 Root CA → 信任动态证书 → 解密成功
```

## Blob 存储

`src/proxy-capture/blob-store.ts` — 存储捕获的请求/响应体：

```
请求/响应的 Body 内容
  → 可能很大（图片、视频、大文件）
  → blob-store 将 Body 存储到磁盘
  → 返回 blobId 引用
  → 转录记录中只存 blobId，不存完整内容
  → 按需读取完整内容
```

## 覆盖率追踪

`src/proxy-capture/coverage.ts` — 追踪已捕获的 URL 覆盖范围：

```
代理捕获的 URL 集合
  → 与已知的目标 URL 列表对比
  → 计算覆盖率
  → 发现未覆盖的操作
  → 用于测试和分析
```

## 环境配置

`src/proxy-capture/env.ts` — 代理运行环境配置：

```typescript
type ProxyCaptureConfig = {
  enabled: boolean;
  port: number;               // 代理端口
  captureBinary: boolean;     // 是否捕获二进制内容
  maxBodySize: number;        // 最大 Body 大小
  storagePath: string;        // 存储路径
};
```

### 调试代理设置

`resolveDebugProxySettings()` — 为外部工具（如 WebSocket 连接）提供代理设置：

```
外部工具需要通过代理
  → 读取代理配置
  → 创建代理 WebSocket Agent
  → 流量经过代理捕获
```

## 安全考量

1. **本地绑定** — 代理只监听 localhost，不暴露到网络
2. **CA 证书控制** — Root CA 私钥安全存储，用后可清除
3. **敏感数据** — 可配置不捕获包含凭证的请求
4. **自动清理** — 捕获文件定期清理

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/proxy-capture/proxy-server.ts` | HTTPS 代理服务器 |
| `src/proxy-capture/ca.ts` | CA 证书管理 |
| `src/proxy-capture/blob-store.ts` | Body 内容存储 |
| `src/proxy-capture/coverage.ts` | 覆盖率追踪 |
| `src/proxy-capture/env.ts` | 环境配置 |
| `src/proxy-capture/paths.ts` | 文件路径管理 |

## 总结

1. **透明代理** — HTTPS 流量解密、记录、转发
2. **CA 证书** — 自签名 CA 实现中间人代理
3. **Blob 存储** — 大内容外部存储，按需加载
4. **覆盖率追踪** — 分析操作覆盖范围
5. **安全第一** — 本地绑定、敏感数据过滤、自动清理
