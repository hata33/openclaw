# trajectory — 策略、配置与边界情况

## 一、大小限制策略

### 1.1 三级限制

| 限制 | 值 | 说明 |
|------|-----|------|
| 单次捕获 | 10 MB | 单个 Agent 运行最大捕获量 |
| 单文件 | 50 MB | 单个 JSONL 文件最大 |
| 单事件 | 256 KB | 单个事件数据最大 |

### 1.2 截断处理

超过限制的事件数据被截断，保留前 N 字节并标记 `[truncated]`。

## 二、安全策略

### 2.1 脱敏

所有轨迹数据经过双重脱敏：

```
1. sanitizeDiagnosticPayload(event) → 移除敏感字段
2. redactSupportString(text) → 替换 API Key/Token 模式
```

### 2.2 O_NOFOLLOW

Pointer 文件使用 `O_NOFOLLOW` 标志打开，拒绝符号链接：

```typescript
constants.O_NOFOLLOW
```

### 2.3 路径安全

```typescript
safeTrajectorySessionFileName(sessionId)
// 移除所有非字母数字字符，最多 120 字符
```

### 2.4 导出目录限制

导出目录必须在工作区内：

```typescript
isPathInside(workspaceDir, exportDir)
```

## 三、性能策略

### 3.1 队列化写入

使用 `QueuedFileWriter` 异步写入，不阻塞 Agent 主循环。

### 3.2 条件启用

轨迹记录可通过配置启用/禁用：

```typescript
parseBooleanValue(env?.OPENCLAW_TRAJECTORY_CAPTURE)
```

默认关闭（生产环境），调试时启用。

## 四、清理策略

### 4.1 过期清理

`cleanup.ts` 清理关联的轨迹文件和 pointer 文件。

### 4.2 文件验证

清理前验证文件路径在预期目录内，防止误删。

## 五、已知边界情况

### 5.1 高频事件

Agent 调用大量工具时可能产生大量事件。队列化写入确保不阻塞。

### 5.2 进程崩溃

使用同步文件写入确保崩溃时数据不丢失（但可能最后一行不完整）。

### 5.3 配置快照

元数据中的配置快照经过脱敏，但可能遗漏非标准字段中的敏感信息。
