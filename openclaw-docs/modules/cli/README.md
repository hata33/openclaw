# cli — 命令行界面

> 251 文件，51346 行。OpenClaw 的命令行工具。
> 包含所有 CLI 命令的实现和共享基础设施。

## 子模块

| 子目录 | 说明 |
|--------|------|
| `program/` | CLI 框架（命令注册、参数解析） |
| `gateway-cli/` | Gateway 管理 CLI |
| `daemon-cli/` | 守护进程管理 CLI |
| `cron-cli/` | 定时任务 CLI |
| `node-cli/` | 节点管理 CLI |
| `nodes-cli/` | 节点列表 CLI |
| `send-runtime/` | 消息发送运行时 |
| `update-cli/` | 更新 CLI |
| `shared/` | 共享 CLI 工具 |

## 命令列表

```
openclaw setup      — 初始设置
openclaw tui        — 终端 UI
openclaw doctor     — 诊断
openclaw service    — 服务管理
openclaw gateway    — Gateway 管理
openclaw cron       — 定时任务
openclaw node       — 节点管理
openclaw send       — 发送消息
openclaw update     — 更新
```
