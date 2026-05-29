# Tools 模块 — 策略、配置与边界情况

> 可用性信号、安全策略、错误处理、边界测试

本文档详细描述 `tools` 模块的策略设计、安全机制、错误处理以及各种边界情况，帮助开发者理解模块的行为边界和防御性设计。

## 1. 可用性信号策略

### 1.1 六种信号类型的行为规范

`ToolAvailabilitySignal` 定义了六种信号类型，每种都有明确的评估语义和边界行为。

#### `always` — 始终可用

```typescript
case "always":
  return null;  // 直接通过，无条件
```

- 语义：工具无条件可用
- 默认行为：当描述符不指定 `availability` 时，默认为 `{ kind: "always" }`
- 返回：`null`（无诊断信息 = 通过）

#### `auth` — 认证信号

```typescript
case "auth":
  return context.authProviderIds?.has(signal.providerId)
    ? null
    : diagnostic("auth-missing", signal, `Missing auth provider: ${signal.providerId}`);
```

- 语义：需要特定的认证提供者
- 评估方式：检查 `context.authProviderIds` 集合是否包含 `providerId`
- 失败原因：`"auth-missing"`
- 边界情况：`context.authProviderIds` 为 `undefined` 时，`?.has()` 返回 `undefined`，视为未通过

#### `env` — 环境变量信号

```typescript
case "env":
  return context.env?.[signal.name]?.trim()
    ? null
    : diagnostic("env-missing", signal, `Missing environment value: ${signal.name}`);
```

- 语义：需要特定的环境变量
- 评估方式：检查环境变量存在且去除首尾空白后非空
- 失败原因：`"env-missing"`
- 边界情况：
  - `context.env` 为 `undefined` → 未通过
  - 环境变量值为空字符串 `""` → 未通过（`"".trim()` 为空）
  - 环境变量值为纯空白 `"   "` → 未通过（`"   ".trim()` 为空）

#### `config` — 配置信号

```typescript
case "config": {
  const value = resolveConfigPath(context.config, signal.path);
  return hasConfiguredValue({ value, signal, context })
    ? null
    : diagnostic("config-missing", signal, `Missing config path: ${signal.path.join(".")}`);
}
```

- 语义：需要特定的配置路径存在（并满足条件）
- 评估方式：两步——先解析路径，再验证值
- 失败原因：`"config-missing"`
- 三种 `check` 模式的详细行为见下文 §2

#### `plugin-enabled` — 插件启用信号

```typescript
case "plugin-enabled":
  return context.enabledPluginIds?.has(signal.pluginId)
    ? null
    : diagnostic("plugin-disabled", signal, `Plugin is not enabled: ${signal.pluginId}`);
```

- 语义：需要特定插件处于启用状态
- 评估方式：检查 `context.enabledPluginIds` 集合是否包含 `pluginId`
- 失败原因：`"plugin-disabled"`
- 边界情况：`context.enabledPluginIds` 为 `undefined` 时视为未通过

#### `context` — 上下文值信号

```typescript
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
```

- 语义：需要特定的上下文值存在或匹配
- 两种子模式：
  - **存在检查**（无 `equals`）：仅检查值是否定义
  - **匹配检查**（有 `equals`）：检查值是否严格等于 `equals`
- 失败原因：`"context-mismatch"`
- 边界情况：
  - `value` 为 `undefined` 且有 `equals` → 未通过（`undefined !== signal.equals`）
  - `value` 为 `0` 且无 `equals` → 通过（`0 !== undefined`）

#### 未知信号类型

```typescript
default:
  return diagnostic("unsupported-signal", signal, "Unsupported availability signal");
```

- 语义：遇到未识别的信号类型
- 返回：诊断信息，reason 为 `"unsupported-signal"`
- 设计意图：前向兼容——新版本添加的信号类型在旧版本中会被优雅降级

### 1.2 组合表达式的评估策略

#### `allOf` — 逻辑与

```typescript
if ("allOf" in expression) {
  if (expression.allOf.length === 0) {
    return [{ reason: "unsupported-signal", message: "Empty availability allOf group" }];
  }
  return expression.allOf.flatMap((entry) => evaluateExpression(entry, context));
}
```

- 语义：所有子表达式都必须通过
- 评估策略：**急切求值**（评估所有子表达式，收集全部诊断信息）
- 空数组：视为错误，返回 `"unsupported-signal"` 诊断
- 诊断收集：`flatMap` 收集所有失败的诊断，而非短路到第一个失败

#### `anyOf` — 逻辑或

```typescript
if ("anyOf" in expression) {
  if (expression.anyOf.length === 0) {
    return [{ reason: "unsupported-signal", message: "Empty availability anyOf group" }];
  }
  const diagnostics = expression.anyOf.map((entry) => evaluateExpression(entry, context));
  return diagnostics.some((entries) => entries.length === 0) ? [] : diagnostics.flat();
}
```

- 语义：至少一个子表达式通过即可
- 评估策略：**先全部评估，再判断**（非短路求值）
- 空数组：视为错误，返回 `"unsupported-signal"` 诊断
- 诊断行为：如果任一子表达式通过（诊断为空），整体通过；否则收集所有子表达式的诊断

**关键区别**：
- `allOf` 的诊断包含**所有**失败原因（帮助用户逐一修复）
- `anyOf` 的诊断在有通过时为空（只要有路可走就算可用）

#### 嵌套表达式

表达式可以任意嵌套：

```typescript
{
  anyOf: [
    { kind: "auth", providerId: "openai" },
    {
      allOf: [
        { kind: "env", name: "LOCAL_MODEL_PATH" },
        { kind: "config", path: ["models", "local"], check: "non-empty" },
      ],
    },
  ],
}
```

测试验证了嵌套 `anyOf` + `allOf` 的行为：

```typescript
// availability.test.ts
it("supports anyOf availability expressions", () => {
  const descriptor: ToolDescriptor = {
    ...baseDescriptor,
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
    },
  };

  // 情况 1: env 满足 → anyOf 通过 → 整体可用
  expect(evaluateToolAvailability({
    descriptor,
    context: { authProviderIds: new Set(), env: { OPENAI_API_KEY: "set" }, enabledPluginIds: new Set() },
  })).toStrictEqual([]);

  // 情况 2: 全部不满足 → anyOf 不通过 → 收集所有诊断
  expect(evaluateToolAvailability({
    descriptor,
    context: { authProviderIds: new Set(), env: {}, enabledPluginIds: new Set() },
  }).map((entry) => entry.reason)).toEqual(["auth-missing", "env-missing", "config-missing", "plugin-disabled"]);
});
```

## 2. 配置值验证策略

### 2.1 三种 check 模式

`config` 信号支持三种验证模式，通过 `check` 字段指定（默认为 `"exists"`）：

#### `"exists"` — 存在检查

```typescript
if ((signal.check ?? "exists") === "exists") {
  return true;  // 值不为 undefined/null 即通过
}
```

- 最宽松的模式
- `null` 和 `undefined` 不通过
- 空字符串 `""`、空对象 `{}`、空数组 `[]` **通过**
- 数字 `0`、布尔值 `false` **通过**

#### `"non-empty"` — 非空检查

```typescript
if (typeof value === "string") {
  return value.trim().length > 0;
}
if (Array.isArray(value)) {
  return value.length > 0;
}
if (typeof value === "object") {
  return Object.keys(value).length > 0;
}
return true;  // 数字、布尔值等非空原始值通过
```

- 中等严格程度
- 空字符串（或纯空白）不通过
- 空数组 `[]` 不通过
- 空对象 `{}` 不通过
- 数字 `0`、布尔值 `false` **通过**

#### `"available"` — 可用性检查

```typescript
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

- 最严格的模式
- **不自行判断**，委托给外部注入的 `isConfigValueAvailable` 回调
- 回调返回 `true` 才通过，其他情况（返回 `false`、`undefined`、回调不存在）均不通过
- 专门用于凭据配置（API Key 等）

### 2.2 `isConfigValueAvailable` 回调

这是安全策略的关键组件。回调的签名为：

```typescript
isConfigValueAvailable?: (params: {
  readonly value: JsonValue;       // 配置路径处的值
  readonly path: readonly string[]; // 配置路径
  readonly signal: Extract<ToolAvailabilitySignal, { readonly kind: "config" }>; // 原始信号
}) => boolean;
```

**安全设计要点**：

1. **回调是可选的**：如果未注入，`isConfigValueAvailable?.()` 返回 `undefined`，`=== true` 判断为 `false`——凭据配置默认不可用
2. **不自动解析模板**：环境变量模板 `${OPENAI_API_KEY}` 不会被自动展开
3. **不自动识别凭据对象**：包含 `source`/`provider`/`id` 字段的普通对象不会被误判为凭据

测试用例验证了这些安全边界：

```typescript
// 不会自动解析环境变量模板
it("does not infer env-template strings as configured credentials", () => {
  const descriptor = {
    ...baseDescriptor,
    availability: {
      kind: "config",
      path: ["models", "providers", "openai", "apiKey"],
      check: "available",
    },
  };
  // { apiKey: "${OPENAI_API_KEY}" } → 未通过（即使 OPENAI_API_KEY 存在）
  expect(evaluateToolAvailability({
    descriptor,
    context: {
      config: { models: { providers: { openai: { apiKey: "${OPENAI_API_KEY}" } } } },
      env: { OPENAI_API_KEY: "set" },
    },
  }).map(e => e.reason)).toEqual(["config-missing"]);
});

// 不会自动识别凭据对象
it("does not infer credential config values as available without an injected resolver", () => {
  // { apiKey: { source: "env", provider: "default", id: "OPENAI_API_KEY" } }
  // → 未通过（没有注入 isConfigValueAvailable）
  expect(evaluateToolAvailability({
    descriptor,
    context: {
      config: { models: { providers: { openai: { apiKey: { source: "env", provider: "default", id: "OPENAI_API_KEY" } } } } },
      env: {},
    },
  }).map(e => e.reason)).toEqual(["config-missing"]);
});

// 只有通过注入的解析器才能验证凭据
it("accepts credential config values only through an injected availability resolver", () => {
  expect(evaluateToolAvailability({
    descriptor,
    context: {
      config: { models: { providers: { openai: { apiKey: { source: "env", provider: "default", id: "OPENAI_API_KEY" } } } } },
      env: { OPENAI_API_KEY: "set" },
      isConfigValueAvailable: ({ value }) =>
        isRecord(value) &&
        value.source === "env" &&
        value.provider === "default" &&
        value.id === "OPENAI_API_KEY",
    },
  })).toStrictEqual([]);  // 通过
});
```

### 2.3 配置路径解析

`resolveConfigPath` 函数沿路径逐级访问配置对象：

```typescript
function resolveConfigPath(
  config: JsonObject | undefined,
  path: readonly string[],
): JsonValue | undefined {
  let current: JsonValue | undefined = config;
  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;  // 路径中断
    }
    current = current[segment];
  }
  return current;
}
```

边界情况：
- `config` 为 `undefined` → 返回 `undefined`
- 路径中某一段的值不是对象（是数组、字符串等）→ 返回 `undefined`
- 路径中某一段不存在 → 返回 `undefined`
- 路径为空数组 `[]` → 返回 `config` 本身

辅助函数 `isRecord` 用于类型守卫：

```typescript
function isRecord(value: JsonValue | undefined): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
```

注意：数组不是 record，`typeof null === "object"` 但 `!!null === false`。

## 3. 错误处理策略

### 3.1 ToolPlanContractError

`ToolPlanContractError` 是工具系统唯一的自定义异常类型：

```typescript
// diagnostics.ts
export type ToolPlanContractErrorCode = "duplicate-tool-name" | "missing-executor";

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

### 3.2 两种错误码

#### `"duplicate-tool-name"` — 名称重复

触发条件：两个或多个描述符有相同的 `name`。

```typescript
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

**为什么是错误而不是警告？** 名称重复会导致模型无法区分工具调用目标，属于不可恢复的编程错误。

#### `"missing-executor"` — 缺少执行器

触发条件：可见工具（通过可用性检查）没有 `executor` 字段。

```typescript
if (!descriptor.executor) {
  throw new ToolPlanContractError({
    code: "missing-executor",
    toolName: descriptor.name,
    message: `Visible tool descriptor has no executor ref: ${descriptor.name}`,
  });
}
```

**为什么只对可见工具检查？** 不可用的工具不会被调用，其执行器可能是延迟加载的。强制要求所有描述符都有执行器会增加插件的注册负担。

**为什么是错误而不是默认行为？** 缺少执行器意味着系统无法完成工具调用，属于配置错误。静默失败会导致更难调试的问题。

### 3.3 错误的性质

这两种错误都是**编程错误**（programming errors），不是运行时错误：

- 它们在工具注册时就已确定，不会随运行时状态变化
- 它们应该在开发/测试阶段被捕获
- 生产环境中出现这些错误意味着代码有 bug

### 3.4 防御性设计

`buildToolPlan` 的错误处理遵循**失败关闭**（fail-closed）原则：

1. 名称重复 → 立即抛出异常（不让系统带着歧义运行）
2. 可见工具缺少执行器 → 立即抛出异常（不让系统尝试执行无法执行的工具）
3. 不可用工具缺少执行器 → 允许（不影响系统运行）
4. 可用性表达式格式错误 → 隐藏工具（降级处理，不抛异常）

## 4. 架构边界约束

### 4.1 零外部依赖

`boundary.test.ts` 强制保证 `tools` 模块不依赖 OpenClaw 的其他子系统：

```typescript
it("keeps production tool modules independent from OpenClaw subsystems", () => {
  const violations = listProductionToolModuleFiles().flatMap((fileName) => {
    const source = readFileSync(new URL(fileName, toolsDir), "utf8");
    return collectStaticModuleReferences(source)
      .filter(
        (reference) =>
          !reference.specifier.startsWith("./") && !reference.specifier.startsWith("node:"),
      )
      .map((reference) => `${fileName}:${reference.line} ${reference.specifier}`);
  });

  expect(violations).toStrictEqual([]);
});
```

允许的引用：
- `./` 前缀：同目录下的兄弟模块
- `node:` 前缀：Node.js 内置模块

禁止的引用：
- `@openclaw/` 前缀：OpenClaw 内部包
- 任何不以 `./` 或 `node:` 开头的引用

**设计原因**：
- 保持模块的独立性和可测试性
- 避免循环依赖
- 使模块可以在其他项目中复用

### 4.2 无运行时目录扫描

```typescript
it("lists production tool modules without scanning the tools directory in-process", () => {
  expectNoReaddirSyncDuring(() => {
    const files = listProductionToolModuleFiles();
    expect(files.length).toBeGreaterThan(0);
  });
});
```

**设计原因**：
- 运行时目录扫描是隐式 I/O，难以测试和预测
- 文件列举在测试代码中通过 `git ls-files` 或 `find` 命令完成
- 生产代码只处理传入的数据，不自行发现文件

### 4.3 测试文件发现策略

`boundary.test.ts` 本身使用多层回退策略来发现生产文件：

1. **首选**：`listGitTrackedFiles()` — 使用 `git ls-files` 获取版本控制的文件
2. **回退**：`listFindProductionToolModuleFiles()` — 使用 `find` 命令扫描文件系统
3. **兜底**：`fs.readdirSync()` — 直接读取目录（最后手段）

这种多层策略确保测试在不同环境（CI、本地开发、Docker）中都能正常工作。

## 5. 不可变性保证

### 5.1 readonly 类型修饰符

`tools` 模块的所有导出类型都使用 `readonly` 修饰符：

```typescript
export type ToolDescriptor = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonObject;  // JsonObject 内部也是 readonly
  // ...
};

export type ToolPlan = {
  readonly visible: readonly ToolPlanEntry[];   // 数组本身 readonly
  readonly hidden: readonly HiddenToolPlanEntry[]; // 元素也 readonly
};
```

这保证了：
- 调用方不能意外修改工具描述符
- 工具计划的 `visible` 和 `hidden` 列表不能被修改
- JSON 值的嵌套结构也是不可变的

### 5.2 toSorted vs sort

`buildToolPlan` 使用 `Array.prototype.toSorted()` 而非 `Array.prototype.sort()`：

```typescript
const descriptors = options.descriptors.toSorted(compareDescriptors);
```

`toSorted()` 返回新数组，不修改原数组。这保证了传入的 `descriptors` 数组不会被意外修改。

### 5.3 身份函数的不可变性

`defineToolDescriptor` 和 `defineToolDescriptors` 是身份函数，它们不修改输入，也不创建新对象（返回同一个引用）。但由于类型使用 `readonly` 修饰，TypeScript 编译器会阻止调用方通过返回值修改描述符。

## 6. 确定性保证

### 6.1 排序确定性

工具计划中的工具按以下规则确定性排序：

```typescript
function compareDescriptors(left: ToolDescriptor, right: ToolDescriptor): number {
  return (
    (left.sortKey ?? left.name).localeCompare(right.sortKey ?? right.name) ||
    left.name.localeCompare(right.name)
  );
}
```

- 使用 `localeCompare` 进行字符串比较（考虑 locale）
- 二级排序键 `name` 确保即使 `sortKey` 相同也能确定顺序
- 测试验证了排序行为：

```typescript
it("sorts visible and hidden tools deterministically", () => {
  const plan = buildToolPlan({
    descriptors: [
      descriptor("zeta"),
      descriptor("alpha"),
      descriptor("hidden", { sortKey: "middle", availability: { kind: "env", name: "MISSING_ENV" } }),
    ],
    availability: { env: {} },
  });

  expect(plan.visible.map(e => e.descriptor.name)).toEqual(["alpha", "zeta"]);
  expect(plan.hidden.map(e => e.descriptor.name)).toEqual(["hidden"]);
});
```

### 6.2 诊断确定性

可用性评估的诊断信息也是确定性的：

- 相同的描述符 + 相同的上下文 = 相同的诊断结果
- `allOf` 收集所有失败原因（顺序由表达式树结构决定）
- `anyOf` 在全部失败时收集所有诊断

测试验证了诊断的确定性：

```typescript
it("returns deterministic diagnostics for missing signals", () => {
  expect(evaluateToolAvailability({
    descriptor,
    context: { authProviderIds: new Set(), env: {}, config: { ... }, enabledPluginIds: new Set(), values: { channel: "discord" } },
  }).map(e => e.reason)).toEqual([
    "auth-missing", "env-missing", "config-missing", "plugin-disabled", "context-mismatch",
  ]);
});
```

### 6.3 协议转换确定性

`toToolProtocolDescriptors` 使用 `Array.prototype.map()`，保持输入顺序不变：

```typescript
export function toToolProtocolDescriptors(
  entries: readonly ToolPlanEntry[],
): readonly ToolProtocolDescriptor[] {
  return entries.map(toToolProtocolDescriptor);
}
```

由于输入（`plan.visible`）已经确定性排序，输出也是确定性排序的。

## 7. 空值与缺失值处理

### 7.1 缺失的 availability

```typescript
const availability = params.descriptor.availability ?? { kind: "always" };
```

如果描述符没有 `availability` 字段，默认为 `{ kind: "always" }`（始终可用）。

### 7.2 缺失的 context

```typescript
const context = params.context ?? {};
```

如果调用方不提供 `context`，默认为空对象。此时所有依赖上下文的信号都会失败。

### 7.3 缺失的 check

```typescript
if ((signal.check ?? "exists") === "available") { /* ... */ }
if ((signal.check ?? "exists") === "exists") { /* ... */ }
```

如果 `config` 信号没有 `check` 字段，默认为 `"exists"`（存在即可）。

### 7.4 缺失的 equals

```typescript
if (!("equals" in signal)) {
  return value === undefined
    ? diagnostic("context-mismatch", signal, `Missing context value: ${signal.key}`)
    : null;
}
```

如果 `context` 信号没有 `equals` 字段，只检查值是否存在（不检查具体值）。

### 7.5 空的 allOf/anyOf

```typescript
if (expression.allOf.length === 0) {
  return [{ reason: "unsupported-signal", message: "Empty availability allOf group" }];
}
if (expression.anyOf.length === 0) {
  return [{ reason: "unsupported-signal", message: "Empty availability anyOf group" }];
}
```

空的 `allOf` 和 `anyOf` 被视为格式错误，返回诊断信息而非抛出异常。

## 8. 测试策略

### 8.1 测试文件组织

```
src/tools/
├── availability.test.ts  ← 可用性信号评估测试
├── boundary.test.ts      ← 架构边界约束测试
├── planner.test.ts       ← 工具计划构建测试
```

### 8.2 测试覆盖范围

#### availability.test.ts（6 个测试用例）

1. **无信号默认可用** — 描述符没有 `availability` 时默认可用
2. **全信号通过** — 所有六种信号在正确上下文中都通过
3. **确定性诊断** — 缺失信号产生确定性的诊断列表
4. **凭据安全：无注入不通过** — `"available"` 模式在没有注入解析器时不通过
5. **凭据安全：注入后通过** — `"available"` 模式在注入解析器后通过
6. **凭据安全：模板不解析** — `${ENV_VAR}` 模板不会被自动展开
7. **凭据安全：普通对象不误判** — `source/provider/id` 字段不会被自动识别为凭据
8. **anyOf 表达式** — 嵌套 `anyOf` + `allOf` 的正确行为

#### planner.test.ts（5 个测试用例）

1. **确定性排序** — visible 和 hidden 工具都按 `sortKey ?? name` 排序
2. **重复名称报错** — 重复的 `name` 抛出 `ToolPlanContractError`
3. **缺失执行器报错** — 可见工具缺少 `executor` 抛出异常
4. **不可用工具不要求执行器** — 不可用工具可以没有 `executor`
5. **空 allOf 格式错误** — 空 `allOf` 被隐藏而非抛异常
6. **协议转换独立** — 协议转换不依赖执行器引用

#### boundary.test.ts（2 个测试用例）

1. **无运行时目录扫描** — 生产代码不使用 `readdirSync`
2. **无外部依赖** — 生产代码仅引用 `./` 和 `node:` 模块

### 8.3 测试中的辅助函数

测试文件定义了一些辅助函数来简化测试：

```typescript
// planner.test.ts
function descriptor(name: string, overrides: Partial<ToolDescriptor> = {}): ToolDescriptor {
  return {
    name,
    description: `${name} description`,
    inputSchema: { type: "object" },
    owner: { kind: "core" },
    executor: { kind: "core", executorId: name },
    ...overrides,
  };
}

function expectHiddenTool(plan: ToolPlan, index: number): ToolPlan["hidden"][number] {
  const entry = plan.hidden[index];
  if (!entry) throw new Error(`Expected hidden tool at index ${index}`);
  return entry;
}
```

## 9. 向前兼容性

### 9.1 未知信号类型的处理

```typescript
default:
  return diagnostic("unsupported-signal", signal, "Unsupported availability signal");
```

遇到未知的信号类型时，返回诊断信息而非抛出异常。这意味着：
- 新版本添加的信号类型在旧版本中会被视为不可用
- 系统不会因为新信号类型而崩溃
- 调用方可以通过诊断信息了解原因

### 9.2 表达式形状检查

```typescript
function hasAvailabilityExpressionShape(value: ToolAvailabilityExpression): boolean {
  return "kind" in value || "allOf" in value || "anyOf" in value;
}
```

在评估前检查表达式是否具有正确的形状。如果表达式既没有 `kind`、也没有 `allOf`/`anyOf`，返回 `"unsupported-signal"` 诊断。

### 9.3 类型穷举检查

`formatToolExecutorRef` 使用 `never` 类型确保覆盖所有 `ToolExecutorRef` 形态：

```typescript
default: {
  const exhaustive: never = ref;
  return exhaustive;
}
```

如果未来添加新的 `kind`，TypeScript 编译器会在编译时报错，提醒开发者更新 `switch` 语句。

## 10. 性能策略

### 10.1 时间复杂度

| 操作 | 时间复杂度 | 说明 |
|------|-----------|------|
| `buildToolPlan` | O(n log n) | 排序主导 |
| `evaluateToolAvailability` | O(d) | d = 表达式树深度 |
| `toToolProtocolDescriptors` | O(n) | 线性映射 |
| `formatToolExecutorRef` | O(1) | 常量时间 |

### 10.2 空间复杂度

| 操作 | 空间复杂度 | 说明 |
|------|-----------|------|
| `buildToolPlan` | O(n) | 创建新数组 |
| `evaluateToolAvailability` | O(d) | 递归栈深度 |
| `toToolProtocolDescriptors` | O(n) | 创建新数组 |

### 10.3 潜在优化

由于所有核心函数都是纯函数，可以安全地进行以下优化（当前未实现）：

- **记忆化**：缓存 `evaluateToolAvailability` 的结果（相同输入 → 相同输出）
- **并行评估**：并行评估多个工具的可用性（无共享状态）
- **短路求值**：`anyOf` 在第一个通过时停止（当前是全量评估）
