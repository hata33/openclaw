# secrets — 功能定义与设计思想

## 这个模块解决什么问题？

OpenClaw 需要管理大量敏感凭证：OpenAI API Key、Telegram Bot Token、数据库密码等。这些凭证不能明文写在配置中。

secrets 模块解决的核心问题：

1. **密钥引用** — 配置中不存明文，只存引用
2. **多种来源** — 环境变量、文件、exec 命令
3. **安全解析** — 运行时解析密钥值
4. **审计** — 检测泄露的密钥

## 密钥引用（SecretRef）

配置中的密钥通过引用表示：

```typescript
type SecretRef = 
  | { $env: "OPENAI_API_KEY" }              // 环境变量
  | { $file: "/path/to/key.txt" }           // 文件
  | { $exec: "aws ssm get-parameter ..." }  // 执行命令
  | string;                                  // 直接值（不安全）
```

### 解析优先级

```
$env → 读取环境变量
$file → 读取文件内容
$exec → 执行命令获取输出
string → 直接使用值
```

## 密钥提供者

### env — 环境变量

```yaml
apiKey: { $env: "OPENAI_API_KEY" }
```

### file — 文件

```yaml
apiKey: { $file: "/run/secrets/openai_key" }
```

支持 Docker secrets、Kubernetes secrets 等。

### exec — 执行命令

```yaml
apiKey: { $exec: ["aws", "ssm", "get-parameter", "--name", "/openai/key"] }
```

运行时执行命令获取密钥。支持 AWS SSM、Vault 等外部密钥管理。

## 设计思想

### 1. 引用与值分离

配置文件只存引用，密钥值在运行时解析：

```
配置: apiKey: { $env: "OPENAI_API_KEY" }
运行时: apiKey → "sk-proj-abc123..."
```

### 2. Target Registry

目标注册表定义密钥应该出现在配置的哪个位置：

```typescript
type SecretsPlanTarget = {
  type: "model-provider";      // 目标类型
  path: "models.providers.openai.apiKey";  // 配置路径
  label: "OpenAI API Key";     // 显示名称
  required: boolean;           // 是否必需
};
```

### 3. 快速路径优化

`runtime-fast-path.ts` 检测配置是否变化，未变化时跳过重新解析：

```typescript
canUseSecretsRuntimeFastPath(configSnapshot, previousSnapshot)
```

### 4. 审计

`audit.ts` 扫描配置和运行时状态，检测：

- 明文密钥（应使用 SecretRef）
- 文件权限过松
- Exec 命令安全性
- 未使用的密钥引用

### 5. 交互式配置

`configure.ts` 提供交互式密钥配置向导：

```
$ openclaw secrets configure
→ 选择要配置的服务
→ 输入 API Key（隐藏输入）
→ 选择存储方式（env/file/auth-store）
→ 确认并应用
```

### 6. Apply 流程

`apply.ts` 将解析后的密钥写入目标：

```
1. 收集所有密钥目标
2. 解析密钥引用
3. 写入配置文件
4. 写入 auth store
5. 通知运行时刷新
```
