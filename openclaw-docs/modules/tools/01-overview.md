# Tools 模块 — 功能定义与设计思想

> 工具系统解决什么问题？声明式注册、可用性门控、安全第一

## 1. 问题域：为什么需要一个工具系统？

OpenClaw 是一个支持 25+ 消息渠道、多模型提供商、插件化架构的个人 AI 助手平台。在这样的系统中，工具（Tool）是 Agent 与外部世界交互的桥梁——读文件、发消息、调 API、操作浏览器，都通过工具完成。

一个健壮的工具系统需要解决以下核心问题：

### 1.1 工具来源的多样性

OpenClaw 的工具来自四个不同的来源：

| 来源 | `ToolOwnerRef.kind` | 示例 |
|------|---------------------|------|
| 核心系统 | `"core"` | `read`、`exec`、`web_search` |
| 插件 | `"plugin"` | 通过 `pluginId` 标识 |
| 消息渠道 | `"channel"` | 通过 `channelId` + `actionId` 标识 |
| MCP 服务器 | `"mcp"` | 通过 `serverId` + `toolName` 标识 |

```typescript
// types.ts - ToolOwnerRef 的四种形态
export type ToolOwnerRef =
  | { readonly kind: "core" }
  | { readonly kind: "plugin"; readonly pluginId: string }
  | { readonly kind: "channel"; readonly channelId: string; readonly pluginId?: string }
  | { readonly kind: "mcp"; readonly serverId: string };
```

这些来源的工具需要在统一的框架下注册、评估和调度，同时保持各自的归属清晰。

### 1.2 可用性的动态变化

一个工具是否可用，取决于运行时的多种条件：

- **认证状态**：某些工具需要特定的 auth provider（如 OpenAI API Key）
- **环境变量**：工具可能依赖环境变量（如 `OPENAI_API_KEY`）
- **配置项**：工具可能需要特定的配置路径存在且非空
- **插件状态**：插件提供的工具在插件未启用时不可用
- **上下文**：某些工具只在特定渠道或条件下可用

这些条件是**动态的**——同一份工具定义，在不同的运行时上下文中，可用性可能完全不同。

### 1.3 安全与信任边界

工具系统需要严格的安全策略：

- 凭据配置不能被简单地"看起来存在"就判定为可用
- 环境变量模板（如 `${OPENAI_API_KEY}`）不能被自动解析
- 工具的执行器引用必须在可见时才有效

## 2. 设计思想

### 2.1 声明式注册（Declarative Registration）

工具系统采用**声明式**而非命令式的设计。工具不通过 `register()` 方法注册，而是通过描述符（`ToolDescriptor`）声明自身：

```typescript
// descriptors.ts - 两个身份函数
export function defineToolDescriptor(descriptor: ToolDescriptor): ToolDescriptor {
  return descriptor;
}

export function defineToolDescriptors(
  descriptors: readonly ToolDescriptor[],
): readonly ToolDescriptor[] {
  return descriptors;
}
```

`defineToolDescriptor` 和 `defineToolDescriptors` 是**身份函数**——它们不修改输入，仅提供类型安全的约束。这意味着：

1. **描述符是纯数据**：没有副作用，没有状态，可以安全地序列化、比较、传输
2. **类型即文档**：`ToolDescriptor` 类型本身就是工具的完整规范
3. **组合优于继承**：工具通过组合描述符字段来表达自身，而非继承基类

```typescript
// types.ts - ToolDescriptor 的完整定义
export type ToolDescriptor = {
  readonly name: string;           // 唯一标识符
  readonly title?: string;         // 人类可读标题
  readonly description: string;    // 功能描述（供 LLM 理解）
  readonly inputSchema: JsonObject; // 输入参数 JSON Schema
  readonly outputSchema?: JsonObject; // 输出 JSON Schema（可选）
  readonly owner: ToolOwnerRef;    // 归属信息
  readonly executor?: ToolExecutorRef; // 执行器引用
  readonly availability?: ToolAvailabilityExpression; // 可用性表达式
  readonly annotations?: JsonObject; // 附加元数据
  readonly sortKey?: string;       // 排序键（可选，默认用 name）
};
```

### 2.2 可用性门控（Availability Gating）

这是工具系统最核心的设计决策：**不可用的工具被隐藏，而非报错**。

```typescript
// planner.ts - buildToolPlan 的核心逻辑
for (const descriptor of descriptors) {
  const diagnostics = [
    ...evaluateToolAvailability({ descriptor, context: options.availability }),
  ];
  if (diagnostics.length > 0) {
    hidden.push({ descriptor, diagnostics });  // 隐藏，附带诊断信息
    continue;
  }
  // ... 可用工具进入 visible 列表
}
```

这个设计的好处：

1. **渐进式功能**：当用户配置了新的 auth provider 或启用新插件时，对应的工具自动出现
2. **透明的诊断**：隐藏的工具附带 `diagnostics`，系统可以向用户解释"为什么这个工具不可用"
3. **安全的降级**：工具不会在条件不满足时被错误调用

#### 可用性表达式的组合能力

可用性条件通过 `ToolAvailabilityExpression` 表达，支持两种组合模式：

```typescript
// types.ts
export type ToolAvailabilityExpression =
  | ToolAvailabilitySignal                    // 单一信号
  | { readonly allOf: readonly ToolAvailabilityExpression[] }  // 所有条件都满足
  | { readonly anyOf: readonly ToolAvailabilityExpression[] }; // 任一条件满足
```

**`allOf`**：所有子表达式都必须通过（逻辑与）

```typescript
availability: {
  allOf: [
    { kind: "auth", providerId: "openai" },
    { kind: "env", name: "OPENAI_API_KEY" },
    { kind: "plugin-enabled", pluginId: "web-tools" },
  ],
}
```

**`anyOf`**：至少一个子表达式通过即可（逻辑或）

```typescript
availability: {
  anyOf: [
    { kind: "auth", providerId: "openai" },
    { kind: "env", name: "OPENAI_API_KEY" },
    {
      allOf: [
        { kind: "config", path: ["plugins", "entries", "local"], check: "non-empty" },
        { kind: "plugin-enabled", pluginId: "local" },
      ],
    },
  ],
}
```

这种组合能力使得工具可以声明复杂的可用性条件，例如"需要 OpenAI 认证或环境变量，或者本地插件已配置并启用"。

### 2.3 安全第一（Security First）

工具系统在多个层面体现了安全优先的设计：

#### 凭据配置的安全处理

当 `config` 信号的 `check` 为 `"available"` 时，系统**不会**自行判断配置值是否有效：

```typescript
// availability.ts - hasConfiguredValue 函数
if ((signal.check ?? "exists") === "available") {
  return (
    params.context.isConfigValueAvailable?.({
      value,
      path: signal.path,
      signal,
    }) === true
  );
}
```

这意味着：
- 凭据配置（如 API Key）必须通过外部注入的 `isConfigValueAvailable` 回调来验证
- 系统不会自动解析环境变量模板（如 `${OPENAI_API_KEY}`）
- 系统不会自动识别包含 `source`/`provider`/`id` 字段的对象为有效凭据

测试用例明确验证了这一点：

```typescript
// availability.test.ts
it("does not infer env-template strings as configured credentials", () => {
  // { apiKey: "${OPENAI_API_KEY}" } 不会被视为已配置
  // 必须通过 isConfigValueAvailable 回调验证
});

it("does not infer ordinary objects with source/provider/id fields as credentials", () => {
  // { source: "manual", provider: "docs", id: "readme" } 不会被误判为凭据
});
```

#### 失败关闭（Fail-Closed）

当可见工具缺少执行器引用时，系统抛出 `ToolPlanContractError` 而非静默失败：

```typescript
// planner.ts
if (!descriptor.executor) {
  throw new ToolPlanContractError({
    code: "missing-executor",
    toolName: descriptor.name,
    message: `Visible tool descriptor has no executor ref: ${descriptor.name}`,
  });
}
```

注意：**不可用的工具不要求有执行器**。这是因为不可用的工具不会被调用，其执行器引用可能是延迟加载的。

### 2.4 纯函数架构（Pure Function Architecture）

`tools` 模块的所有核心函数都是**纯函数**——给定相同的输入，总是产生相同的输出，没有副作用。

这一设计通过 `boundary.test.ts` 强制保证：

```typescript
// boundary.test.ts - 边界测试
it("keeps production tool modules independent from OpenClaw subsystems", () => {
  // 验证所有生产代码文件仅引用：
  // 1. 同目录下的兄弟模块（"./" 前缀）
  // 2. Node.js 内置模块（"node:" 前缀）
  // 不引用 OpenClaw 的其他子系统
});
```

纯函数架构的好处：

1. **可测试性**：无需 mock 任何依赖，直接输入/输出断言
2. **可预测性**：工具计划的构建是确定性的
3. **可组合性**：纯函数可以安全地组合、缓存、并行化
4. **无运行时副作用**：`boundary.test.ts` 甚至验证了模块不会在运行时扫描文件系统目录

### 2.5 确定性排序（Deterministic Ordering）

工具计划中的工具按确定性顺序排列：

```typescript
// planner.ts
function compareDescriptors(left: ToolDescriptor, right: ToolDescriptor): number {
  return (
    (left.sortKey ?? left.name).localeCompare(right.sortKey ?? right.name) ||
    left.name.localeCompare(right.name)
  );
}
```

排序规则：
1. 首先按 `sortKey`（如果存在）或 `name` 进行字典序比较
2. 如果 `sortKey` 相同，再按 `name` 排序作为兜底

这保证了无论工具以什么顺序注册，最终的工具计划总是相同的。

### 2.6 协议分离（Protocol Separation）

工具描述符和协议描述符是两个不同的概念：

- **`ToolDescriptor`**：完整的工具元数据，包含归属、执行器、可用性等内部信息
- **`ToolProtocolDescriptor`**：供模型/提供商使用的精简描述，仅包含 `name`、`description`、`inputSchema`

```typescript
// protocol.ts
export type ToolProtocolDescriptor = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonObject;
};
```

这种分离确保：
- 模型提供商只看到工具的语义信息，不接触内部实现细节
- Schema 归一化由模型/提供商适配器负责，不属于工具系统的职责
- 内部的归属和执行器信息不会泄露给外部

## 3. 架构边界

`tools` 模块是 OpenClaw 中**最独立的模块之一**。`boundary.test.ts` 明确验证了两条架构约束：

### 3.1 无外部依赖

所有生产代码文件（非 `.test.ts`）仅引用：
- 同目录下的兄弟模块（`./` 前缀，如 `./types.js`）
- Node.js 内置模块（`node:` 前缀，如 `node:child_process`）

不引用 OpenClaw 的其他子系统（如 `core`、`plugins`、`channels` 等）。

### 3.2 无运行时目录扫描

测试通过 `expectNoReaddirSyncDuring` 工具函数验证：模块在生产代码中不会在运行时扫描文件系统目录。文件列举仅在测试代码中进行。

## 4. 设计权衡

### 4.1 身份函数 vs. 注册表

`defineToolDescriptor` 是身份函数而非注册表模式。这意味着：
- **优势**：描述符是纯数据，可以自由组合、传输、序列化
- **代价**：调用方需要自行管理描述符的收集和传递

### 4.2 隐藏 vs. 错误

不可用的工具被放入 `hidden` 列表而非抛出异常。这意味着：
- **优势**：系统可以优雅降级，向用户解释可用性问题
- **代价**：调用方需要显式检查 `hidden` 列表

### 4.3 排序确定性 vs. 注册顺序

工具按 `sortKey ?? name` 排序，而非注册顺序。这意味着：
- **优势**：输出可预测、可测试
- **代价**：无法通过注册顺序控制优先级（需使用 `sortKey`）

## 5. 与其他模块的关系

```
┌─────────────────────────────────────────────────┐
│                   Agent Loop                     │
│         (消费 ToolPlan.visible)                  │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│              tools/planner.ts                    │
│           buildToolPlan()                        │
│    ┌───────────────────────────────────────┐     │
│    │  tools/availability.ts                │     │
│    │  evaluateToolAvailability()           │     │
│    └───────────────────────────────────────┘     │
│    ┌───────────────────────────────────────┐     │
│    │  tools/protocol.ts                    │     │
│    │  toToolProtocolDescriptors()          │     │
│    └───────────────────────────────────────┘     │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│              Model/Provider Adapter              │
│     (消费 ToolProtocolDescriptor[])              │
│     (负责 schema 归一化)                          │
└─────────────────────────────────────────────────┘
```

工具系统在架构中处于**中间层**：
- **上游**：插件、渠道、MCP 服务器提供工具描述符
- **核心**：工具系统将描述符转化为工具计划
- **下游**：Agent Loop 消费工具计划，模型适配器消费协议描述符
