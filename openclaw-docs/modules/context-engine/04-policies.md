# context-engine — 策略、配置与边界情况

## 一、引擎选择策略

### 1.1 默认引擎

未配置时使用 Legacy 引擎（内置，向后兼容）。

### 1.2 插槽机制

通过 `defaultSlotIdForKey()` 解析引擎插槽 ID，支持多引擎并存。

## 二、压缩策略

### 2.1 Legacy 压缩

委托给 `compactEmbeddedPiSessionDirect`，使用 OpenClaw 内置的压缩算法。

### 2.2 委托压缩

第三方引擎不需要自己实现压缩，可以调用 `delegateCompactionToRuntime`。

## 三、已知边界情况

### 3.1 异步初始化

引擎工厂函数可以是异步的（如需要连接数据库）。`resolveContextEngine` 返回 Promise。

### 3.2 动态导入

`delegate.ts` 使用动态导入加载压缩运行时，避免循环依赖。

### 3.3 Legacy 兼容

Legacy 引擎的 `ingest` 是 no-op，因为 `SessionManager` 已经处理了消息持久化。
