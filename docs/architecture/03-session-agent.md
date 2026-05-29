# 会话与代理层 (Session & Agent Layer)

> 管理对话的核心生命周期：会话创建、Agent 调度、对话运行控制与多步流程编排。

## 目录结构

```
src/
├── sessions/                        # 会话管理
│   ├── session-id.ts                # 会话 ID 生成与解析
│   ├── session-id-resolution.ts     # 会话 ID 解析策略
│   ├── session-key-utils.ts         # 会话 Key 工具
│   ├── session-chat-type.ts         # 会话聊天类型（DM/Group）
│   ├── session-chat-type-shared.ts  # 共享聊天类型
│   ├── classify-session-kind.ts     # 会话分类
│   ├── input-provenance.ts          # 输入来源追踪
│   ├── model-overrides.ts           # 模型覆盖
│   ├── level-overrides.ts           # 级别覆盖
│   └── send-policy.ts              # 发送策略
│
├── agents/                          # Agent 管理
│   ├── agent-scope.ts               # Agent 作用域隔离
│   ├── agent-runtime-config.ts      # 运行时配置
│   ├── agent-runtime-metadata.ts    # 运行时元数据
│   ├── agent-delete-safety.ts       # 删除安全检查
│   ├── agent-command.ts             # Agent 命令
│   ├── accepted-session-spawn.ts    # 会话 spawn 接受
│   ├── acp-spawn.ts                 # ACP 子 Agent 调度
│   ├── acp-runtime-overlay.ts       # ACP 运行时覆盖
│   ├── auth-profiles/               # 认证配置
│   ├── cli-runner/                  # CLI 运行器
│   ├── command/                     # 命令处理
│   ├── harness/                     # Agent 运行环境
│   ├── pi-embedded-runner/          # Pi 嵌入式运行器
│   ├── pi-embedded-helpers/         # Pi 嵌入式辅助
│   ├── pi-hooks/                    # Pi 钩子
│   ├── runtime-plan/                # 运行计划
│   ├── sandbox/                     # 沙箱环境
│   ├── schema/                      # Schema 定义
│   ├── skills/                      # 技能管理
│   ├── templates/                   # 模板系统
│   └── tools/                       # Agent 工具
│
├── talk/                            # 对话运行控制
│   ├── agent-run-control.ts         # Agent 运行控制（开始/中断/恢复）
│   ├── agent-consult-runtime.ts     # Agent 咨询运行时
│   ├── agent-consult-tool.ts        # Agent 咨询工具
│   ├── agent-talkback-runtime.ts    # Agent 回传运行时
│   └── activation-name.ts           # 激活名称
│
└── flows/                           # 多步流程编排
    └── ...                          # 流程状态机
```

## 核心设计

### 会话 (Sessions)
会话是用户与 Agent 交互的基本单元。每个会话有唯一 ID，包含聊天类型、模型配置等元数据。

- **会话分类**：DM（私聊）、Group（群聊）、Direct（直连）
- **输入来源**：追踪消息来自哪个渠道
- **模型覆盖**：允许特定会话使用不同模型
- **发送策略**：控制消息发送行为

### Agent
Agent 是 AI 助手的运行实例，具有独立的作用域和配置。

- **作用域隔离**：每个 Agent 有独立的配置、记忆和技能
- **运行时配置**：动态调整 Agent 行为
- **子 Agent (ACP)**：支持 spawn 子 Agent 处理子任务
- **沙箱环境**：限制 Agent 的文件系统和命令执行权限
- **模板系统**：预定义 Agent 配置模板

### 对话控制 (Talk)
管理 Agent 的实际运行过程：
- 运行控制：开始、中断、恢复
- 咨询模式：agent-consult 让 Agent 之间可以协作
- 回传机制：将 Agent 输出回传到渠道

### 流程编排 (Flows)
多步骤任务的编排系统，类似状态机，管理复杂任务的执行顺序和状态转换。
