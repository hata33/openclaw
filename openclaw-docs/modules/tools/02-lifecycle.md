# Tools 模块 — 实现流程与数据流

> 工具注册 → 规划 → 协议转换 → 结果返回 Agent Loop

本文档详细描述工具从定义到被 Agent 消费的完整生命周期，包括每一步的数据变换、函数调用和错误处理路径。

## 1. 生命周期总览

工具的生命周期可以分为四个阶段：

```
         Phase 1              Phase 2              Phase 3              Phase 4
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │   定义阶段    │    │   规划阶段    │    │   转换阶段    │    │   消费阶段    │
    │              │    │              │    │              │    │              │
    │ ToolDescriptor│──▶│  ToolPlan    │──▶│ ToolProtocol │──▶│  Agent Loop  │
    │  (声明式)    │    │ (visible +   │    │ Descriptor[] │    │  (调度执行)  │
    │              │    │   hidden)    │    │ (精简子集)   │    │              │
    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
    defineToolDescriptor  buildToolPlan      toToolProtocol      模型适配器
                                            Descriptors         消费并调用
```

### 完整数据流

```typescript
// 阶段 1: 定义
const descriptors = defineToolDescriptors([
  { name: "read", /* ... */ },
  { name: "exec", /* ... */ },
  { name: "browser", /* ... */ },
]);

// 阶段 2: 规划
const plan = buildToolPlan({
  descriptors,
  availability: { authProviderIds, env, config, enabledPluginIds, values },
});

// 阶段 3: 协议转换
const protocolDescriptors = toToolProtocolDescriptors(plan.visible);

// 阶段 4: 消费（由 Agent Loop 和模型适配器完成）
// modelAdapter.sendTools(protocolDescriptors)
// agentLoop.executeTool(plan.visible[n].executor, args)
```

## 2. 阶段一：工具定义

### 2.1 描述符创建

工具通过 `defineToolDescriptor` 或 `defineToolDescriptors` 创建描述符。这两个函数是**身份函数**，不修改输入：

```typescript
// descriptors.ts
export function defineToolDescriptor(descriptor: ToolDescriptor): ToolDescriptor {
  return descriptor;
}

export function defineToolDescriptors(
  descriptors: readonly ToolDescriptor[],
): readonly ToolDescriptor[] {
  return descriptors;
}
```

它们的价值在于**类型安全**——TypeScript 编译器会验证描述符是否符合 `ToolDescriptor` 类型。

### 2.2 描述符的组成

一个完整的 `ToolDescriptor` 包含以下字段：

```typescript
// types.ts
export type ToolDescriptor = {
  readonly name: string;                        // 唯一标识符，在所有工具中必须唯一
  readonly title?: string;                      // 人类可读标题，用于 UI 展示
  readonly description: string;                 // 功能描述，供 LLM 理解工具用途
  readonly inputSchema: JsonObject;             // 输入参数的 JSON Schema
  readonly outputSchema?: JsonObject;           // 输出的 JSON Schema（可选）
  readonly owner: ToolOwnerRef;                 // 归属信息（core/plugin/channel/mcp）
  readonly executor?: ToolExecutorRef;          // 执行器引用（不可用时可省略）
  readonly availability?: ToolAvailabilityExpression; // 可用性条件
  readonly annotations?: JsonObject;            // 附加元数据
  readonly sortKey?: string;                    // 排序键（可选，影响计划中的顺序）
};
```

#### 名称唯一性约束

`buildToolPlan` 在规划阶段会检查名称唯一性：

```typescript
// planner.ts
function assertUniqueNames(descriptors: readonly ToolDescriptor[]): void {
  const seen = new Set<string>();
  for (const descriptor of descriptors) {
    if (seen.has(descriptor.name)) {
      throw new ToolPlanContractError({
        code: "duplicate-tool-name",
        toolName: descriptor.name,
        message: `Duplicate tool descriptor name: ${descriptor.name}`,
      });
    }
    seen.add(descriptor.name);
  }
}
```

如果存在重复名称，会抛出 `ToolPlanContractError`（错误码 `"duplicate-tool-name"`），这是一个**编译时安全网**——在开发阶段就能发现问题。

### 2.3 归属与执行器

工具的归属（`ToolOwnerRef`）和执行器（`ToolExecutorRef`）是两个独立的概念：

**归属**（`owner`）描述工具"属于谁"：

```typescript
export type ToolOwnerRef =
  | { readonly kind: "core" }                                           // 核心系统
  | { readonly kind: "plugin"; readonly pluginId: string }              // 插件
  | { readonly kind: "channel"; readonly channelId: string; readonly pluginId?: string } // 渠道
  | { readonly kind: "mcp"; readonly serverId: string };               // MCP 服务器
```

**执行器**（`executor`）描述工具"如何执行"：

```typescript
export type ToolExecutorRef =
  | { readonly kind: "core"; readonly executorId: string }                           // 核心执行器
  | { readonly kind: "plugin"; readonly pluginId: string; readonly toolName: string } // 插件工具
  | { readonly kind: "channel"; readonly channelId: string; readonly actionId: string } // 渠道动作
  | { readonly kind: "mcp"; readonly serverId: string; readonly toolName: string };   // MCP 工具
```

执行器引用可以格式化为字符串表示：

```typescript
// execution.ts
export function formatToolExecutorRef(ref: ToolExecutorRef): string {
  switch (ref.kind) {
    case "core":
      return `core:${ref.executorId}`;
    case "plugin":
      return `plugin:${ref.pluginId}:${ref.toolName}`;
    case "channel":
      return `channel:${ref.channelId}:${ref.actionId}`;
    case "mcp":
      return `mcp:${ref.serverId}:${ref.toolName}`;
    default: {
      const exhaustive: never = ref;
      return exhaustive;
    }
  }
}
```

格式示例：
- `core:read` — 核心执行器
- `plugin:web-tools:search` — 插件工具
- `channel:telegram:send-message` — 渠道动作
- `mcp:filesystem:read-file` — MCP 工具

### 2.4 可用性表达式

工具可以声明前置条件（`availability`），在规划阶段用于判断工具是否可用：

```typescript
export type ToolAvailabilitySignal =
  | { readonly kind: "always" }                                              // 始终可用
  | { readonly kind: "auth"; readonly providerId: string }                   // 需要认证
  | { readonly kind: "config"; readonly path: readonly string[]; readonly check?: "exists" | "non-empty" | "available" } // 需要配置
  | { readonly kind: "env"; readonly name: string }                          // 需要环境变量
  | { readonly kind: "plugin-enabled"; readonly pluginId: string }           // 需要插件启用
  | { readonly kind: "context"; readonly key: string; readonly equals?: JsonPrimitive }; // 需要上下文值

export type ToolAvailabilityExpression =
  | ToolAvailabilitySignal
  | { readonly allOf: readonly ToolAvailabilityExpression[] }  // 逻辑与
  | { readonly anyOf: readonly ToolAvailabilityExpression[] }; // 逻辑或
```

如果不指定 `availability`，默认为 `{ kind: "always" }`（始终可用）。

## 3. 阶段二：工具规划

### 3.1 buildToolPlan 函数

`buildToolPlan` 是工具系统的核心入口函数。它接收一组描述符和可选的可用性上下文，返回一个工具计划：

```typescript
// planner.ts
export function buildToolPlan(options: BuildToolPlanOptions): ToolPlan {
  // 1. 排序
  const descriptors = options.descriptors.toSorted(compareDescriptors);
  // 2. 唯一性检查
  assertUniqueNames(descriptors);

  const visible: ToolPlanEntry[] = [];
  const hidden: HiddenToolPlanEntry[] = [];

  // 3. 逐个评估可用性
  for (const descriptor of descriptors) {
    const diagnostics = [
      ...evaluateToolAvailability({ descriptor, context: options.availability }),
    ];
    if (diagnostics.length > 0) {
      // 3a. 不可用 → 隐藏
      hidden.push({ descriptor, diagnostics });
      continue;
    }
    // 3b. 可用 → 验证执行器
    if (!descriptor.executor) {
      throw new ToolPlanContractError({
        code: "missing-executor",
        toolName: descriptor.name,
        message: `Visible tool descriptor has no executor ref: ${descriptor.name}`,
      });
    }
    // 3c. 可用 → 加入可见列表
    visible.push({ descriptor, executor: descriptor.executor });
  }

  return { visible, hidden };
}
```

### 3.2 排序逻辑

在评估可用性之前，描述符先经过排序：

```typescript
function compareDescriptors(left: ToolDescriptor, right: ToolDescriptor): number {
  return (
    (left.sortKey ?? left.name).localeCompare(right.sortKey ?? right.name) ||
    left.name.localeCompare(right.name)
  );
}
```

排序使用 `Array.prototype.toSorted()`（ES2023），返回新数组，不修改原数组。排序规则：

1. **主排序键**：`sortKey ?? name`，使用 `localeCompare` 进行字典序比较
2. **次排序键**：当主排序键相同时，使用 `name` 作为兜底

### 3.3 可用性评估

对于每个描述符，`evaluateToolAvailability` 递归评估其 `availability` 表达式：

```typescript
// availability.ts
export function evaluateToolAvailability(params: {
  descriptor: ToolDescriptor;
  context?: ToolAvailabilityContext;
}): readonly ToolAvailabilityDiagnostic[] {
  const context = params.context ?? {};
  const availability = params.descriptor.availability ?? { kind: "always" };
  if (!hasAvailabilityExpressionShape(availability)) {
    return [{ reason: "unsupported-signal", message: "Unsupported availability expression" }];
  }
  return evaluateExpression(availability, context);
}
```

评估逻辑通过 `evaluateExpression` 递归展开：

```typescript
function evaluateExpression(
  expression: ToolAvailabilityExpression,
  context: ToolAvailabilityContext,
): readonly ToolAvailabilityDiagnostic[] {
  // 单一信号 → 直接评估
  if ("kind" in expression) {
    const diagnostic = evaluateSignal(expression, context);
    return diagnostic ? [diagnostic] : [];
  }
  // allOf → 所有子表达式都要通过（收集全部诊断）
  if ("allOf" in expression) {
    if (expression.allOf.length === 0) {
      return [{ reason: "unsupported-signal", message: "Empty availability allOf group" }];
    }
    return expression.allOf.flatMap((entry) => evaluateExpression(entry, context));
  }
  // anyOf → 任一子表达式通过即可（有一个通过就返回空）
  if ("anyOf" in expression) {
    if (expression.anyOf.length === 0) {
      return [{ reason: "unsupported-signal", message: "Empty availability anyOf group" }];
    }
    const diagnostics = expression.anyOf.map((entry) => evaluateExpression(entry, context));
    return diagnostics.some((entries) => entries.length === 0) ? [] : diagnostics.flat();
  }
  return [{ reason: "unsupported-signal", message: "Unsupported availability expression" }];
}
```

**关键行为差异**：
- `allOf`：收集**所有**子表达式的诊断信息（即使有多个失败）
- `anyOf`：只要有一个子表达式通过，就返回空诊断（工具可用）

### 3.4 信号评估

每种信号类型的评估逻辑在 `evaluateSignal` 中实现：

```typescript
function evaluateSignal(
  signal: ToolAvailabilitySignal,
  context: ToolAvailabilityContext,
): ToolAvailabilityDiagnostic | null {
  switch (signal.kind) {
    case "always":
      return null; // 始终通过

    case "auth":
      return context.authProviderIds?.has(signal.providerId)
        ? null
        : diagnostic("auth-missing", signal, `Missing auth provider: ${signal.providerId}`);

    case "config": {
      const value = resolveConfigPath(context.config, signal.path);
      return hasConfiguredValue({ value, signal, context })
        ? null
        : diagnostic("config-missing", signal, `Missing config path: ${signal.path.join(".")}`);
    }

    case "env":
      return context.env?.[signal.name]?.trim()
        ? null
        : diagnostic("env-missing", signal, `Missing environment value: ${signal.name}`);

    case "plugin-enabled":
      return context.enabledPluginIds?.has(signal.pluginId)
        ? null
        : diagnostic("plugin-disabled", signal, `Plugin is not enabled: ${signal.pluginId}`);

    case "context": {
      const value: JsonPrimitive | undefined = context.values?.[signal.key];
      if (!("equals" in signal)) {
        return value === undefined
          ? diagnostic("context-mismatch", signal, `Missing context value: ${signal.key}`)
          : null;
      }
      return value === signal.equals
        ? null
        : diagnostic("context-mismatch", signal, `Context value did not match: ${signal.key}`);
    }

    default:
      return diagnostic("unsupported-signal", signal, "Unsupported availability signal");
  }
}
```

返回 `null` 表示信号通过（工具可用），返回 `ToolAvailabilityDiagnostic` 表示信号未通过。

### 3.5 配置路径解析

`config` 信号需要解析嵌套的配置路径：

```typescript
function resolveConfigPath(
  config: JsonObject | undefined,
  path: readonly string[],
): JsonValue | undefined {
  let current: JsonValue | undefined = config;
  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}
```

例如 `path: ["plugins", "entries", "demo", "config"]` 会依次访问 `config.plugins.entries.demo.config`。

### 3.6 配置值验证

`hasConfiguredValue` 函数根据 `check` 参数验证配置值：

```typescript
function hasConfiguredValue(params: {
  value: JsonValue | undefined;
  signal: Extract<ToolAvailabilitySignal, { readonly kind: "config" }>;
  context: ToolAvailabilityContext;
}): boolean {
  const { value, signal } = params;
  if (value === undefined || value === null) {
    return false;
  }
  if ((signal.check ?? "exists") === "available") {
    // "available" 模式：必须通过外部注入的解析器
    return (
      params.context.isConfigValueAvailable?.({
        value,
        path: signal.path,
        signal,
      }) === true
    );
  }
  if ((signal.check ?? "exists") === "exists") {
    // "exists" 模式：值存在即可
    return true;
  }
  // "non-empty" 模式：值存在且非空
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }
  return true;
}
```

三种 `check` 模式：

| 模式 | 含义 | 使用场景 |
|------|------|----------|
| `"exists"`（默认） | 值存在即可 | 一般配置项 |
| `"non-empty"` | 值存在且非空 | 需要有实际内容的配置 |
| `"available"` | 通过外部解析器验证 | 凭据配置（API Key 等） |

### 3.7 规划结果

`buildToolPlan` 返回 `ToolPlan`：

```typescript
export type ToolPlan = {
  readonly visible: readonly ToolPlanEntry[];   // 可用工具
  readonly hidden: readonly HiddenToolPlanEntry[]; // 不可用工具（附带诊断）
};

export type ToolPlanEntry = {
  readonly descriptor: ToolDescriptor;  // 完整描述符
  readonly executor: ToolExecutorRef;   // 执行器引用（已验证存在）
};

export type HiddenToolPlanEntry = {
  readonly descriptor: ToolDescriptor;  // 完整描述符
  readonly diagnostics: readonly ToolAvailabilityDiagnostic[]; // 不可用原因
};
```

**重要约束**：
- `visible` 中的每个条目都**保证有** `executor`（`buildToolPlan` 会抛出异常如果没有）
- `hidden` 中的每个条目都**至少有一条**诊断信息
- 两个列表都是**确定性排序**的

## 4. 阶段三：协议转换

### 4.1 ToolProtocolDescriptor

协议描述符是完整描述符的精简子集，仅供模型/提供商使用：

```typescript
// protocol.ts
export type ToolProtocolDescriptor = {
  readonly name: string;           // 工具名称
  readonly description: string;    // 功能描述
  readonly inputSchema: JsonObject; // 输入 JSON Schema
};
```

### 4.2 转换函数

```typescript
export function toToolProtocolDescriptor(entry: ToolPlanEntry): ToolProtocolDescriptor {
  return {
    name: entry.descriptor.name,
    description: entry.descriptor.description,
    inputSchema: entry.descriptor.inputSchema,
  };
}

export function toToolProtocolDescriptors(
  entries: readonly ToolPlanEntry[],
): readonly ToolProtocolDescriptor[] {
  return entries.map(toToolProtocolDescriptor);
}
```

转换是**单向的、有损的**——从 `ToolPlanEntry` 到 `ToolProtocolDescriptor`，丢失了以下信息：
- `owner`（归属信息）
- `executor`（执行器引用）
- `outputSchema`（输出 Schema）
- `availability`（可用性条件）
- `annotations`（附加元数据）
- `sortKey`（排序键）
- `title`（人类可读标题）

这种信息丢失是**有意为之**的——模型提供商不需要知道工具的内部实现细节。

### 4.3 协议分离的意义

```
┌─────────────────────────────────────────┐
│           ToolDescriptor                │
│  (完整元数据，供内部使用)                 │
│  name, description, inputSchema,        │
│  outputSchema, owner, executor,         │
│  availability, annotations, sortKey     │
└────────────────┬────────────────────────┘
                 │ toToolProtocolDescriptor()
                 ▼
┌─────────────────────────────────────────┐
│       ToolProtocolDescriptor            │
│  (精简子集，供模型使用)                   │
│  name, description, inputSchema         │
└─────────────────────────────────────────┘
```

- 模型适配器负责 schema 归一化（如将 JSON Schema 转换为特定模型的格式）
- 工具系统只提供原始的、未经处理的 schema
- 职责边界清晰：工具系统不关心模型的具体需求

## 5. 阶段四：Agent Loop 消费

### 5.1 消费 ToolPlan.visible

Agent Loop 使用 `plan.visible` 来：

1. **构建工具列表**：将 `ToolProtocolDescriptor[]` 发送给模型
2. **执行工具调用**：当模型返回工具调用请求时，使用 `ToolPlanEntry.executor` 定位执行器
3. **格式化执行器引用**：使用 `formatToolExecutorRef` 生成人类可读的执行器标识

```typescript
// 概念性示例（非实际代码）
const plan = buildToolPlan({ descriptors, availability });

// 发送给模型
const tools = toToolProtocolDescriptors(plan.visible);
await model.send({ messages, tools });

// 处理工具调用
for (const toolCall of response.toolCalls) {
  const entry = plan.visible.find((e) => e.descriptor.name === toolCall.name);
  if (entry) {
    const ref = formatToolExecutorRef(entry.executor);
    // → "core:read" 或 "plugin:web-tools:search"
    const result = await executeTool(entry.executor, toolCall.arguments);
  }
}
```

### 5.2 消费 ToolPlan.hidden

`plan.hidden` 用于诊断和用户提示：

```typescript
// 概念性示例
for (const hidden of plan.hidden) {
  console.log(`工具 "${hidden.descriptor.name}" 不可用:`);
  for (const diag of hidden.diagnostics) {
    console.log(`  - ${diag.reason}: ${diag.message}`);
  }
}
// 输出示例：
// 工具 "web-search" 不可用:
//   - auth-missing: Missing auth provider: brave
// 工具 "telegram-send" 不可用:
//   - plugin-disabled: Plugin is not enabled: telegram
```

## 6. 错误处理路径

### 6.1 ToolPlanContractError

`buildToolPlan` 可能抛出 `ToolPlanContractError`：

```typescript
// diagnostics.ts
export class ToolPlanContractError extends Error {
  readonly code: ToolPlanContractErrorCode;
  readonly toolName: string;

  constructor(params: { code: ToolPlanContractErrorCode; toolName: string; message: string }) {
    super(params.message);
    this.name = "ToolPlanContractError";
    this.code = params.code;
    this.toolName = params.toolName;
  }
}
```

两种错误码：

| 错误码 | 触发条件 | 含义 |
|--------|----------|------|
| `"duplicate-tool-name"` | 两个描述符有相同的 `name` | 注册时的编程错误 |
| `"missing-executor"` | 可见工具没有 `executor` | 注册时的编程错误 |

### 6.2 错误处理策略

这两种错误都是**编程错误**（programming errors），不是运行时错误。它们应该在开发阶段被捕获，而不是在生产环境中处理。

```typescript
// 测试中的验证
it("fails deterministically on duplicate tool names", () => {
  expect(() =>
    buildToolPlan({
      descriptors: [descriptor("read"), descriptor("read")],
    }),
  ).toThrow(ToolPlanContractError);
});

it("fails closed when a visible descriptor has no executor", () => {
  expect(() =>
    buildToolPlan({
      descriptors: [descriptor("read", { executor: undefined })],
    }),
  ).toThrow(ToolPlanContractError);
});
```

### 6.3 不可用工具不抛异常

值得注意的是：**不可用的工具不要求有执行器**。`buildToolPlan` 只对**可见**工具检查执行器：

```typescript
// planner.ts
if (diagnostics.length > 0) {
  hidden.push({ descriptor, diagnostics });  // 不可用 → 不检查 executor
  continue;
}
if (!descriptor.executor) {
  throw new ToolPlanContractError(/* ... */);  // 可用但没 executor → 报错
}
```

测试验证了这一点：

```typescript
it("does not require an executor for unavailable descriptors", () => {
  const plan = buildToolPlan({
    descriptors: [
      descriptor("plugin_tool", {
        executor: undefined,
        availability: { kind: "plugin-enabled", pluginId: "demo" },
      }),
    ],
    availability: { enabledPluginIds: new Set() },
  });

  expect(plan.visible).toStrictEqual([]);
  expect(plan.hidden[0].descriptor.name).toBe("plugin_tool");
});
```

## 7. 完整示例：从定义到消费

以下是一个完整的端到端示例，展示工具从定义到被消费的全过程：

```typescript
import {
  defineToolDescriptors,
  buildToolPlan,
  toToolProtocolDescriptors,
  formatToolExecutorRef,
} from "./tools/index.js";

// 阶段 1: 定义工具
const tools = defineToolDescriptors([
  {
    name: "read",
    title: "读取文件",
    description: "Read the contents of a file at the given path",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
    owner: { kind: "core" },
    executor: { kind: "core", executorId: "read" },
    availability: { kind: "always" },
    sortKey: "01-read",
  },
  {
    name: "web-search",
    title: "网页搜索",
    description: "Search the web using the configured provider",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    owner: { kind: "plugin", pluginId: "web-tools" },
    executor: { kind: "plugin", pluginId: "web-tools", toolName: "search" },
    availability: {
      allOf: [
        { kind: "auth", providerId: "brave" },
        { kind: "plugin-enabled", pluginId: "web-tools" },
      ],
    },
  },
  {
    name: "telegram-send",
    title: "发送 Telegram 消息",
    description: "Send a message via Telegram",
    inputSchema: { type: "object" },
    owner: { kind: "channel", channelId: "telegram" },
    executor: { kind: "channel", channelId: "telegram", actionId: "send-message" },
    availability: {
      allOf: [
        { kind: "plugin-enabled", pluginId: "telegram" },
        { kind: "context", key: "channel", equals: "telegram" },
      ],
    },
  },
]);

// 阶段 2: 构建计划
const plan = buildToolPlan({
  descriptors: tools,
  availability: {
    authProviderIds: new Set(["brave"]),
    env: {},
    enabledPluginIds: new Set(["web-tools", "telegram"]),
    values: { channel: "telegram" },
  },
});

// plan.visible = [
//   { descriptor: { name: "read", ... }, executor: { kind: "core", executorId: "read" } },
//   { descriptor: { name: "telegram-send", ... }, executor: { kind: "channel", ... } },
//   { descriptor: { name: "web-search", ... }, executor: { kind: "plugin", ... } },
// ]
// (按 sortKey ?? name 排序)

// 阶段 3: 协议转换
const protocolTools = toToolProtocolDescriptors(plan.visible);
// protocolTools = [
//   { name: "read", description: "Read the contents...", inputSchema: { ... } },
//   { name: "telegram-send", description: "Send a message...", inputSchema: { ... } },
//   { name: "web-search", description: "Search the web...", inputSchema: { ... } },
// ]

// 阶段 4: 消费
for (const entry of plan.visible) {
  const ref = formatToolExecutorRef(entry.executor);
  // "core:read"
  // "channel:telegram:send-message"
  // "plugin:web-tools:search"
}
```

## 8. 性能考量

### 8.1 排序开销

`Array.prototype.toSorted()` 创建新数组，时间复杂度 O(n log n)。对于典型的工具数量（几十到几百个），开销可以忽略。

### 8.2 可用性评估

`evaluateToolAvailability` 对每个描述符执行一次，内部递归评估表达式树。对于 `allOf`/`anyOf` 嵌套的表达式，评估是深度优先的。实际中表达式嵌套层级很浅（通常 1-2 层），评估开销极小。

### 8.3 纯函数的优化空间

由于所有核心函数都是纯函数，它们天然支持：
- **记忆化**：相同的输入总是产生相同的输出，可以缓存结果
- **并行化**：没有共享状态，可以并行评估多个工具
- **懒评估**：`anyOf` 可以短路求值（第一个通过就停止）

当前实现使用**急切求值**（eager evaluation），但 `anyOf` 的语义已经包含了短路优化的空间。
