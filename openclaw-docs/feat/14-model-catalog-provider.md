# 14 — 模型目录与 Provider 运行时

> OpenClaw 通过模型目录（Model Catalog）统一管理 50+ AI Provider 的模型元数据，
> 结合 Provider 运行时实现模型的发现、路由、限流和回退。

## 设计目标

```
50+ Provider（OpenAI、Anthropic、Google、...）
× 每个数十到数百个模型
× 每个模型有不同的能力、定价、限制
─────────────────────────────────
需要一个统一的模型目录来管理这一切
```

核心问题：
1. **发现** — 哪些模型可用？从哪里获取模型列表？
2. **规范化** — 不同 Provider 的模型描述格式不统一，需要标准化
3. **权威合并** — 同一个模型可能从多个来源获取信息，以谁为准？
4. **路由** — 给定一个模型名称，路由到哪个 Provider？

## 模型目录架构

```
┌────────────────────────────────────────────────┐
│              Unified Model Catalog              │
│           (统一模型目录 = 最终真相)               │
└───────────────────┬────────────────────────────┘
                    │ merge by authority
     ┌──────────────┼──────────────────┐
     │              │                  │
     ▼              ▼                  ▼
 Manifest      Provider Index      Config
 (插件清单)     (远程索引)          (用户配置)
 static        refreshable         config
```

## 模型元数据模型

### 核心类型

```typescript
// 单个模型的描述
type ModelCatalogModel = {
  id: string;                    // 模型标识 (如 "claude-sonnet-4")
  name?: string;                 // 显示名称
  status?: ModelCatalogStatus;   // available | preview | deprecated | disabled
  input?: ModelCatalogInput[];   // text | image | document
  cost?: ModelCatalogCost;       // 定价信息
  contextWindow?: number;        // 上下文窗口大小
  discovery?: ModelCatalogDiscovery; // static | refreshable | runtime
};

// 一个 Provider 的所有模型
type ModelCatalogProvider = {
  id: string;                    // Provider 标识 (如 "anthropic")
  models: ModelCatalogModel[];
};

// 整个目录
type ModelCatalog = {
  providers: ModelCatalogProvider[];
};
```

### 规范化行

所有来源的模型信息最终规范化为 `NormalizedModelCatalogRow`：

```typescript
type NormalizedModelCatalogRow = {
  providerId: string;
  modelId: string;
  name: string;
  status: ModelCatalogStatus;
  input: ModelCatalogInput[];
  cost?: ModelCatalogCost;
  contextWindow?: number;
  source: ModelCatalogSource;    // manifest | provider-index | cache | config
  discovery: ModelCatalogDiscovery;
};
```

## 数据来源与发现模式

### 1. Manifest（插件清单）— static

每个 Provider 插件在 `manifest.json` 中声明支持的模型：

```
extensions/anthropic/manifest.json
  → planManifestModelCatalogRows() 解析
  → 生成 static 类型的目录行
```

特点：静态定义，不自动更新，但最可靠。

### 2. Provider Index（远程索引）— refreshable

OpenClaw 维护一个中央模型索引：

```
OpenClaw Provider Index (远程)
  → loadOpenClawProviderIndex() 定期拉取
  → planProviderIndexModelCatalogRows() 解析
  → 生成 refreshable 类型的目录行
```

特点：定期刷新，包含最新模型信息和定价。

### 3. Config（用户配置）— config

用户可以在配置文件中覆盖模型信息：

```yaml
models:
  overrides:
    - id: "my-custom-model"
      provider: "ollama"
      contextWindow: 32768
```

### 4. Runtime Refresh（运行时发现）— runtime

某些 Provider（如 Ollama、LM Studio）支持通过 API 动态列出模型：

```
Provider API (如 GET /api/tags)
  → 运行时查询可用模型
  → 生成 runtime 类型的目录行
```

## 权威合并

`src/model-catalog/authority.ts` — 同一个模型可能从多个来源获取信息，需要按优先级合并：

```
权威来源优先级（高 → 低）：
1. config       — 用户显式配置，最高权威
2. manifest     — 插件声明，次高权威
3. provider-index — 远程索引
4. cache        — 缓存数据
5. runtime-refresh — 运行时发现，最低权威
```

```typescript
mergeModelCatalogRowsByAuthority(rows[])
  // 按 (providerId, modelId) 分组
  // 在每组内按来源权威排序
  // 高权威来源的字段覆盖低权威来源
```

## 统一模型目录

最终，所有来源的模型信息合并为 **统一模型目录**，按模型类型分类：

```typescript
type UnifiedModelCatalogEntry = {
  kind: "text"                 // 文本生成模型
      | "image_generation"     // 图片生成模型
      | "video_generation"     // 视频生成模型
      | "music_generation";    // 音乐生成模型
  providerId: string;
  modelId: string;
  // ... 统一后的元数据
};
```

## Provider 运行时

`src/provider-runtime/operation-retry.ts` — 管理与 Provider API 的实际通信：

```
Agent 请求调用模型
  → model-catalog 查找模型 → 确定 Provider
  → provider-runtime 负责实际 API 调用
  → 处理重试、限流、错误转换
```

### 重试策略

```
Provider API 调用失败
  → 判断错误类型
    → 429 Rate Limit → 指数退避重试
    → 500 Server Error → 重试（有限次）
    → 401 Auth Error → 不重试，报告错误
    → 网络超时 → 重试
  → 所有重试用尽 → 触发 fallback 模型
```

## 模型路由

```
用户配置 model: "claude-sonnet-4"
  → model-catalog 查找 → providerId: "anthropic", modelId: "claude-sonnet-4"
  → 加载 anthropic 插件的 Provider
  → provider-runtime 发起 API 调用
```

### 模型别名与回退

```yaml
models:
  default: "claude-sonnet-4"
  fallbacks:
    - "gpt-4o"
    - "gemini-2.0-flash"
```

```
主模型调用失败
  → 尝试 fallback[0]
  → 再失败 → 尝试 fallback[1]
  → 全部失败 → 返回错误
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/model-catalog/types.ts` | 核心类型定义 |
| `src/model-catalog/index.ts` | 公共 API 入口 |
| `src/model-catalog/normalize.ts` | 数据规范化 |
| `src/model-catalog/authority.ts` | 权威来源合并 |
| `src/model-catalog/refs.ts` | 模型引用工具 |
| `src/model-catalog/manifest-planner.ts` | 清单解析规划 |
| `src/model-catalog/provider-index/` | 远程索引加载 |
| `src/model-catalog/provider-index-planner.ts` | 索引解析规划 |
| `src/provider-runtime/operation-retry.ts` | API 调用重试 |

## 总结

1. **统一目录** — 50+ Provider、数百个模型通过统一目录管理
2. **多源发现** — static/refreshable/runtime/config 四种来源
3. **权威合并** — 按优先级合并不同来源的模型信息
4. **类型分类** — 文本、图片生成、视频生成、音乐生成统一管理
5. **运行时保障** — 重试、限流、回退确保调用可靠
