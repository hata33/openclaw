# 29 — CLI 命令系统

> OpenClaw 的 CLI（命令行接口）是用户与系统交互的主要入口，
> 提供了 onboard、doctor、status 等数十个子命令。

## 命令架构

```
openclaw
  ├── onboard          # 引导式设置
  ├── doctor           # 诊断与修复
  ├── status           # 系统状态
  ├── gateway          # 网关管理
  │   ├── start        # 启动网关
  │   ├── stop         # 停止网关
  │   ├── restart      # 重启网关
  │   └── status       # 网关状态
  ├── acp              # ACP 子 Agent
  ├── mcp              # MCP 服务
  ├── config           # 配置管理
  └── ...              # 更多子命令
```

## 核心模块

### 命令行解析

`src/cli/argv.ts` — 解析命令行参数：

```
openclaw gateway restart --force --model gpt-4o
  → argv.parse() 解析
  → command: "gateway restart"
  → flags: { force: true, model: "gpt-4o" }
```

### 横幅显示

`src/cli/banner.ts` — 启动时的 ASCII 横幅：

```
$ openclaw start

  🦞 OpenClaw v2026.5.18
  Personal AI Assistant
```

### 能力 CLI

`src/cli/capability-cli.ts` — 能力管理命令：

```
openclaw capabilities list
  → 列出所有可用的工具、渠道、模型
```

### ACP CLI

`src/cli/acp-cli.ts` — ACP 相关命令：

```
openclaw acp serve      # 启动 ACP Server
openclaw acp list       # 列出子 Agent
```

## 入口层

`src/entry.ts` — CLI 的主入口：

```
命令行调用
  → entry.ts 解析命令
  → 路由到对应处理器
  → 执行命令
  → 返回结果
```

### 编译缓存

`src/entry.compile-cache.ts` — 优化启动速度：

```
TypeScript 编译缓存
  → 首次运行编译
  → 后续使用缓存
  → 加速 CLI 启动
```

### 版本快速路径

`src/entry.version-fast-path.ts` — `openclaw --version` 不需要加载全部模块：

```
openclaw --version
  → 直接读取 package.json 版本
  → 不初始化 Gateway
  → 毫秒级响应
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/cli/argv.ts` | 命令行参数解析 |
| `src/cli/banner.ts` | 启动横幅 |
| `src/entry.ts` | CLI 主入口 |
| `src/entry.compile-cache.ts` | 编译缓存 |
| `src/entry.version-fast-path.ts` | 版本快速路径 |

## 总结

1. **丰富子命令** — 覆盖设置、诊断、管理、运行等场景
2. **快速启动** — 版本查询等简单命令不加载全部模块
3. **编译缓存** — TypeScript 编译结果缓存，加速重复调用
