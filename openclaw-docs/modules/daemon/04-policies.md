# daemon — 策略

## 自动重启

服务崩溃后自动重启。systemd 使用 `Restart=on-failure`，launchd 使用 `KeepAlive`。

## 路径策略

`service-path-policy.ts` 确保服务能找到 Node.js 和 OpenClaw 二进制文件。

## 容器

`container-context.ts` 检测容器环境，跳过不需要的服务管理操作。
