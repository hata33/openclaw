# model-catalog — 模型目录系统

> 管理所有可用 AI 模型的元数据，包括能力、定价、状态等信息。
> 是 Provider 系统和 Agent 模型选择之间的桥梁。

## 文件结构

| 文件 | 职责 |
|------|------|
| `types.ts` | 核心类型定义：ModelCatalogModel、ModelCatalogProvider、NormalizedModelCatalogRow 等 |
| `normalize.ts` | 数据规范化：将各来源的原始数据转换为统一格式，防原型污染，类型校验 |
| `authority.ts` | 权威来源合并：当同一模型有多条数据时，按优先级（config > manifest > cache > provider-index）保留最高优先级 |
| `refs.ts` | 引用工具：normalizeModelCatalogProviderId、buildModelCatalogRef、buildModelCatalogMergeKey |
| `manifest-planner.ts` | 清单规划器：从插件 manifest JSON 中提取模型目录数据 |
| `provider-index-planner.ts` | Provider 索引规划器：从内置 Provider 索引中提取模型目录数据 |
| `index.ts` | 入口：统一导出所有公共 API |
| `provider-index/` | Provider 索引子目录：加载和规范化 OpenClaw 内置的 Provider 索引数据 |

## 核心概念

### 模型引用（Ref）
- 格式：`provider/modelId`（如 `openai/gpt-5.5`）
- 类似 GitHub 的 `owner/repo` 格式

### 合并键（Merge Key）
- 格式：`provider::modelId`（全小写）
- 用于在数据合并时识别同一模型的不同来源条目

### 来源权威等级
```
config (0) > manifest (1) > cache/runtime-refresh (2) > provider-index (3)
```

## 与其他模块的关系

```
plugin-sdk (Provider 注册)
    ↓ 提供模型定义
model-catalog (模型目录)
    ↓ 查询模型信息
agents (Agent 模型选择)
    ↓ 使用模型
provider-runtime (模型调用)
```

- **config**：读取用户配置中的模型覆盖
- **plugins**：从插件 manifest 中提取模型定义
- **agents**：Agent 查询模型能力（context window、推理支持等）
- **provider-runtime**：运行时需要模型的 API 类型、base URL 等信息
