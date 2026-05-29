# context-engine — 实现流程与数据流

## 引擎注册流程

```
init.ts → ensureContextEnginesInitialized()
  ↓
1. 注册 Legacy 引擎
   registerLegacyContextEngine()
   → 创建 LegacyContextEngine 实例
   → 注册到 registry

2. 插件注册自定义引擎
   api.registerContextEngine({ id, factory })
   → 存储到 registry
```

## 上下文组装流程

```
Agent 需要调用模型
  ↓
1. 解析引擎
   registry.ts → resolveContextEngine(slotId)
   → 查找注册的引擎
   → 调用工厂函数创建实例

2. 调用 assemble
   engine.assemble(runtimeContext)
   → runtimeContext 包含会话历史、配置、Agent 信息

3. Legacy 引擎行为
   → pass-through：返回原始消息列表
   → 现有的 sanitize/validate/limit 流水线处理

4. 返回结果
   → { messages, estimatedTokens, systemPromptSections }
```

## 上下文压缩流程

```
上下文溢出（Token 数超限）
  ↓
1. 检测溢出
   estimatedTokens > maxTokens

2. 调用 compact
   engine.compact(runtimeContext)

3. Legacy 引擎压缩
   delegateCompactionToRuntime(ctx)
   → 加载 compact.runtime.js
   → compactEmbeddedPiSessionDirect()
   → 压缩会话历史

4. 返回压缩结果
   → { messages, estimatedTokens }
```

## 第三方引擎委托流程

```
第三方引擎需要压缩
  ↓
delegateCompactionToRuntime(ctx)
  → 动态导入 compact.runtime.js
  → 调用内置压缩算法
  → 返回结果
```
