# bootstrap — 启动引导

> Node.js 进程启动时的 TLS/CA 证书环境配置。
> 解决 Linux + nvm 环境下系统 CA 证书不可用的问题。

## 文件结构

| 文件 | 职责 |
|------|------|
| `node-extra-ca-certs.ts`（70 行） | 检测并设置 NODE_EXTRA_CA_CERTS |
| `node-startup-env.ts`（36 行） | 解析启动时的 TLS 环境变量 |

## 核心问题

nvm 管理的 Node.js 在 Linux 上可能无法找到系统 CA 证书，导致 HTTPS 请求失败（如连接 GitHub API）。

## 解决方案

```
1. 检测 Linux + nvm 环境
2. 查找系统 CA 证书路径
   /etc/ssl/certs/ca-certificates.crt (Debian/Ubuntu)
   /etc/pki/tls/certs/ca-bundle.crt (RHEL/CentOS)
   /etc/ssl/ca-bundle.pem (OpenSUSE)
3. 设置 NODE_EXTRA_CA_CERTS 环境变量
```

## macOS 默认

macOS 上默认设置：
```
NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem
NODE_USE_SYSTEM_CA=1
```
