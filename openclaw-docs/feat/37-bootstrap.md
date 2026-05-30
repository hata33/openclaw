# 37 — 启动引导

> OpenClaw 的启动引导模块（Bootstrap）处理 Gateway 启动时的初始化工作：
> 环境检查、CA 证书加载、Node.js 环境配置。

## 启动流程

```
Gateway 启动
  │
  ├── 1. Node.js 环境检查
  │     → 版本兼容性
  │     → 内存限制配置
  │     → 额外 CA 证书
  │
  ├── 2. 配置加载
  │     → 读取配置文件
  │     → 环境变量替换
  │     → Schema 校验
  │
  ├── 3. 插件发现
  │     → 扫描 extensions/ 目录
  │     → 加载插件清单
  │     → 注册 Provider、工具、渠道
  │
  ├── 4. 服务初始化
  │     → 启动 HTTP 服务器
  │     → 连接渠道
  │     → 初始化记忆系统
  │     → 启动定时任务
  │
  └── 5. 就绪
        → 发出 ready 事件
        → 开始接受消息
```

## 核心模块

### Node.js 额外 CA 证书

`src/bootstrap/node-extra-ca-certs.ts` — 加载额外的 CA 证书：

```
某些企业环境使用自签名证书
  → NODE_EXTRA_CA_CERTS 环境变量
  → 启动时自动设置
  → 确保 HTTPS 连接正常
```

### Node.js 启动环境

`src/bootstrap/node-startup-env.ts` — 配置 Node.js 运行环境：

```
Node.js 环境优化：
  → 内存限制（--max-old-space-size）
  → Unicode 支持
  → DNS 解析配置
  → 未处理 Promise 拒绝策略
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/bootstrap/node-extra-ca-certs.ts` | 额外 CA 证书加载 |
| `src/bootstrap/node-startup-env.ts` | Node.js 环境配置 |

## 总结

1. **环境准备** — 在 Gateway 核心启动前完成所有环境配置
2. **CA 证书** — 自动处理企业环境中的自签名证书
3. **内存优化** — 根据系统资源调整 Node.js 内存限制
