# node-host — 功能定义

## 解决什么问题？

Agent 运行在 Gateway 上，但需要在远程节点执行命令（如读写文件、运行脚本）。node-host 模块实现节点的命令执行能力。

## 命令执行流程

### 白名单检查

```
收到命令
  ↓
evaluateExecAllowlist(command)
  → 匹配白名单 → 直接执行
  → 不匹配 → 需要审批
```

### 审批流程

```
需要审批的命令
  ↓
1. 发送审批请求到 Gateway
   → 用户看到命令内容
   → 用户批准/拒绝

2. 持久化审批
   addDurableCommandApproval()
   → "allow always" 保存到白名单

3. 执行
   runCommandWithTimeout(command, { timeout })
   → spawn child_process
   → 返回输出
```

### 安全分析

`invoke-system-run-plan.ts` 分析命令：

- 检测内联 eval（如 `$(...)`）
- 识别危险操作
- 生成安全报告

## 超时控制

`with-timeout.ts` 提供通用超时包装：

```typescript
withTimeout(work, timeoutMs, label)
→ 使用 AbortController 取消超时操作
```
