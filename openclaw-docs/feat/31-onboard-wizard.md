# 31 — 引导向导

> OpenClaw 的引导向导（Wizard）通过交互式问答引导新用户完成首次设置，
> 是推荐的新手入门路径。

## 设计思想

```
新用户安装 OpenClaw 后：
  → 面对复杂的配置选项
  → 不知道从哪里开始
  → 容易在配置阶段放弃

Wizard 解决这个问题：
  → 交互式问答
  → 逐步引导配置
  → 自动检测和推荐
  → 一次完成所有基本设置
```

## 向导流程

```
openclaw onboard
  │
  ├── 1. 欢迎 & 系统检查
  │     → Node.js 版本
  │     → 磁盘空间
  │     → 网络连接
  │
  ├── 2. 选择模型 Provider
  │     → 列出支持的 Provider
  │     → 输入 API Key
  │     → 测试连接
  │
  ├── 3. 配置渠道
  │     → 选择要连接的渠道
  │     → Telegram / Discord / WhatsApp ...
  │     → 输入凭证
  │     → 验证连接
  │
  ├── 4. 工作区设置
  │     → 创建工作区目录
  │     → 初始化 SOUL.md / AGENTS.md
  │     → 选择技能
  │
  ├── 5. 安全配置
  │     → 设置密码
  │     → DM 访问策略
  │
  └── 6. 启动 Gateway
        → 启动服务
        → 显示连接信息
```

## 核心模块

### 会话管理

`src/wizard/session.ts` — 向导会话的状态管理：

```typescript
type WizardSession = {
  currentStep: string;
  completedSteps: string[];
  config: Partial<OpenClawConfig>;  // 逐步构建的配置
  skippedSteps: string[];
};
```

### 提示系统

`src/wizard/prompts.ts` — 交互式提示：

```
使用 clack-prompter.ts (基于 @clack/prompts)
  → select(): 单选列表
  → text(): 文本输入
  → confirm(): 确认
  → password(): 密码输入（隐藏）
  → multiselect(): 多选列表
  → spinner(): 加载指示
```

### 完成处理

`src/wizard/setup.completion.ts` — 向导完成后的收尾：

```
所有步骤完成
  → setup.completion()
  → 生成最终配置文件
  → 创建工作区文件
  → 首次启动 Gateway
  → 显示"设置完成"消息和后续步骤
```

### 国际化

`src/wizard/i18n/` — 向导支持多语言：

```
根据系统语言选择提示语言
  → 英文（默认）
  → 中文
  → 更多语言可扩展
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/wizard/session.ts` | 会话状态管理 |
| `src/wizard/prompts.ts` | 交互提示 |
| `src/wizard/clack-prompter.ts` | Clack UI 封装 |
| `src/wizard/setup.completion.ts` | 完成处理 |
| `src/wizard/setup.finalize.ts` | 最终化配置 |

## 总结

1. **交互引导** — 逐步问答，降低入门门槛
2. **自动检测** — 系统检查、Provider 测试
3. **多语言** — 根据系统语言选择提示
4. **推荐路径** — 新用户推荐使用 `openclaw onboard`
