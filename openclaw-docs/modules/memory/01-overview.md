# memory — 功能定义与设计思想

## 这个模块解决什么问题？

AI Agent 需要跨会话记忆。每次会话结束后，Agent 的"记忆"需要持久化到文件中。memory 模块解决核心问题：

1. **记忆文件在哪？** — 提供 MEMORY.md 的规范路径
2. **旧格式怎么办？** — 检测 `memory.md`（旧格式）的存在
3. **修复时如何安全处理？** — 提供修复目录路径，避免重复处理

## 文件名规范化

系统使用 `MEMORY.md` 作为规范文件名：

```typescript
const CANONICAL_ROOT_MEMORY_FILENAME = "MEMORY.md";
const LEGACY_ROOT_MEMORY_FILENAME = "memory.md";
```

旧格式 `memory.md` 被保留检测但不主动使用。

## 路径安全

`resolveCanonicalRootMemoryFile()` 确保文件是真实文件（非符号链接）：

```typescript
// 只接受：文件存在 && 是文件 && 不是符号链接
entry.isFile() && !entry.isSymbolicLink()
```

## 修复辅助路径

修复记忆文件时使用独立目录，避免与正常记忆文件混淆：

```typescript
const ROOT_MEMORY_REPAIR_RELATIVE_DIR = ".openclaw-repair/root-memory";
```

`shouldSkipRootMemoryAuxiliaryPath()` 在扫描工作区时跳过这些辅助路径。
