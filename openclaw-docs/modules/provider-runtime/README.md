# provider-runtime — Provider 运行时

> 负责 Provider API 操作的自动重试机制，处理网络波动和服务暂时不可用的情况。
> 是模型提供商层的基础设施，确保 API 调用的可靠性。

## 文件结构

| 文件 | 职责 |
|------|------|
| `operation-retry.ts` | Provider 操作重试策略（指数退避、瞬态错误判断、阶段感知） |

## 核心概念

### 操作阶段（Stage）

| 阶段 | 说明 | 默认重试 |
|------|------|----------|
| `read` | 读取操作（模型列表获取） | ✅ 重试 |
| `poll` | 轮询操作（异步任务状态查询） | ✅ 重试 |
| `download` | 下载操作（文件下载） | ✅ 重试 |
| `create` | 创建操作（资源创建） | ❌ 不重试（避免重复） |

### 瞬态错误判断

系统智能判断哪些错误值得重试：

| 可重试（瞬态） | 不可重试（永久） |
|----------------|------------------|
| HTTP 500/502/503/504 | HTTP 400/401/403/404 |
| ECONNRESET/ECONNREFUSED | invalid api key |
| ETIMEDOUT/EAI_AGAIN | model not found |
| TimeoutError | validation error |

### 指数退避

延迟时间按 2^n 增长：`min(maxDelay, baseDelay × 2^(attempt-1))`

```
默认：250ms → 500ms → 1000ms → 1000ms → ...
```

## 与其他模块的关系

```
plugin-sdk (插件 SDK)
    ↓ 调用 Provider API
provider-runtime ← 本模块
    ↓ 处理重试和错误
extensions/* (Provider 扩展)
    ↓ 实际 API 调用
外部 AI 服务（OpenAI/Anthropic/Google）
```
