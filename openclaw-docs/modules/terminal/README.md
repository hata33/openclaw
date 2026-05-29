# terminal — 终端 UI

> 终端输出格式化：ANSI 颜色、进度条、表格、链接、样式化提示。
> 用于 CLI 命令的终端用户界面。

## 文件结构

| 文件 | 职责 |
|------|------|
| `ansi.ts` | ANSI 转义序列工具 |
| `theme.ts` | 终端主题（颜色方案） |
| `palette.ts` | 颜色调色板 |
| `prompt-style.ts` | 提示样式 |
| `prompt-select-styled.ts` | 样式化选择器 |
| `prompt-select-styled-params.ts` | 选择器参数 |
| `progress-line.ts` | 进度行 |
| `osc-progress.ts` | OSC 进度（终端标题栏进度） |
| `table.ts` | 表格渲染 |
| `links.ts` | 终端链接 |
| `terminal-link.ts` | 终端链接工具 |
| `safe-text.ts` | 安全文本（过滤控制字符） |
| `decorative-emoji.ts` | 装饰 Emoji |
| `health-style.ts` | 健康检查样式 |
| `note.ts` | 注释显示 |
| `stream-writer.ts` | 流式输出 |
| `restore.ts` | 终端状态恢复 |

## 核心能力

### ANSI 颜色

`ansi.ts` 提供 ANSI 颜色/样式：

```typescript
sanitizeForLog(text)  // 移除 ANSI 转义
```

### 表格

`table.ts` 渲染终端表格：

```
┌──────────┬─────────┐
│ Name     │ Status  │
├──────────┼─────────┤
│ model    │ active  │
│ provider │ openai  │
└──────────┴─────────┘
```

### 进度

`progress-line.ts` 和 `osc-progress.ts` 显示进度信息。

### 安全文本

`safe-text.ts` 过滤终端控制字符，防止注入攻击。
