# acp — 功能定义

## 解决什么问题？

外部 AI 编码工具（Claude Code、Cursor）需要与 OpenClaw Agent 交互。ACP 提供标准化协议。

## 审批分类

`approval-classifier.ts` 根据操作类型自动分类审批级别：

- 自动批准（读取操作）
- 需要确认（写入操作）
- 需要明确批准（危险操作）

## 会话血缘

`session-lineage-meta.ts` 跟踪 ACP 会话与 OpenClaw 会话的血缘关系。

## 事件账本

`event-ledger.ts` 记录所有 ACP 事件，用于审计。
