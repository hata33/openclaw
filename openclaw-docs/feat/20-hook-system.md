# 20 — Hook 系统

> OpenClaw 的 Hook 系统提供了可扩展的生命周期钩子机制，允许在消息处理、
> Agent 运行、工具调用等关键节点注入自定义逻辑。

## 设计思想

```
OpenClaw 的消息处理管线是一条固定的流水线：

消息接收 → 路由 → Agent 处理 → 工具调用 → 回复发送

Hook 系统在这条流水线上打"桩"，允许外部代码在关键节点介入：
  → 消息到达前 → 修改/拦截
  → Agent 处理后 → 后处理
  → 工具调用前/后 → 记录/转换
```

## Hook 类型

### 内部 Hook（Internal Hooks）

`src/hooks/internal-hooks.ts` — OpenClaw 内部生命周期钩子：

```yaml
hooks:
  internal:
    enabled: true
    entries:
      message-received:
        enabled: true
      before-agent-run:
        enabled: true
      after-tool-call:
        enabled: true
```

### 工作区 Hook（Workspace Hooks）

`src/hooks/workspace.ts` — 用户在工作区中定义的 Hook：

```
~/.openclaw/workspace/hooks/
  → .ts / .js 文件
  → 自动加载为 Hook 处理器
  → 按文件名排序执行
```

### 插件 Hook（Plugin Hooks）

`src/hooks/plugin-hooks.ts` — 通过插件注册的 Hook：

```
插件 manifest.json 声明 hooks
  → 插件加载时注册
  → 与内部 Hook 共享同一调度器
```

### 捆绑 Hook（Bundled Hooks）

`src/hooks/bundled/` — OpenClaw 内置的 Hook 集合：

```
bundled/
  → 内置功能（如 Gmail 集成）
  → 可通过配置启用/禁用
```

## Hook 生命周期

### 安装

`src/hooks/install.ts` — Hook 的安装管理：

```
Hook 安装请求
  → install() 注册 Hook
  → 记录到 HookInstallRecord
  → 持久化到配置
  → 热加载生效
```

### 加载

`src/hooks/loader.ts` — 动态加载 Hook 模块：

```
配置中声明的 Hook
  → loader.resolve() 查找 Hook 文件
  → module-loader.ts 动态导入
  → 验证 Hook 接口
  → 注册到调度器
```

### 策略

`src/hooks/policy.ts` — Hook 执行策略：

```
多个 Hook 注册在同一事件
  → 策略决定执行顺序
  → 错误处理策略（继续/中止）
  → 超时控制
```

## 消息 Hook

`src/hooks/message-hooks.ts` — 最常用的 Hook 类型，介入消息处理管线：

```
消息到达
  → beforeMessage Hook → 可修改消息内容
  → 消息路由
  → Agent 处理
  → afterMessage Hook → 可修改回复
  → 消息发送
```

### 消息 Hook 映射

`src/hooks/message-hook-mappers.ts` — 将消息事件映射到 Hook 调用：

```typescript
// 将内部消息事件转换为 Hook 调用格式
mapMessageEventToHookCall(event)
  → 标准化事件数据
  → 匹配 Hook 触发条件
  → 调用 Hook 处理器
```

## Fire-and-Forget 执行

`src/hooks/fire-and-forget.ts` — 部分 Hook 不需要等待结果：

```
非关键 Hook（如日志记录）
  → fire-and-forget 模式执行
  → 不阻塞主流程
  → 错误静默记录
```

## Frontmatter 配置

`src/hooks/frontmatter.ts` — Hook 支持通过文件 frontmatter 配置：

```typescript
// hooks/my-hook.ts
/**
 * @hook message-received
 * @priority 100
 * @enabled true
 */

export default function handleMessage(ctx) {
  // Hook 逻辑
}
```

## Gmail Hook 示例

`src/hooks/gmail.ts` — 内置的 Gmail 集成 Hook：

```
Gmail Hook 工作流：
  1. gmail-setup-utils.ts — OAuth 设置
  2. gmail-watcher-lifecycle.ts — 监听生命周期
  3. gmail-watcher.ts — Gmail API 轮询/推送
  4. gmail-ops.ts — Gmail 操作（读、标记已读等）
  5. gmail-watcher-errors.ts — 错误处理
```

## 配置

```yaml
hooks:
  internal:
    enabled: true                  # 全局开关
    load:
      extraDirs:                   # 额外 Hook 目录
        - "./custom-hooks/"
    entries:
      my-hook:
        enabled: true
        config:
          key: "value"
    installs:                      # 已安装的 Hook 记录
      gmail-hook:
        source: "bundled"
        version: "1.0.0"
```

## 更新机制

`src/hooks/update.ts` — Hook 更新管理：

```
Hook 文件变更
  → 检测到变更
  → 热重载 Hook 模块
  → 无需重启 Gateway
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/hooks/hooks.ts` | Hook 调度核心 |
| `src/hooks/types.ts` | Hook 类型定义 |
| `src/hooks/config.ts` | Hook 配置解析 |
| `src/hooks/configured.ts` | 配置状态检查 |
| `src/hooks/loader.ts` | Hook 文件加载 |
| `src/hooks/module-loader.ts` | 动态模块导入 |
| `src/hooks/install.ts` | Hook 安装管理 |
| `src/hooks/internal-hooks.ts` | 内部 Hook |
| `src/hooks/plugin-hooks.ts` | 插件 Hook |
| `src/hooks/workspace.ts` | 工作区 Hook |
| `src/hooks/message-hooks.ts` | 消息 Hook |
| `src/hooks/policy.ts` | 执行策略 |
| `src/hooks/bundled/` | 内置 Hook 集合 |

## 总结

1. **多来源 Hook** — 内置/工作区/插件/捆绑四种来源
2. **消息管线介入** — 在消息处理的关键节点注入逻辑
3. **热加载** — Hook 变更无需重启
4. **策略控制** — 执行顺序、错误处理、超时可配置
5. **Fire-and-Forget** — 非关键 Hook 不阻塞主流程
