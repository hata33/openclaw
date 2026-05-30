# 23 — 节点宿主与远程执行

> OpenClaw 的节点宿主模块（Node Host）允许 Agent 在配对的远程设备上
> 执行命令、管理文件、调用系统功能，同时通过严格的策略控制确保安全。

## 设计思想

```
Agent 运行在 Gateway 服务器上
  → 但用户有手机、电脑等多台设备
  → Agent 需要在这些设备上执行操作
  → 通过节点配对 + 远程执行实现
```

## 架构

```
┌──────────────────┐         ┌──────────────────┐
│   OpenClaw        │  配对    │   远程节点        │
│   Gateway         │◄──────►│   (手机/电脑)     │
│                   │  通道    │                   │
│  node-host 模块   │         │  Node App         │
│  exec 策略控制    │         │  命令执行沙箱      │
└──────────────────┘         └──────────────────┘
```

## 执行策略

`src/node-host/exec-policy.ts` — 控制远程命令执行的权限：

```typescript
type ExecPolicy = {
  allowed: boolean;
  // 限制条件
  allowedCommands?: string[];    // 允许的命令列表
  deniedCommands?: string[];     // 禁止的命令列表
  requireApproval?: boolean;     // 是否需要审批
  sandboxed?: boolean;           // 是否沙箱执行
  maxTimeout?: number;           // 最大超时
};
```

### 策略检查流程

```
Agent 请求在节点上执行命令
  → exec-policy.ts 检查策略
  → 命令在 allowlist? → 直接执行
  → 命令在 denylist? → 拒绝
  → 未匹配 → requireApproval → 等待用户审批
```

## 系统运行白名单

`src/node-host/invoke-system-run-allowlist.ts` — 预定义的安全命令白名单：

```
允许的命令（安全，无需审批）：
  → echo, cat, ls, pwd, whoami
  → date, uname
  → git status, git log

需要审批的命令：
  → rm, mv, cp（文件修改）
  → apt, brew, npm install（包管理）
  → curl, wget（网络请求）

禁止的命令：
  → sudo, su（权限提升）
  → mkfs, dd（磁盘操作）
```

## 执行计划

`src/node-host/invoke-system-run-plan.ts` — 将执行请求转换为执行计划：

```
执行请求
  → 解析命令和参数
  → 生成执行计划
    → 命令路径
    → 参数列表
    → 环境变量
    → 工作目录
    → 超时设置
  → 策略检查
  → 执行或拒绝
```

## invoke 调用

`src/node-host/invoke-system-run.ts` — 实际的远程调用执行：

```
执行计划已批准
  → 通过节点配对通道发送 invoke 请求
  → 节点 App 接收请求
  → 在本地沙箱中执行命令
  → 捕获 stdout/stderr
  → 返回结果给 Gateway
```

### 环境变量清理

`src/node-host/invoke.sanitize-env.ts` — 清理传递给远程命令的环境变量：

```
传递给远程命令的环境变量
  → 移除敏感变量（API Key、Token）
  → 只传递必要的系统变量
  → 防止凭证泄露到远程进程
```

## 配置

```yaml
nodeHost:
  execPolicy:
    defaultAction: "deny"          # 默认拒绝
    allowedCommands:               # 白名单
      - "ls"
      - "cat"
      - "git status"
    requireApproval: true          # 未匹配的命令需要审批
    maxTimeout: 30000              # 最大超时 30 秒
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/node-host/exec-policy.ts` | 执行策略控制 |
| `src/node-host/invoke-system-run.ts` | 远程命令执行 |
| `src/node-host/invoke-system-run-allowlist.ts` | 安全命令白名单 |
| `src/node-host/invoke-system-run-plan.ts` | 执行计划生成 |
| `src/node-host/invoke.sanitize-env.ts` | 环境变量清理 |
| `src/node-host/config.ts` | 节点配置 |

## 总结

1. **远程执行** — Agent 可在配对的远程设备上执行命令
2. **策略控制** — 严格的白名单/黑名单/审批机制
3. **安全优先** — 环境变量清理、沙箱执行、超时控制
4. **执行计划** — 命令在执行前先解析为计划，通过策略检查
