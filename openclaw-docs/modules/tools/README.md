# Tools 模块文档

> OpenClaw 工具系统核心 —— 负责工具注册、描述、规划、执行与可用性评估

## 模块概览

`tools` 模块是 OpenClaw 平台的工具系统基石。它以**声明式**的方式定义工具的元数据、可用性条件和执行引用，并通过**纯函数**管道将工具描述符转化为可供 Agent Loop 使用的工具计划（Tool Plan）。

该模块位于 `src/tools/` 目录下，是 OpenClaw 架构中**零外部依赖**的核心模块之一——所有生产代码文件仅引用同目录下的兄弟模块和 Node.js 内置模块（`node:` 前缀），不依赖 OpenClaw 的其他子系统。

## 文档结构

| 文件 | 内容 | 关键词 |
|------|------|--------|
| [01-overview.md](./01-overview.md) | 功能定义与设计思想 | 声明式注册、可用性门控、安全第一、纯函数 |
| [02-lifecycle.md](./02-lifecycle.md) | 实现流程与数据流 | 注册 → 规划 → 协议转换 → Agent Loop |
| [03-capabilities.md](./03-capabilities.md) | 能力清单与对外接口 | 导出函数、类型定义、使用示例 |
| [04-policies.md](./04-policies.md) | 策略、配置与边界情况 | 可用性信号、安全策略、错误处理、边界测试 |

## 源码文件速查

```
src/tools/
├── index.ts          ← 入口/导出（公共 API 表面）
├── types.ts          ← 类型定义（3286 字节，所有核心类型）
├── descriptors.ts    ← 工具描述符定义（294 字节，两个身份函数）
├── planner.ts        ← 工具规划器（1763 字节，buildToolPlan）
├── availability.ts   ← 可用性评估引擎（5027 字节，最复杂的模块）
├── execution.ts      ← 执行器引用格式化（508 字节）
├── protocol.ts       ← 协议描述符转换（691 字节）
└── diagnostics.ts    ← 诊断与错误类型（446 字节）
```

## 快速开始

### 定义一个工具描述符

```typescript
import { defineToolDescriptor } from "./tools/index.js";

const myTool = defineToolDescriptor({
  name: "read-file",
  title: "读取文件",
  description: "读取指定路径的文件内容",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "文件路径" },
    },
    required: ["path"],
  },
  owner: { kind: "core" },
  executor: { kind: "core", executorId: "read-file" },
  availability: { kind: "always" },
});
```

### 构建工具计划

```typescript
import { buildToolPlan } from "./tools/index.js";

const plan = buildToolPlan({
  descriptors: [myTool, anotherTool],
  availability: {
    authProviderIds: new Set(["openai"]),
    env: { OPENAI_API_KEY: "sk-..." },
    enabledPluginIds: new Set(["web-tools"]),
  },
});

// plan.visible  → 可用工具列表（已排序，带执行器引用）
// plan.hidden   → 不可用工具列表（带诊断信息）
```

### 转换为协议描述符

```typescript
import { toToolProtocolDescriptors } from "./tools/index.js";

const protocolDescriptors = toToolProtocolDescriptors(plan.visible);
// → [{ name, description, inputSchema }]
```

## 核心设计原则

1. **声明式注册**：工具通过描述符（`ToolDescriptor`）声明自身，不执行副作用
2. **可用性门控**：工具通过 `availability` 表达式声明前置条件，不满足时自动隐藏而非报错
3. **安全第一**：凭据配置（`check: "available"`）必须通过注入的解析器验证，防止误判
4. **纯函数管道**：所有核心函数（`buildToolPlan`、`evaluateToolAvailability`）均为纯函数，无副作用
5. **确定性排序**：工具按 `sortKey ?? name` 字典序排列，保证计划输出的一致性
6. **协议分离**：协议描述符（`ToolProtocolDescriptor`）是完整描述符的子集，模型/提供商适配器负责 schema 归一化

## 相关模块

| 模块 | 关系 |
|------|------|
| Agent Loop | 消费 `ToolPlan.visible` 来调度工具执行 |
| Plugin System | 插件注册工具描述符，通过 `owner.kind: "plugin"` 归属 |
| Channel System | 渠道动作通过 `owner.kind: "channel"` 注册 |
| MCP Server | MCP 工具通过 `owner.kind: "mcp"` 注册 |
| Auth System | 提供 `authProviderIds` 用于可用性评估 |
| Config System | 提供配置数据用于 `config` 信号评估 |

## 测试覆盖

模块包含三个测试文件，覆盖核心功能和架构边界：

- `availability.test.ts` — 可用性信号评估（auth、env、config、plugin、context、anyOf、凭据安全）
- `planner.test.ts` — 工具计划构建（排序、重复名称、缺失执行器、协议转换）
- `boundary.test.ts` — 架构边界约束（无外部依赖、无运行时目录扫描）
