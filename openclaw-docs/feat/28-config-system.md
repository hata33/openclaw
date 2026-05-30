# 28 — 配置系统

> OpenClaw 的配置系统采用分层、类型安全的设计，支持热重载、
> 环境变量替换、Schema 校验和 Doctor 迁移。

## 分层配置

```
配置优先级（高 → 低）：
1. 命令行参数 / 环境变量
2. 用户配置文件 (~/.openclaw/config.yaml)
3. Agent 级配置覆盖
4. 插件默认配置
5. 系统默认值
```

## 核心能力

### 热重载

配置文件变更后无需重启 Gateway：

```
config.yaml 修改
  → 文件监听检测变更
  → 解析新配置
  → 热重载（部分配置项）
  → 需要重启的配置项 → 提示用户
```

### 环境变量替换

```yaml
channels:
  telegram:
    token: "${TELEGRAM_BOT_TOKEN}"    # 从环境变量读取
    # 或直接使用 secrets 引用
    token: "${secrets.telegram_token}"
```

### Schema 校验

`config.schema.lookup` — 每个配置项都有精确的类型定义和校验规则：

```
配置写入前
  → Schema 校验
  → 类型检查
  → 范围检查
  → 无效配置 → 报错并拒绝
```

### Doctor 迁移

配置格式升级时自动迁移：

```
版本升级导致配置格式变化
  → openclaw doctor --fix
  → 检测旧格式
  → 解释变更
  → 备份旧配置
  → 重写为新格式
```

## 运行时快照

`src/config/runtime-snapshot.ts` — 配置的不可变快照：

```
配置读取
  → 生成快照（不可变）
  → 同一次运行中使用同一快照
  → 避免配置中途变更导致不一致
```

## 配置文件结构

```yaml
# 核心配置
gateway:
  port: 3000
  host: "localhost"

# Agent 配置
agents:
  main:
    model: "claude-sonnet-4"
    tools:
      profile: "default"

# 渠道配置
channels:
  telegram:
    enabled: true
    token: "${TELEGRAM_BOT_TOKEN}"

# 工具配置
tools:
  web:
    search:
      provider: "brave"

# 模型配置
models:
  default: "claude-sonnet-4"

# 插件配置
plugins:
  entries:
    memory-lancedb:
      enabled: true
```

## 关键代码入口

| 文件/目录 | 职责 |
|-----------|------|
| `src/config/` | 配置系统核心 |
| `src/config/types.openclaw.ts` | 配置类型定义 |
| `src/config/config.ts` | 配置读取 |
| `src/config/runtime-snapshot.ts` | 运行时快照 |
| `src/config/paths.ts` | 路径解析 |
| `src/config/model-input.ts` | 模型配置输入 |

## 总结

1. **分层设计** — 多层配置按优先级合并
2. **热重载** — 配置变更实时生效
3. **类型安全** — Schema 校验确保配置正确
4. **环境变量** — 敏感信息通过环境变量注入
5. **自动迁移** — Doctor 机制处理配置升级
