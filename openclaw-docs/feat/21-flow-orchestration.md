# 21 — 流程编排

> OpenClaw 的流程编排模块（Flows）提供声明式的多步骤流程框架，
> 用于频道设置引导、Doctor 诊断修复、健康检查等复杂交互场景。

## 适用场景

```
场景 1: 频道设置
  用户想连接 Telegram
  → 引导用户创建 Bot → 获取 Token → 验证连接 → 完成配置

场景 2: Doctor 诊断
  openclaw doctor
  → 检查配置完整性 → 检查连接状态 → 检查权限 → 修复问题

场景 3: 健康检查
  系统启动后自动检查
  → 渠道连接 → 模型可用性 → 工具权限 → 报告状态
```

## 架构

```
┌──────────────────────────────────────┐
│           Flow 定义                   │
│  (声明式多步骤流程)                    │
└──────────────────┬───────────────────┘
                   │
        ┌──────────┴──────────┐
        │    Flow Runner       │  ← 执行引擎
        │  步骤调度 / 状态管理  │
        └──────────┬──────────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
     ▼             ▼             ▼
  频道设置       Doctor        健康检查
  channel-setup  doctor-core   bundled-health-checks
```

## 频道设置流程

`src/flows/channel-setup.ts` — 引导用户完成渠道连接：

```
channelSetup() 启动流程
  → channel-setup.status.ts 检查当前状态
  → channel-setup.prompts.ts 生成提示
  → 按步骤引导：
    1. 选择渠道类型
    2. 获取 API Token / 凭证
    3. 测试连接
    4. 保存配置
    5. 激活渠道
  → 每步可回退、重试
```

### 状态追踪

```typescript
// channel-setup.status.ts
type ChannelSetupStatus = {
  channelId: string;
  currentStep: string;
  completed: boolean;
  error?: string;
};
```

## Doctor 流程

`src/flows/doctor-core-*.ts` — 系统诊断和修复：

```
openclaw doctor --fix
  → 检查配置格式
  → 检查认证状态
  → 检查渠道连接
  → 检查工具权限
  → 检查磁盘空间
  → 发现问题 → 提示修复
  → --fix 模式 → 自动修复
```

### Doctor 检查项

```
配置版本兼容性 → 迁移旧配置
浏览器残留检查 → 清理残留文件
模型配置完整性 → 补全缺失配置
凭证有效性 → 刷新过期凭证
```

## 健康检查流程

`src/flows/bundled-health-checks.ts` — 系统健康检查：

```
Gateway 启动后 / 定期执行
  → 检查各渠道连接状态
  → 检查模型 Provider 可用性
  → 检查插件加载状态
  → 检查核心服务运行状态
  → 生成健康报告
```

## Flow 执行模式

```
1. 交互模式 — CLI 引导，逐步提示用户输入
2. 自动模式 — 自动执行所有步骤，遇错停止
3. 修复模式 — 发现问题自动修复，无法修复时报告
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/flows/channel-setup.ts` | 频道设置流程 |
| `src/flows/channel-setup.status.ts` | 设置状态追踪 |
| `src/flows/channel-setup.prompts.ts` | 用户提示生成 |
| `src/flows/bundled-health-checks.ts` | 健康检查流程 |

## 总结

1. **声明式流程** — 多步骤操作通过声明式定义
2. **状态追踪** — 每步记录状态，支持回退和恢复
3. **三种模式** — 交互/自动/修复，适应不同场景
4. **内置流程** — 频道设置、Doctor、健康检查
