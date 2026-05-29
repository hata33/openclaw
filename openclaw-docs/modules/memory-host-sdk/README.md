# memory-host-sdk — 记忆宿主 SDK

> 记忆系统的宿主 SDK。提供记忆引擎（QMD）、事件日志、查询和状态管理。
> 代理层，桥接 packages/memory-host-sdk 与 OpenClaw 主项目。

## 文件结构

| 文件 | 职责 |
|------|------|
| `dreaming.ts` | 记忆整理（dreaming）— 后台整理记忆 |
| `engine-qmd.ts` | QMD 引擎（二进制可用性检查） |
| `engine-storage.ts` | 存储引擎配置 |
| `events.ts` | 事件日志（记忆召回记录等） |
| `query.ts` | 记忆查询 |
| `multimodal.ts` | 多模态记忆 |
| `secret.ts` | 密钥配置 |
| `status.ts` | 记忆状态 |

## 核心概念

### Dreaming（记忆整理）

后台整理记忆：去重、归纳、关联。

### QMD 引擎

查询导向的记忆引擎（Query-Oriented Memory），使用二进制实现高性能。

### 事件日志

记录记忆操作事件（recall、store 等），用于审计和分析。
