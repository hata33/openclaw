# tools — 策略、配置与边界情况

## 一、可用性评估策略

### 1.1 默认可用策略

工具如果未声明 `availability` 字段，默认始终可用：

```typescript
// evaluateToolAvailability 中的默认逻辑
const availability = params.descriptor.availability ?? { kind: "always" };
```

**设计理由**：大多数核心工具（read、write、exec 等）不需要条件门控，默认可用简化了定义。

### 1.2 信号评估策略

每个信号类型的评估逻辑：

| 信号 | 检查方式 | 通过条件 | 不通过原因 |
|------|----------|----------|------------|
| `always` | 跳过检查 | 始终通过 | — |
| `auth` | Set.has() | authProviderIds 包含指定 provider | `auth-missing` |
| `config` | 路径遍历 | config 中指定路径有值 | `config-missing` |
| `env` | trim + 非空 | 环境变量存在且非空 | `env-missing` |
| `plugin-enabled` | Set.has() | enabledPluginIds 包含指定 plugin | `plugin-disabled` |
| `context` | 值比较 | values[key] 存在或匹配 equals | `context-mismatch` |

### 1.3 config 信号的三种检查模式

`config` 信号支持三种检查模式（通过 `check` 字段指定）：

```typescript
// "exists"（默认）— 值存在即通过
{ kind: "config", path: ["channels", "telegram"], check: "exists" }
// → null/undefined 不通过，任何其他值通过

// "non-empty" — 值存在且非空
{ kind: "config", path: ["channels", "telegram", "token"], check: "non-empty" }
// → 空字符串、空数组、空对象不通过

// "available" — 自定义检查函数
{ kind: "config", path: ["models", "primary"], check: "available" }
// → 调用 context.isConfigValueAvailable() 进行自定义判断
```

### 1.4 复合表达式策略

#### allOf（AND 逻辑）

所有子表达式都必须通过。任何一个不通过，工具就不可用。

```typescript
availability: {
  allOf: [
    { kind: "env", name: "BRAVE_API_KEY" },       // 必须有 API Key
    { kind: "plugin-enabled", pluginId: "brave" }  // 必须启用 brave 插件
  ]
}
```

评估逻辑：遍历所有子表达式，收集所有诊断。如果任何子表达式产生诊断，工具不可用。

#### anyOf（OR 逻辑）

任一子表达式通过即可。

```typescript
availability: {
  anyOf: [
    { kind: "env", name: "OPENAI_API_KEY" },      // 有 API Key
    { kind: "auth", providerId: "openai" }         // 或者有 OAuth 认证
  ]
}
```

评估逻辑：遍历所有子表达式，如果任一子表达式返回空诊断数组（通过），则整体通过。

### 1.5 空表达式组处理

空的 `allOf` 或 `anyOf` 被视为错误：

```typescript
if (expression.allOf.length === 0) {
  return [{ reason: "unsupported-signal", message: "Empty availability allOf group" }];
}
```

**设计理由**：空表达式组通常是配置错误，应该被显式报告。

## 二、工具规划策略

### 2.1 工具排序策略

工具按以下规则排序：

```typescript
function compareDescriptors(left: ToolDescriptor, right: ToolDescriptor): number {
  return (
    (left.sortKey ?? left.name).localeCompare(sortKey ?? right.name) ||
    left.name.localeCompare(right.name)
  );
}
```

1. 首先按 `sortKey` 排序（如果定义了的话）
2. `sortKey` 相同时按 `name` 排序
3. 排序是字典序（locale-sensitive）

**用途**：UI 展示时控制工具的显示顺序。

### 2.2 名称唯一性策略

工具名称必须全局唯一。`buildToolPlan()` 在规划前会检查：

```typescript
function assertUniqueNames(descriptors: readonly ToolDescriptor[]): void {
  const seen = new Set<string>();
  for (const descriptor of descriptors) {
    if (seen.has(descriptor.name)) {
      throw new ToolPlanContractError({
        code: "duplicate-tool-name",
        toolName: descriptor.name,
      });
    }
    seen.add(descriptor.name);
  }
}
```

**后果**：如果两个插件注册了同名工具，`buildToolPlan()` 会抛出 `ToolPlanContractError`。这是设计决策——宁可快速失败，也不让行为不可预测。

### 2.3 executor 必需策略

可见的工具必须有 executor。如果工具通过了可用性检查但没有 executor，规划器会抛出异常：

```typescript
if (!descriptor.executor) {
  throw new ToolPlanContractError({
    code: "missing-executor",
    toolName: descriptor.name,
    message: `Visible tool descriptor has no executor ref: ${descriptor.name}`,
  });
}
```

**设计理由**：LLM 看到一个工具却无法执行它，会导致糟糕的用户体验。

### 2.4 分离可见/隐藏工具

规划结果分为两个列表：

```typescript
return { visible, hidden };
```

- `visible` — 对 LLM 可见的工具（可用 + 有 executor）
- `hidden` — 不可见的工具（附带诊断原因，用于调试）

**为什么保留 hidden？** 用于诊断和调试。当用户问"为什么某个工具不可用"时，可以查看 hidden 列表中的诊断信息。

## 三、安全策略

### 3.1 工具来源信任模型

不同来源的工具有不同的信任级别：

| 来源 | 信任级别 | 说明 |
|------|----------|------|
| `core` | 最高 | OpenClaw 核心内置工具 |
| `plugin` | 高 | 已安装的插件提供的工具 |
| `channel` | 中 | 渠道特定的动作 |
| `mcp` | 较低 | 外部 MCP 服务器提供的工具 |

MCP 工具的信任级别最低，因为它们来自外部进程，代码不受 OpenClaw 控制。

### 3.2 可用性信号的安全作用

可用性信号不仅用于功能门控，也用于安全门控：

```typescript
// 工具需要特定 Provider 的认证才能使用
availability: { kind: "auth", providerId: "anthropic" }

// 工具需要特定环境变量（通常是 API Key）
availability: { kind: "env", name: "BRAVE_API_KEY" }

// 工具需要特定插件启用
availability: { kind: "plugin-enabled", pluginId: "browser" }
```

这确保了：
- 没有配置 API Key 的工具不会暴露给 LLM
- 未启用的插件的工具不会暴露
- 需要认证的工具在认证前不可用

## 四、错误处理策略

### 4.1 ToolPlanContractError

工具规划过程中的错误通过 `ToolPlanContractError` 抛出：

```typescript
class ToolPlanContractError extends Error {
  code: string;     // 错误码
  toolName: string; // 出错的工具名
}
```

错误码：
- `duplicate-tool-name` — 工具名称重复
- `missing-executor` — 可见工具缺少 executor

### 4.2 可用性评估的容错策略

可用性评估不会抛出异常。对于不支持的信号类型，返回诊断信息而非崩溃：

```typescript
default:
  return diagnostic("unsupported-signal", signal, "Unsupported availability signal");
```

### 4.3 不支持的表达式形状

如果 `availability` 对象的形状不合法（不是 `kind`/`allOf`/`anyOf`），返回错误诊断：

```typescript
if (!hasAvailabilityExpressionShape(availability)) {
  return [{
    reason: "unsupported-signal",
    message: "Unsupported availability expression",
  }];
}
```

## 五、性能策略

### 5.1 排序稳定性

所有工具按 `sortKey`/`name` 稳定排序，确保：
- 相同输入总是产生相同输出
- UI 展示顺序一致
- 便于调试和复现问题

### 5.2 Set 用于成员检查

`authProviderIds`、`enabledPluginIds` 使用 `ReadonlySet<string>`，O(1) 查找。

### 5.3 评估是纯函数

`evaluateToolAvailability()` 是纯函数——相同输入总是产生相同输出，没有副作用。这使得：
- 评估可以缓存
- 测试简单
- 行为可预测

## 六、已知边界情况

### 6.1 空 allOf/anyOf

空的 `allOf` 或 `anyOf` 会产生 `unsupported-signal` 诊断，不会导致工具可用。

### 6.2 anyOf 中部分通过

`anyOf` 的评估逻辑是：只要有一个子表达式通过，整体就通过。这意味着：

```typescript
anyOf: [
  { kind: "env", name: "MISSING_KEY" },    // 不通过
  { kind: "auth", providerId: "openai" }   // 通过
]
```

结果：工具可用（因为 `auth` 信号通过了）。`env` 信号的诊断被丢弃。

### 6.3 config 路径不存在 vs 值为 null

```typescript
// 路径不存在 → config-missing
resolveConfigPath({ channels: {} }, ["channels", "telegram", "token"]) → undefined

// 路径存在但值为 null → depends on check mode
resolveConfigPath({ channels: { telegram: { token: null } } }, ["channels", "telegram", "token"]) → null
// check: "exists" → 通过（值存在）
// check: "non-empty" → 不通过（null 不是非空）
```

### 6.4 executor 为 undefined 的工具

如果一个工具的 `executor` 为 `undefined`：
- 如果它通过了可用性检查 → 抛出 `missing-executor` 异常
- 如果它没通过可用性检查 → 静默进入 `hidden` 列表

### 6.5 排序的 locale 敏感性

排序使用 `localeCompare()`，这意味着不同 locale 下排序结果可能不同。在生产环境中，locale 通常由系统环境决定。

## 七、配置结构

### 7.1 工具可用性上下文的构建

`ToolAvailabilityContext` 通常由 Gateway 在构建工具计划时组装：

```typescript
const context: ToolAvailabilityContext = {
  authProviderIds: resolveAuthenticatedProviders(config),
  config: flattenConfig(config),
  env: process.env,
  enabledPluginIds: resolveEnabledPluginIds(config),
  values: buildContextValues(session),
};
```

### 7.2 自定义配置值检查

`isConfigValueAvailable` 回调允许自定义配置值的检查逻辑：

```typescript
isConfigValueAvailable: ({ value, path, signal }) => {
  // 自定义逻辑，例如检查 API Key 是否有效
  if (path.join(".") === "models.providers.openai.apiKey") {
    return typeof value === "string" && value.startsWith("sk-");
  }
  return true;
}
```
