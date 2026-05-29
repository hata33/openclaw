# compat — 兼容性

> 项目重命名兼容层（clawdbot → openclaw）。
> 保留旧名称的向后兼容。

## 文件结构

| 文件 | 职责 |
|------|------|
| `legacy-names.ts` | 旧名称常量 |

## 常量

```typescript
PROJECT_NAME = "openclaw"
MANIFEST_KEY = "openclaw"
LEGACY_MANIFEST_KEYS = ["clawdbot"]
```

用于配置文件和清单中兼容旧名称。
