# node-host — 节点宿主

> OpenClaw 节点的宿主运行时。连接 Gateway，接收指令，执行命令。
> 实现 Agent 在远程节点上的命令执行、审批和文件操作。

## 文件结构

| 文件 | 行数 | 职责 |
|------|------|------|
| `runner.ts` | 节点启动器（连接 Gateway、注册能力） |
| `invoke.ts` | 命令执行（spawn + 审批） |
| `invoke-system-run.ts` | 系统命令执行（带审批和审计） |
| `invoke-system-run-plan.ts` | 执行计划（命令分析和安全检查） |
| `invoke-system-run-allowlist.ts` | 执行白名单（允许/拒绝判断） |
| `invoke-types.ts` | 调用类型定义 |
| `config.ts` | 节点配置（Gateway 连接信息） |
| `plugin-node-host.ts` | 节点宿主插件注册 |
| `exec-policy.ts` | 执行策略 |
| `with-timeout.ts` | 超时包装 |

## 核心概念

### 节点（Node）

远程设备（服务器/电脑）上运行的 OpenClaw 客户端，通过 WebSocket 连接 Gateway。

### 命令执行

Agent 通过 Gateway 向节点发送执行命令请求，节点执行并返回结果。

### 审批机制

敏感命令需要用户审批：

```
Agent 请求执行命令
  → 节点检查白名单
  → 不在白名单 → 请求用户审批
  → 用户批准 → 执行
  → 用户拒绝 → 返回拒绝
```

## 连接流程

```
节点启动
  ↓
1. 加载配置
   ensureNodeHostConfig()

2. 加载设备身份
   loadOrCreateDeviceIdentity()

3. 连接 Gateway
   GatewayClient.connect({ url, auth })

4. 注册能力
   → 可用命令列表
   → 执行白名单

5. 等待指令
   → 接收 Gateway 下发的命令
   → 执行并返回结果
```
