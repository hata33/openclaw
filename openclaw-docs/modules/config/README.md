# config — 配置系统

> 207 文件，44306 行。OpenClaw 的配置管理系统。
> 支持 YAML/JSON 配置文件、环境变量、SecretRef。

## 子模块

| 子目录 | 说明 |
|--------|------|
| `sessions/` | 会话配置管理 |

## 核心能力

### 配置文件

`openclaw.yaml` 或 `openclaw.json`：

```yaml
model: gpt-4o
provider: openai
channels:
  telegram:
    accounts:
      bot1:
        token: $env:TELEGRAM_BOT_TOKEN
```

### SecretRef

密钥引用机制，避免明文存储：

```yaml
apiKey: $env:OPENAI_API_KEY     # 环境变量引用
apiKey: $file:/path/to/key      # 文件引用
```

### 会话配置

每个会话可以有独立配置覆盖。

### 类型系统

完整的 TypeScript 类型定义，确保配置正确性。
