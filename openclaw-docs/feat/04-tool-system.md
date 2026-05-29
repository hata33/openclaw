# 04 — 工具系统

> OpenClaw 的工具系统赋予 Agent "动手能力"——不只是聊天，还能执行命令、读写文件、
> 浏览网页、控制浏览器。工具是 Agent 与真实世界交互的桥梁。

## 工具架构

```
Agent Loop
  → LLM 返回 tool_call
  → Tool Planner（工具规划器）
  → Tool Descriptor（工具描述）
  → Tool Executor（工具执行器）
  → 执行结果返回 Agent Loop
```

### 工具描述符（Tool Descriptor）

每个工具通过 `defineToolDescriptor` 注册，声明自己的能力：

```typescript
interface ToolDescriptor {
  id: string;                    // 工具唯一标识
  label: string;                 // 显示名称
  description: string;           // 功能描述（给 LLM 看的）
  parameters: JSONSchema;        // 参数 schema
  owner: ToolOwnerRef;           // 工具归属（哪个插件提供）
  availability: ToolAvailabilitySignal;  // 可用性信号
}
```

### 工具可用性

不是所有工具在所有场景都可用。可用性信号决定工具是否暴露给 LLM：

```typescript
type ToolAvailabilitySignal =
  | { kind: "always" }           // 始终可用
  | { kind: "config-gated" }    // 配置门控
  | { kind: "capability-gated" } // 能力门控（如需要浏览器）
  | { kind: "session-gated" }   // 会话门控（如沙箱中不可用）
  | { kind: "deny"; reason: string };  // 显式拒绝
```

## 工具规划（Tool Planner）

Tool Planner 负责在每次 LLM 调用前决定暴露哪些工具：

```
Agent Loop 请求工具列表
  → 收集所有已注册工具
  → 过滤不可用的工具
  → 应用安全策略
  → 返回可用工具列表给 LLM
```

### 安全策略

工具规划器会应用安全约束：

1. **沙箱限制**：非 main Session 在沙箱中运行时，部分工具被禁用
2. **权限检查**：某些工具需要特定权限
3. **频率限制**：防止工具被滥用

## 内置工具

OpenClaw 提供丰富的内置工具：

### 文件操作
| 工具 | 功能 |
|------|------|
| `read` | 读取文件内容（支持文本和图片） |
| `write` | 写入文件 |
| `edit` | 精确编辑文件（基于文本替换） |
| `dir_list` | 列出目录内容 |
| `dir_fetch` | 获取目录树（打包为 tarball） |
| `file_fetch` | 从远程节点获取文件 |

### 命令执行
| 工具 | 功能 |
|------|------|
| `exec` | 执行 shell 命令 |
| `process` | 管理后台进程 |

### 网络
| 工具 | 功能 |
|------|------|
| `web_search` | 搜索网页 |
| `web_fetch` | 抓取网页内容 |
| `browser` | 控制浏览器自动化 |

### 会话管理
| 工具 | 功能 |
|------|------|
| `sessions_list` | 列出活跃会话 |
| `sessions_history` | 获取会话历史 |
| `sessions_send` | 向其他会话发送消息 |
| `sessions_spawn` | 创建子 Agent |

### 通信
| 工具 | 功能 |
|------|------|
| `message` | 发送消息到渠道 |
| `tts` | 文本转语音 |

### 可视化
| 工具 | 功能 |
|------|------|
| `canvas` | 在 Canvas 上展示 HTML/渲染内容 |

## 工具执行流程

以 `exec` 工具为例：

```
LLM: tool_call(exec, { command: "ls -la" })
  → Tool Planner 检查可用性
  → 检查安全策略（是否在沙箱中？命令是否允许？）
  → 如果需要审批 → 提示用户 /approve
  → 执行命令（spawn child_process）
  → 收集 stdout/stderr
  → 返回结果给 Agent Loop
  → Agent Loop 将结果发送给 LLM
  → LLM 基于结果生成回复
```

### 审批机制

某些高危操作需要用户审批：

```typescript
// 工具执行标记为需要审批
if (requiresApproval(tool, params)) {
  return {
    status: "approval-pending",
    approvalId: "xxx",
    message: "Command requires approval. Run /approve to proceed."
  };
}
```

## MCP（Model Context Protocol）支持

OpenClaw 支持 MCP 服务器作为工具来源：

```yaml
tools:
  mcp:
    servers:
      - name: "filesystem"
        command: "npx"
        args: ["@anthropic/mcp-filesystem"]
```

MCP 服务器提供的工具会被自动注册，与内置工具一起暴露给 LLM。

## 技能（Skills）作为工具源

技能也可以提供工具。技能定义在 workspace 的 `skills/` 目录下：

```
skills/
  web-tools-guide/
    SKILL.md      ← 技能描述文件（告诉 Agent 如何使用）
    tool.ts       ← 可选：技能提供的工具实现
```

`SKILL.md` 是给 Agent 看的指令文档，告诉 Agent 在什么场景下使用什么工具、怎么处理错误。

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/tools/descriptors.ts` | `defineToolDescriptor` 定义 |
| `src/tools/planner.ts` | Tool Planner（工具规划） |
| `src/tools/availability.ts` | 工具可用性评估 |
| `src/tools/execution.ts` | 工具执行 |
| `src/tools/protocol.ts` | 工具协议 |
| `src/plugins/tools.ts` | 插件工具注册 |
| `src/plugins/host-tool-param-parsers.ts` | 主机工具参数解析 |

## 总结

1. **工具是 Agent 的"手"** — 让 Agent 能执行真实操作
2. **声明式注册** — 通过 `defineToolDescriptor` 声明工具能力
3. **可用性门控** — 根据场景动态决定工具是否可用
4. **安全第一** — 高危操作需要用户审批
5. **可扩展** — 内置工具 + MCP + 技能三层来源
