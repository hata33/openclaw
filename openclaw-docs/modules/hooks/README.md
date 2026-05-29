# hooks — 钩子系统

> 事件驱动的钩子系统：Gmail 监控、URL 导入、文件变更等。
> 插件通过钩子响应系统事件。

## 文件结构（35 个文件）

### 核心

| 文件 | 职责 |
|------|------|
| `hooks.ts` | 钩子主入口 |
| `config.ts` | 钩子配置 |
| `configured.ts` | 已配置钩子 |
| `hooks-status.ts` | 钩子状态 |
| `fire-and-forget.ts` | 异步触发（不等待结果） |

### Gmail

| 文件 | 职责 |
|------|------|
| `gmail.ts` | Gmail 集成 |
| `gmail-ops.ts` | Gmail 操作 |
| `gmail-setup-utils.ts` | 设置工具 |
| `gmail-watcher.ts` | 邮件监控 |
| `gmail-watcher-lifecycle.ts` | 监控生命周期 |
| `gmail-watcher-errors.ts` | 错误处理 |

### 导入

| 文件 | 职责 |
|------|------|
| `import-url.ts` | URL 导入 |
| `frontmatter.ts` | Frontmatter 解析 |
| `bundled-dir.ts` | 内置目录 |

### 安装

| 文件 | 职责 |
|------|------|
| `install.runtime.ts` | 安装运行时 |

## 核心概念

### 钩子触发

```
事件发生 → 查找匹配的钩子 → 执行 → 结果处理
```

### Gmail 监控

持续监控 Gmail 收件箱，新邮件触发钩子处理。

### fire-and-forget

异步触发钩子，不阻塞主流程。
