# flows — 功能定义与设计思想

## 这个模块解决什么问题？

OpenClaw 配置复杂，问题排查困难。flows 模块通过交互式流程帮助用户完成配置和诊断。

## Doctor 诊断

### 检查类型

| 检查 | 说明 |
|------|------|
| 核心 | 配置文件、Gateway 状态、密钥有效性 |
| 渠道 | Telegram/Discord/WhatsApp 连接状态 |
| Provider | 模型 API 可达性、配额 |
| 安全 | 文件权限、端口暴露、认证状态 |

### 修复流程

Doctor 发现问题后提供交互式修复：

```
发现问题 → 提示修复 → 用户确认 → 自动修复 → 验证
```

## 渠道设置

引导用户添加新渠道：

```
1. 选择渠道类型（Telegram/Discord/WhatsApp/...）
2. 输入凭证（Bot Token / API Key）
3. 测试连接
4. 保存配置
```

## Provider 配置

引导用户配置 AI Provider：

```
1. 选择 Provider（OpenAI/Anthropic/Google/...）
2. 输入 API Key
3. 测试连接
4. 保存配置
```

## 健康检查

### 检查注册

```typescript
type HealthCheck = {
  id: string;
  label: string;
  run(): Promise<HealthFinding[]>;
};
```

### 发现级别

```typescript
type HealthFindingSeverity = "info" | "warning" | "error";
```

## FlowContribution 模式

插件可以注册流程贡献，扩展设置和诊断功能：

```typescript
type FlowContribution = {
  kind: "channel" | "core" | "provider" | "search";
  surface: "auth-choice" | "health" | "model-picker" | "setup";
  options: FlowOption[];
};
```
