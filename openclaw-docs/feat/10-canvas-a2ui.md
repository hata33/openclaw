# 10 — 实时 Canvas 与 A2UI

> Canvas 是 OpenClaw 的实时可视化工作区——Agent 可以在其中渲染 HTML、
> 展示图表、构建交互式 UI。A2UI（Agent-to-UI）让 Agent 自动将内容转换为可视化界面。

## Canvas 概述

Canvas 是一个 Agent 驱动的可视化工作区：

```
Agent 生成内容
  → Canvas 渲染 HTML/SVG
  → 用户在浏览器/客户端中查看
  → 用户交互（点击、输入）
  → 交互事件回传给 Agent
  → Agent 更新 Canvas
```

### Canvas 的本质

Canvas 本质上是一个**由 Agent 控制的浏览器页面**。Agent 可以：
- 渲染任意 HTML/CSS/JavaScript
- 展示 SVG 图表
- 构建交互式表单
- 实时更新内容

## Canvas 架构

```
Agent
  ↓ (canvas tool)
Gateway
  ↓ (WebSocket/SSE)
Canvas Client (macOS app / 浏览器)
  ↓
渲染引擎 (WebView)
```

### Canvas Tool

Agent 通过 `canvas` 工具控制 Canvas：

```typescript
// 展示 HTML 内容
canvas({
  action: "present",
  url: "https://example.com/page",
  // 或直接提供 HTML
  javaScript: "document.body.innerHTML = '<h1>Hello</h1>'"
});

// 截图
canvas({
  action: "snapshot",
  outputFormat: "png"
});

// 执行 JavaScript
canvas({
  action: "eval",
  javaScript: "document.title"
});
```

### Canvas 操作

| 操作 | 功能 |
|------|------|
| `present` | 展示 URL 或 HTML 内容 |
| `navigate` | 导航到指定 URL |
| `eval` | 执行 JavaScript |
| `snapshot` | 截取当前页面快照 |
| `hide` | 隐藏 Canvas |

## A2UI（Agent-to-UI）

A2UI 是 Canvas 的高级模式——Agent 不只是展示内容，还能**自动构建 UI**。

### A2UI 工作流

```
用户: "帮我做一个项目进度看板"
  → Agent 分析需求
  → Agent 使用 A2UI 推送 UI 组件
  → Canvas 渲染看板 UI
  → 用户看到交互式看板
  → 用户点击/操作
  → 事件回传 Agent
  → Agent 更新看板数据
```

### A2UI 推送模式

```typescript
// 推送 UI 组件到 Canvas
canvas({
  action: "a2ui_push",
  jsonl: JSON.stringify({
    type: "card",
    title: "项目进度",
    children: [
      { type: "progress", value: 75 },
      { type: "table", data: [...] }
    ]
  })
});

// 重置 Canvas
canvas({
  action: "a2ui_reset"
});
```

### A2UI 组件模型

A2UI 使用 JSONL 格式描述 UI 组件树：

```jsonl
{"type":"container","layout":"flex","direction":"column"}
{"type":"text","content":"项目进度","style":"heading"}
{"type":"progress","value":75,"max":100}
{"type":"table","columns":["任务","状态","进度"],"rows":[...]}
{"type":"button","label":"更新","action":"refresh"}
```

## Canvas 与浏览器的区别

| 维度 | Canvas | Browser |
|------|--------|---------|
| 控制方式 | Agent 直接渲染 | 浏览器自动化（Playwright） |
| 交互模式 | Agent ↔ 用户双向 | Agent 操控已有页面 |
| 用途 | 自建 UI | 操作第三方网站 |
| 性能 | 轻量（WebView） | 重量（完整浏览器） |
| 安全 | 受限环境 | 可访问任意 URL |

Canvas 是 Agent **自己的画布**，Browser 是 Agent **操控别人页面的手**。

## macOS/iOS Canvas

在 Apple 平台上，Canvas 通过原生 app 实现：

```
OpenClaw macOS app
  → 菜单栏图标
  → Canvas 窗口（WebView）
  → 实时 WebSocket 连接到 Gateway
  → 接收 Agent 推送的 UI 更新
  → 渲染并展示
```

### 伴侣 App 架构

```
macOS/iOS/Android 伴侣 App
  ├── 菜单栏/通知栏入口
  ├── Canvas WebView（可视化工作区）
  ├── Voice Wake（语音唤醒）
  ├── Talk Mode（实时语音对话）
  └── WebSocket 连接到 Gateway
```

## Canvas 安全

Canvas 运行在受限环境中：

1. **同源策略** — Canvas 内容受 WebView 安全策略限制
2. **输入过滤** — 用户输入经过安全过滤
3. **JavaScript 沙箱** — 执行的 JS 受限于 Canvas 沙箱
4. **网络限制** — Canvas 中的网络请求受 Gateway 代理

## 实际应用场景

### 1. 数据可视化

```
用户: "分析这个 CSV 文件并生成图表"
  → Agent 解析 CSV
  → 生成 Chart.js 图表 HTML
  → Canvas 渲染交互式图表
```

### 2. 交互式表单

```
用户: "帮我做一个调查问卷"
  → Agent 生成表单 HTML
  → Canvas 渲染表单
  → 用户填写并提交
  → Agent 收集数据
```

### 3. 实时仪表盘

```
用户: "监控服务器状态"
  → Agent 定期检查服务器
  → Canvas 渲染实时仪表盘
  → 自动刷新数据
```

### 4. 白板协作

```
用户: "画一个系统架构图"
  → Agent 生成 SVG 架构图
  → Canvas 渲染可编辑的架构图
  → 用户修改后 Agent 更新
```

## 关键代码入口

| 文件/目录 | 职责 |
|-----------|------|
| `extensions/canvas/` | Canvas 扩展核心 |
| `src/tools/` | Canvas 工具定义 |
| `src/platforms/` | 平台伴侣 App |
| `docs/platforms/mac/canvas.md` | macOS Canvas 文档 |

## 总结

1. **Canvas 是 Agent 的画布** — Agent 可以渲染任意 HTML/SVG
2. **A2UI 自动构建 UI** — Agent 根据需求自动创建可视化界面
3. **实时双向通信** — Agent 更新 ↔ 用户交互
4. **伴侣 App 驱动** — macOS/iOS/Android 原生 App 提供 Canvas 环境
5. **轻量替代浏览器** — 对于自建 UI，Canvas 比浏览器自动化更高效
