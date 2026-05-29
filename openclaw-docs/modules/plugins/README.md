# plugins — 插件系统

> 334 文件，81789 行。OpenClaw 的插件管理系统。
> 支持插件的发现、安装、加载、生命周期管理和能力注册。

## 子模块

| 子目录 | 说明 |
|--------|------|
| `runtime/` | 插件运行时（加载、初始化、生命周期） |
| `contracts/` | 插件契约（API 接口定义） |
| `compat/` | 兼容性 |
| `capability-runtime-vitest-shims/` | Vitest 测试 Shim |
| `test-helpers/` | 测试辅助 |

## 核心概念

### 插件类型

| 类型 | 说明 |
|------|------|
| 渠道插件 | 添加消息渠道（Telegram/Discord 等） |
| Provider 插件 | 添加 AI 模型 Provider |
| 工具插件 | 添加 Agent 工具 |
| 能力插件 | 添加其他能力（记忆、搜索等） |

### 插件生命周期

```
发现 → 安装 → 加载 → 初始化 → 运行 → 卸载
```

### 插件 API

插件通过 `api` 对象与 OpenClaw 交互：

```typescript
export default function (api: PluginApi) {
  api.registerTool(myTool);
  api.registerChannel(myChannel);
  api.registerProvider(myProvider);
}
```
