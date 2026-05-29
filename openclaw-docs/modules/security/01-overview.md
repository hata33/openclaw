# security — 功能定义与设计思想

## 这个模块解决什么问题？

OpenClaw 是一个拥有执行能力的 AI 助手——它可以执行命令、读写文件、发送消息。这些能力一旦被滥用，后果严重。安全系统解决的核心问题：

1. **配置安全** — 检测不安全的配置（认证缺失、端口暴露、危险标志开启）
2. **执行安全** — 限制命令执行和文件系统访问
3. **内容安全** — 防止外部内容注入（邮件钓鱼、Webhook 注入）
4. **路径安全** — 防止路径穿越和目录逃逸
5. **正则安全** — 防止 ReDoS 攻击

## 设计思想

### 1. 分层审计

安全审计分为三个深度：

```
非深度审计（快速）
  → 配置基础检查、权限检查、暴露面检查
  → 秒级完成

深度审计（耗时）
  → 插件代码安全扫描、技能文件扫描
  → 分钟级完成

扩展审计（可插拔）
  → 同步/异步扩展点
  → 外部安全模块可以注入自定义检查
```

### 2. 发现分级

```typescript
type SecurityAuditSeverity = "info" | "warn" | "critical";
```

| 级别 | 含义 | 示例 |
|------|------|------|
| `info` | 信息性建议 | 建议设置显式默认账户 |
| `warn` | 需要关注的安全问题 | 未配置认证的端口 |
| `critical` | 必须修复的安全漏洞 | 无认证的 Gateway 暴露在公网 |

### 3. 外部内容安全

外部内容（邮件、Webhook、网页）绝不能直接插入系统提示词：

```typescript
// wrapExternalContent — 将外部内容包裹在安全边界中
// 标记来源、注入防护标记、监控可疑模式
```

**可疑模式检测**：

```typescript
const SUSPICIOUS_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /forget\s+(everything|all|your)\s+(instructions?|rules?|guidelines?)/i,
  // ... 更多注入模式
];
```

检测到可疑模式时记录日志，但内容仍被安全包装后处理（不丢弃，因为可能有误报）。

### 4. 系统标签清理

防止用户消息伪造系统标签：

```typescript
// "[System Message]" → "(System Message)"
// "System:" → "System (untrusted):"
```

确保 LLM 不会将用户内容误认为系统指令。

### 5. ReDoS 防护

`safe-regex.ts` 分析正则表达式模式，检测可能导致灾难性回溯的模式：

```
危险模式: /(a+)+$/  — 嵌套量词 + 回溯
安全模式: /^[a-z]+$/ — 简单字符类
```

配置中的正则表达式（如 `allowFrom` 匹配规则）都必须通过安全检查。

### 6. 时序安全比较

密钥比较使用 `timingSafeEqual`，防止时序攻击：

```typescript
function safeEqualSecret(provided: string, expected: string): boolean {
  // 长度不同时填充到相同长度再比较
  // 确保比较时间不依赖于内容
}
```

### 7. 危险配置标志

系统检测配置中的不安全标志：

```typescript
// 检测的标志示例：
"gateway.controlUi.allowInsecureAuth=true"
"gateway.controlUi.dangerouslyDisableDeviceAuth=true"
"hooks.gmail.allowUnsafeExternalContent=true"
"tools.exec.elevated=true"
```

### 8. Gateway HTTP 工具黑名单

通过 HTTP API 暴露的工具有严格限制：

```typescript
const DEFAULT_GATEWAY_HTTP_TOOL_DENY = [
  "exec",           // 命令执行
  "spawn",          // 子进程创建
  "shell",          // Shell 执行
  "fs_write",       // 文件写入
  "fs_delete",      // 文件删除
  "fs_move",        // 文件移动
  "apply_patch",    // 补丁应用
  "sessions_spawn", // Agent 创建
  "sessions_send",  // 跨会话消息
  "cron",           // 定时任务
  // ...更多
];
```

### 9. 技能文件扫描

`skill-scanner.ts`（759 行）静态分析技能文件，检测潜在安全问题：

```
扫描规则：
- 检测 eval() 调用
- 检测 exec/spawn 使用
- 检测网络请求
- 检测文件系统操作
- 检测环境变量访问
```

### 10. 自动修复

`fix.ts`（473 行）提供安全问题自动修复能力：

- 文件权限修复（chmod/icacls）
- 配置自动修正
- Windows ACL 重置

## 模块在系统中的位置

```
Gateway 启动 → security.audit() → 生成安全报告
    ↓ 发现问题 → security.fix() → 自动修复

消息入站 → external-content 安全包装
    ↓
system-tags 清理 → 防止标签伪造

配置加载 → dangerous-config-flags 检测
    ↓
safe-regex 验证 → 防止 ReDoS

技能安装 → skill-scanner 扫描 → 安全检查
```

安全模块是贯穿整个系统的横切关注点。
