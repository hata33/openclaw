# commands — 命令处理器

> 359 文件，73638 行。CLI 和 TUI 命令的业务逻辑实现。
> 与 CLI 框架分离，专注于命令的处理逻辑。

## 子模块

| 子目录 | 说明 |
|--------|------|
| `agent/` | Agent 相关命令 |
| `channels/` | 渠道命令 |
| `channel-setup/` | 渠道设置 |
| `doctor/` | 诊断命令 |
| `gateway-status/` | Gateway 状态 |
| `migrate/` | 迁移命令 |
| `models/` | 模型命令 |
| `onboard-non-interactive/` | 非交互式配置 |
| `setup/` | 设置命令 |
| `status-all/` | 全局状态 |

## 与 CLI 的关系

commands 提供**业务逻辑**，cli 提供**CLI 框架**（参数解析、输出格式化）。
