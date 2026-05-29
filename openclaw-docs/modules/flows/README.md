# flows — 流程编排

> 负责 OpenClaw 的交互式流程编排：Doctor 诊断、渠道设置、Provider 配置和健康检查。
> 将多步骤操作编排为用户友好的交互式流程。

## 文件结构

| 文件 | 职责 |
|------|------|
| `types.ts` | 流程类型定义（FlowContribution、FlowOption） |
| `doctor-health.ts` | Doctor 诊断命令主入口 |
| `doctor-core-checks.ts` | 核心检查逻辑 |
| `doctor-lint-flow.ts` | Lint 检查流程 |
| `doctor-repair-flow.ts` | 修复流程 |
| `doctor-error-message.ts` | 错误消息格式化 |
| `doctor-health-contributions.ts` | 健康贡献收集 |
| `doctor-health-conversion-plan.ts` | 健康修复计划 |
| `doctor-startup-channel-maintenance.ts` | 启动时渠道维护 |
| `doctor-tool-result-cap-advice.ts` | 工具结果截断建议 |
| `channel-setup.ts` | 渠道设置流程 |
| `channel-setup.prompts.ts` | 渠道设置提示 |
| `channel-setup.status.ts` | 渠道状态检查 |
| `provider-flow.ts` | Provider 配置流程 |
| `provider-flow.runtime.ts` | Provider 流程运行时 |
| `search-setup.ts` | 搜索配置流程 |
| `health-checks.ts` | 健康检查定义 |
| `health-check-registry.ts` | 健康检查注册表 |
| `health-check-adapter.ts` | 健康检查适配器 |
| `health-check-runner-types.ts` | 检查运行器类型 |
| `bundled-health-checks.ts` | 内置健康检查 |
| `model-picker.ts` | 模型选择器 |

## 核心概念

- **FlowContribution** — 流程贡献（插件注册的流程步骤）
- **Health Check** — 健康检查（检测配置和运行状态问题）
- **Doctor** — 诊断命令（交互式诊断和修复）
- **Channel Setup** — 渠道设置（添加新渠道的向导）

## Doctor 诊断流程

```
openclaw doctor
  ↓
1. 核心检查（配置、连接、凭证）
2. 渠道检查（各渠道连接状态）
3. Provider 检查（模型可用性）
4. 安全检查（权限、暴露面）
5. 显示发现 → 提供修复选项
```
