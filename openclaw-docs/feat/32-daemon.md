# 32 — 守护进程管理

> OpenClaw 的守护进程模块（Daemon）管理 Gateway 的后台运行，
> 支持启动、停止、重启、状态查询和日志管理。

## 设计思想

```
Gateway 需要持续运行
  → 不能占用终端窗口
  → 需要开机自启
  → 需要崩溃自动重启

Daemon 模式：
  → Gateway 作为后台进程运行
  → PID 文件管理
  → 日志输出到文件
  → 信号处理（优雅关闭）
```

## 核心能力

### 进程管理

```
openclaw gateway start
  → 启动 Gateway 进程
  → 后台运行（daemonize）
  → 写入 PID 文件
  → 重定向日志到文件

openclaw gateway stop
  → 读取 PID 文件
  → 发送 SIGTERM
  → 等待优雅关闭
  → 超时后 SIGKILL

openclaw gateway restart
  → stop + start
  → 保留配置

openclaw gateway status
  → 检查 PID 文件
  → 检查进程是否存活
  → 显示运行时间和状态
```

### 优雅关闭

```
收到 SIGTERM/SIGINT
  → 停止接受新连接
  → 等待当前请求完成
  → 保存状态
  → 关闭数据库连接
  → 退出
```

### 日志管理

```
stdout/stderr → 日志文件
  → 按大小滚动
  → 保留最近 N 个文件
  → 可通过 openclaw gateway logs 查看
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/daemon/` | 守护进程管理 |

## 总结

1. **后台运行** — Gateway 不占用终端
2. **进程管理** — PID 文件、信号处理、优雅关闭
3. **日志滚动** — 自动管理日志文件大小
