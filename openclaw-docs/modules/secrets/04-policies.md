# secrets — 策略、配置与边界情况

## 一、密钥引用策略

### 1.1 引用格式

| 格式 | 说明 | 安全等级 |
|------|------|----------|
| `{ $env: "VAR" }` | 环境变量 | 高 |
| `{ $file: "/path" }` | 文件读取 | 高 |
| `{ $exec: ["cmd"] }` | 执行命令 | 中（需白名单） |
| 直接字符串 | 明文值 | 低 |

### 1.2 推荐方式

- **生产环境**：使用 `$env` 或 `$file`（Docker/K8s secrets）
- **开发环境**：使用 `$env`（.env 文件）
- **CI/CD**：使用 `$exec`（从 Vault/SSM 获取）

### 1.3 引用解析顺序

```
1. 检查是否为 SecretRef 对象
   → $env → 读取环境变量
   → $file → 读取文件
   → $exec → 执行命令

2. 检查是否为字符串
   → 直接使用（明文）

3. 未配置
   → 返回 undefined
```

## 二、Exec 安全策略

### 2.1 命令白名单

`exec-resolution-policy.ts` 限制可执行的命令：

```typescript
function selectRefsForExecPolicy(refs): ExecPolicyResult
```

- 只允许预定义的安全命令
- 拒绝任意命令执行

### 2.2 超时控制

exec 命令有超时限制，防止长时间挂起。

## 三、文件安全策略

### 3.1 文件权限检查

`resolve.ts` 读取密钥文件前检查权限：

```typescript
inspectPathPermissions(filePath)
```

- 文件权限应为 600 或更严格
- 父目录权限应为 700 或更严格

### 3.2 路径安全

```typescript
isPathInside(filePath, allowedDir)
```

密钥文件必须在允许的目录内。

### 3.3 安全读取

```typescript
readSecureFile(filePath)
```

安全地读取文件，处理错误和权限问题。

## 四、审计策略

### 4.1 明文检测

检测配置中的明文密钥：

```
patterns: "sk-", "token", "password", "secret", "key"
```

### 4.2 文件权限

检查密钥文件权限是否过松。

### 4.3 环境变量泄露

检查已知密钥环境变量是否在进程环境中。

## 五、运行时策略

### 5.1 快速路径

```typescript
canUseSecretsRuntimeFastPath(snapshot, previous)
```

配置未变化时跳过重新解析，提升性能。

### 5.2 内存中的密钥

已解析的密钥存储在内存中，不会持久化到磁盘。

### 5.3 配置刷新

配置更新时运行时自动刷新密钥：

```
配置变更 → 检测变化 → 重新解析密钥 → 更新运行时状态
```

## 六、配置向导策略

### 6.1 隐藏输入

密钥输入时使用隐藏模式，不显示在终端。

### 6.2 验证

输入的密钥会进行基本格式验证：

```
OpenAI Key → 以 "sk-" 开头
Telegram Token → 数字:字母数字 格式
Discord Token → 长字符串
```

### 6.3 存储选择

用户可以选择密钥存储方式：

- 环境变量（推荐）
- Auth Profile Store（JSON 文件）
- 配置文件（不推荐）

## 七、已知边界情况

### 7.1 环境变量未设置

`$env` 引用的环境变量未设置时，解析返回 `undefined`。调用方需要处理此情况。

### 7.2 Exec 命令失败

exec 命令可能失败（命令不存在、权限不足）。错误被捕获并记录。

### 7.3 文件不存在

`$file` 引用的文件不存在时，解析返回 `undefined`。

### 7.4 循环引用

密钥引用不应产生循环（如 A 引用 B，B 引用 A）。系统不检测循环，由配置者负责。

### 7.5 大型密钥

某些密钥（如 PEM 证书）可能很长。文件读取没有大小限制，但配置文件中不适合存储。

### 7.6 并发解析

多个密钥可能并发解析。`runTasksWithConcurrency` 控制并发度。
