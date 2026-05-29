# plugin-state — 插件状态存储

> 插件运行时状态的持久化存储。
> 使用 SQLite 存储插件的状态数据。

## 文件结构

| 文件 | 职责 |
|------|------|
| `plugin-state-store.ts` | 状态存储接口 |
| `plugin-state-store.sqlite.ts` | SQLite 实现 |
| `plugin-state-store.paths.ts` | 文件路径 |
| `plugin-state-store.types.ts` | 类型定义 |

## 核心概念

### 插件状态

每个插件有自己的状态命名空间：

```
pluginId → { key: value }
```

### SQLite 存储

使用 SQLite 作为后端，支持：

- 按 plugin ID 隔离
- JSON 值
- 原子读写
