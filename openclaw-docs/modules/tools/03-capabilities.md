# tools — 能力清单与对外接口

## 公共 API 总览

工具系统模块通过 `index.ts` 统一导出所有公共 API。

## 一、工具描述符定义（descriptors.ts）

### defineToolDescriptor

```typescript
function defineToolDescriptor(descriptor: ToolDescriptor): ToolDescriptor
```

- **功能**：定义单个工具描述符（identity function，纯类型辅助）
- **参数**：完整的 `ToolDescriptor` 对象
- **返回**：原样返回，用于类型推断
- **用途**：在定义工具时获得 TypeScript 类型提示

```typescript
const myTool = defineToolDescriptor({
  name: "web_search",
  description: "Search the web using configured search provider",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" }
    },
    required: ["query"]
  },
  owner: { kind: "plugin", pluginId: "brave" },
  executor: { kind: "plugin", pluginId: "brave", toolName: "web_search" },
  availability: { kind: "env", name: "BRAVE_API_KEY" },
});
```

### defineToolDescriptors

```typescript
function defineToolDescriptors(
  descriptors: readonly ToolDescriptor[]
): readonly ToolDescriptor[]
```

- **功能**：批量定义多个工具描述符
- **参数**：工具描述符数组
- **返回**：原样返回数组

## 二、工具可用性评估（availability.ts）

### evaluateToolAvailability

```typescript
function evaluateToolAvailability(params: {
  descriptor: ToolDescriptor;
  context?: ToolAvailabilityContext;
}): readonly ToolAvailabilityDiagnostic[]
```

- **功能**：评估单个工具在给定上下文下是否可用
- **返回**：诊断信息数组。空数组 = 可用；非空 = 不可用（每个元素描述一个未满足的条件）
- **评估逻辑**：
  1. 如果工具没有声明 `availability`，默认为 `{ kind: "always" }`（始终可用）
  2. 根据信号类型检查上下文：
     - `"always"` → 始终返回空数组（可用）
     - `"auth"` → 检查 `context.authProviderIds` 是否包含指定 provider
     - `"config"` → 检查 `context.config` 中指定路径是否有值
     - `"env"` → 检查 `context.env` 中指定环境变量是否存在且非空
     - `"plugin-enabled"` → 检查 `context.enabledPluginIds` 是否包含指定 plugin
     - `"context"` → 检查 `context.values` 中指定 key 的值
  3. 复合表达式：
     - `allOf` → 所有子表达式都必须通过（AND 逻辑）
     - `anyOf` → 任一子表达式通过即可（OR 逻辑）

### 内部函数（不导出，但理解很重要）

#### evaluateSignal

```typescript
function evaluateSignal(
  signal: ToolAvailabilitySignal,
  context: ToolAvailabilityContext,
): ToolAvailabilityDiagnostic | null
```

逐信号类型评估，返回 `null` 表示通过，返回诊断信息表示不满足。

#### evaluateExpression

```typescript
function evaluateExpression(
  expression: ToolAvailabilityExpression,
  context: ToolAvailabilityContext,
): readonly ToolAvailabilityDiagnostic[]
```

递归评估嵌套的 `allOf`/`anyOf` 表达式。

#### resolveConfigPath

```typescript
function resolveConfigPath(
  config: JsonObject | undefined,
  path: readonly string[],
): JsonValue | undefined
```

沿路径在配置对象中查找值，如 `["channels", "telegram", "token"]` → `config.channels.telegram.token`。

## 三、工具规划器（planner.ts）

### buildToolPlan

```typescript
function buildToolPlan(options: BuildToolPlanOptions): ToolPlan
```

- **功能**：构建工具执行计划——决定哪些工具对 LLM 可见，哪些被隐藏
- **参数**：
  - `descriptors` — 所有已注册的工具描述符
  - `availability` — 当前的可用性上下文
- **返回**：`ToolPlan` 对象
  - `visible` — 可用工具列表（`ToolPlanEntry[]`），包含描述符和执行器引用
  - `hidden` — 不可用工具列表（`HiddenToolPlanEntry[]`），包含描述符和诊断原因
- **执行流程**：
  1. 按 `sortKey`（或 `name`）排序所有描述符
  2. 检查工具名称唯一性（`assertUniqueNames`，重复则抛 `ToolPlanContractError`）
  3. 对每个工具调用 `evaluateToolAvailability()`
  4. 诊断为空 → 加入 `visible`（同时检查 executor 是否存在）
  5. 诊断非空 → 加入 `hidden`
- **错误**：
  - `duplicate-tool-name` — 工具名称重复
  - `missing-executor` — 可见工具缺少 executor 引用

### assertUniqueNames（内部函数）

```typescript
function assertUniqueNames(descriptors: readonly ToolDescriptor[]): void
```

检查所有工具名称是否唯一，重复时抛出 `ToolPlanContractError`。

### compareDescriptors（内部函数）

```typescript
function compareDescriptors(left: ToolDescriptor, right: ToolDescriptor): number
```

排序比较器：先按 `sortKey`（或 `name`）排序，再按 `name` 排序。

## 四、工具执行格式化（execution.ts）

### formatToolExecutorRef

```typescript
function formatToolExecutorRef(ref: ToolExecutorRef): string
```

- **功能**：将执行器引用格式化为人类可读的字符串
- **格式**：
  - `core:exec` — 核心执行器
  - `plugin:brave:web_search` — 插件工具
  - `channel:telegram:send_message` — 渠道动作
  - `mcp:filesystem:read_file` — MCP 工具

## 五、诊断错误（diagnostics.ts）

### ToolPlanContractError

```typescript
class ToolPlanContractError extends Error {
  code: string;
  toolName: string;
}
```

- **功能**：工具规划过程中的契约违反错误
- **错误码**：
  - `duplicate-tool-name` — 工具名称重复
  - `missing-executor` — 可见工具缺少 executor

## 六、核心类型（types.ts）

### 基础 JSON 类型

```typescript
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };
type JsonObject = { readonly [key: string]: JsonValue };
```

### 工具归属引用（ToolOwnerRef）

```typescript
type ToolOwnerRef =
  | { readonly kind: "core" }                                        // 核心内置工具
  | { readonly kind: "plugin"; readonly pluginId: string }           // 插件提供
  | { readonly kind: "channel"; readonly channelId: string }         // 渠道提供
  | { readonly kind: "mcp"; readonly serverId: string };             // MCP 服务器提供
```

### 工具执行器引用（ToolExecutorRef）

```typescript
type ToolExecutorRef =
  | { readonly kind: "core"; readonly executorId: string }                        // 核心执行器
  | { readonly kind: "plugin"; readonly pluginId: string; readonly toolName: string }  // 插件执行
  | { readonly kind: "channel"; readonly channelId: string; readonly actionId: string } // 渠道动作
  | { readonly kind: "mcp"; readonly serverId: string; readonly toolName: string };    // MCP 执行
```

### 工具可用性信号（ToolAvailabilitySignal）

| 信号类型 | 含义 | 检查逻辑 |
|----------|------|----------|
| `always` | 始终可用 | 直接通过 |
| `auth` | 需要特定 Provider 认证 | 检查 `authProviderIds` Set |
| `config` | 需要特定配置项 | 沿 path 查找配置值 |
| `env` | 需要环境变量 | 检查 `env[name]` 是否非空 |
| `plugin-enabled` | 需要插件启用 | 检查 `enabledPluginIds` Set |
| `context` | 需要上下文值匹配 | 检查 `values[key]` |

### 工具可用性表达式（ToolAvailabilityExpression）

```typescript
type ToolAvailabilityExpression =
  | ToolAvailabilitySignal                                    // 单个信号
  | { readonly allOf: readonly ToolAvailabilityExpression[] }  // AND 逻辑
  | { readonly anyOf: readonly ToolAvailabilityExpression[] }; // OR 逻辑
```

### 工具描述符（ToolDescriptor）

```typescript
type ToolDescriptor = {
  readonly name: string;                        // 唯一标识
  readonly title?: string;                      // 显示标题
  readonly description: string;                 // 功能描述（给 LLM 看）
  readonly inputSchema: JsonObject;             // JSON Schema 格式的参数定义
  readonly outputSchema?: JsonObject;           // JSON Schema 格式的输出定义
  readonly owner: ToolOwnerRef;                 // 归属
  readonly executor?: ToolExecutorRef;          // 执行器
  readonly availability?: ToolAvailabilityExpression; // 可用性条件
  readonly annotations?: JsonObject;            // 额外注解
  readonly sortKey?: string;                    // 排序键
};
```

### 工具执行计划（ToolPlan）

```typescript
type ToolPlan = {
  readonly visible: readonly ToolPlanEntry[];        // 可用工具
  readonly hidden: readonly HiddenToolPlanEntry[];   // 不可用工具（含诊断原因）
};

type ToolPlanEntry = {
  readonly descriptor: ToolDescriptor;
  readonly executor: ToolExecutorRef;
};

type HiddenToolPlanEntry = {
  readonly descriptor: ToolDescriptor;
  readonly diagnostics: readonly ToolAvailabilityDiagnostic[];
};
```

### 可用性上下文（ToolAvailabilityContext）

```typescript
type ToolAvailabilityContext = {
  readonly authProviderIds?: ReadonlySet<string>;      // 已认证的 Provider ID 集合
  readonly config?: JsonObject;                        // 配置对象
  readonly isConfigValueAvailable?: (params) => boolean; // 自定义配置值检查
  readonly env?: Readonly<Record<string, string | undefined>>; // 环境变量
  readonly enabledPluginIds?: ReadonlySet<string>;     // 已启用的插件 ID 集合
  readonly values?: Readonly<Record<string, JsonPrimitive | undefined>>; // 上下文值
};
```

### 可用性诊断（ToolAvailabilityDiagnostic）

```typescript
type ToolAvailabilityDiagnostic = {
  readonly reason: ToolUnavailableReason;  // 不可用原因
  readonly signal?: ToolAvailabilitySignal; // 触发的信号
  readonly message: string;                 // 人类可读描述
};

type ToolUnavailableReason =
  | "auth-missing"        // 缺少认证
  | "config-missing"      // 缺少配置
  | "context-mismatch"    // 上下文不匹配
  | "env-missing"         // 缺少环境变量
  | "plugin-disabled"     // 插件未启用
  | "unsupported-signal"; // 不支持的信号类型
```

## 七、使用场景示例

### 场景 1：定义一个需要 API Key 的工具

```typescript
const webSearchTool = defineToolDescriptor({
  name: "web_search",
  description: "Search the web for current info",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" }
    },
    required: ["query"]
  },
  owner: { kind: "plugin", pluginId: "brave" },
  executor: { kind: "plugin", pluginId: "brave", toolName: "search" },
  availability: { kind: "env", name: "BRAVE_API_KEY" },
});
```

### 场景 2：复合可用性条件

```typescript
availability: {
  allOf: [
    { kind: "env", name: "BRAVE_API_KEY" },
    { kind: "plugin-enabled", pluginId: "brave" },
    { kind: "config", path: ["tools", "webSearch", "enabled"], check: "exists" }
  ]
}
```

### 场景 3：OR 条件（多种认证方式）

```typescript
availability: {
  anyOf: [
    { kind: "env", name: "OPENAI_API_KEY" },
    { kind: "auth", providerId: "openai" }
  ]
}
```

### 场景 4：构建工具计划

```typescript
const plan = buildToolPlan({
  descriptors: allToolDescriptors,
  availability: {
    authProviderIds: new Set(["anthropic", "openai"]),
    config: currentConfig,
    env: process.env,
    enabledPluginIds: new Set(["brave", "browser"]),
  },
});

console.log(`Visible tools: ${plan.visible.length}`);
console.log(`Hidden tools: ${plan.hidden.length}`);
for (const hidden of plan.hidden) {
  console.log(`  ${hidden.descriptor.name}: ${hidden.diagnostics.map(d => d.message).join(", ")}`);
}
```
