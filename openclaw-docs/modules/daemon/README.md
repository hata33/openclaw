# daemon — 守护进程管理

> 将 OpenClaw Gateway 安装为系统服务（daemon）。
> 跨平台支持 systemd（Linux）、launchd（macOS）、schtasks（Windows）。

## 文件结构（42 个文件）

### 服务管理

| 文件 | 职责 |
|------|------|
| `service.ts` | 服务主入口 |
| `service-types.ts` | 服务类型 |
| `service-runtime.ts` | 服务运行时 |
| `service-layout.ts` | 服务文件布局 |
| `service-env.ts` | 环境变量管理 |
| `service-env-plan.ts` | 环境变量计划 |
| `service-env-render-policy.ts` | 环境渲染策略 |
| `service-managed-env.ts` | 托管环境 |
| `service-path-policy.ts` | 路径策略 |
| `service-audit.ts` | 服务审计 |

### systemd（Linux）

| 文件 | 职责 |
|------|------|
| `systemd.ts` | systemd 服务管理 |
| `systemd-unit.ts` | unit 文件生成 |
| `systemd-hints.ts` | systemd 提示 |
| `systemd-linger.ts` | linger 管理 |
| `systemd-unavailable.ts` | 不可用回退 |

### launchd（macOS）

| 文件 | 职责 |
|------|------|
| `launchd.ts` | launchd 服务管理 |
| `launchd-plist.ts` | plist 文件生成 |
| `launchd-restart-handoff.ts` | 重启交接 |

### schtasks（Windows）

| 文件 | 职责 |
|------|------|
| `schtasks.ts` | Windows 计划任务管理 |
| `schtasks-exec.ts` | schtasks 执行 |

### 通用

| 文件 | 职责 |
|------|------|
| `gateway-entrypoint.ts` | Gateway 启动入口 |
| `node-service.ts` | Node.js 服务 |
| `runtime-binary.ts` | 运行时二进制 |
| `runtime-format.ts` | 运行时格式 |
| `runtime-hints.ts` | 运行时提示 |
| `runtime-parse.ts` | 运行时解析 |
| `runtime-paths.ts` | 运行时路径 |
| `constants.ts` | 常量 |
| `paths.ts` | 路径 |
| `output.ts` | 输出格式化 |
| `diagnostics.ts` | 诊断 |
| `inspect.ts` | 检查 |
| `cmd-argv.ts` | 命令参数 |
| `cmd-set.ts` | 命令设置 |
| `arg-split.ts` | 参数分割 |
| `program-args.ts` | 程序参数 |
| `exec-file.ts` | 文件执行 |
| `container-context.ts` | 容器上下文 |
| `future-config-guard.ts` | 配置保护 |
| `restart-logs.ts` | 重启日志 |

## 核心概念

### 服务安装

```bash
openclaw service install   # 安装为系统服务
openclaw service start     # 启动
openclaw service stop      # 停止
openclaw service status    # 状态
openclaw service logs      # 日志
```

### 跨平台

| 平台 | 服务管理器 |
|------|-----------|
| Linux | systemd |
| macOS | launchd |
| Windows | schtasks |

### 环境变量

服务运行时的环境变量与交互式终端不同。`service-env.ts` 管理服务进程的环境。
