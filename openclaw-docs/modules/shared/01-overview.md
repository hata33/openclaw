# shared — 功能定义

## 设计原则

shared 模块是项目的基础设施层，遵循以下原则：

### 1. 零依赖

shared 文件不依赖业务模块（agents、gateway、config 等），只依赖标准库和极少数第三方库。

### 2. 纯函数

大部分是纯函数/类型，无副作用。

### 3. 可复用

任何模块都可以安全导入 shared 中的工具。

## 核心能力

### 类型强转

`string-coerce.ts`、`number-coercion.ts`、`record-coerce.ts` 提供安全的类型转换：

```typescript
normalizeOptionalLowercaseString(value) → string | undefined
asFiniteNumber(value, fallback) → number
asOptionalRecord(value) → Record<string, unknown> | undefined
```

### 文本处理

`text/` 子目录提供丰富的文本处理能力：

- Markdown 清理
- 代码块检测
- Reasoning 标签处理
- 引用标记
- 文本分块

### 全局单例

`global-singleton.ts` 提供惰性初始化的单例模式：

```typescript
resolveGlobalSingleton(key, factory) → T
```

### 网络工具

IP 地址解析、URL 脱敏、用户信息提取。
