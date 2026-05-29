# memory — 记忆系统

> 管理 Agent 的长期记忆文件（MEMORY.md），处理规范化路径、旧格式迁移和修复目录。
> 是 Agent 跨会话记忆持久化的基础设施。

## 文件结构

| 文件 | 职责 |
|------|------|
| `root-memory-files.ts` | 根记忆文件管理（MEMORY.md 路径解析、旧格式检测、修复目录） |

## 核心概念

- **MEMORY.md** — Agent 的主记忆文件，存储长期记忆
- **memory.md**（旧格式）— 已废弃的旧文件名
- **Repair Dir** — 记忆文件修复时的临时目录（`.openclaw-repair/root-memory/`）

## 功能

1. 解析 MEMORY.md 的规范路径
2. 检测旧格式（memory.md）的存在
3. 识别修复辅助路径（跳过扫描）
4. 确认文件存在且非符号链接

## 与其他模块的关系

```
memory (记忆文件) ← 本模块
    ↓ 提供 MEMORY.md 路径
agents (Agent 运行时)
    ↓ 读取/写入记忆
config/sessions (会话持久化)
```
