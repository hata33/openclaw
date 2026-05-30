# 35 — 密钥管理

> OpenClaw 的密钥模块（Secrets）安全地管理 API Key、Token 等敏感凭证，
> 提供统一的存储、检索和注入接口。

## 设计思想

```
OpenClaw 需要管理大量敏感凭证：
  → 模型 Provider API Key（OpenAI、Anthropic、Google...）
  → 渠道 Token（Telegram Bot Token、Discord Token...）
  → 第三方服务凭证（Brave API Key、Tavily API Key...）
  → 加密密钥

密钥系统确保：
  → 凭证不暴露在配置文件中
  → 运行时按需解密
  → 审计凭证访问
  → 安全传递给子进程
```

## 架构

```
┌─────────────────────────────────────┐
│           Secrets Manager            │
│                                     │
│  ┌──────────┐  ┌──────────────────┐ │
│  │ 环境变量  │  │ 加密存储文件     │ │
│  │ (env)    │  │ (secrets store)  │ │
│  └──────────┘  └──────────────────┘ │
│                                     │
│  ┌──────────┐  ┌──────────────────┐ │
│  │ 配置引用  │  │ Provider 环境变量│ │
│  │ (${...})  │  │ (provider-env)  │ │
│  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────┘
```

## 凭证来源

### 1. 环境变量

```
BRAVE_API_KEY=xxx
OPENAI_API_KEY=xxx
  → 自动检测并使用
```

### 2. 配置引用

```yaml
channels:
  telegram:
    token: "${secrets.telegram_token}"
```

### 3. Provider 环境变量

`src/secrets/provider-env-vars.ts` — 每个 Provider 声明需要的环境变量：

```
Provider 插件声明需要 API_KEY
  → provider-env-vars 查找环境变量
  → 找到 → 注入到 Provider
  → 未找到 → Provider 不可用
```

### 4. 运行时 Web 工具元数据

`src/secrets/runtime-web-tools-state.ts` — Web 工具凭证的运行时状态：

```
Web 搜索/抓取的凭证
  → 可能通过 UI 动态配置
  → 运行时元数据追踪状态
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/secrets/provider-env-vars.ts` | Provider 环境变量管理 |
| `src/secrets/runtime-web-tools-state.ts` | Web 工具凭证状态 |
| `src/secrets/runtime-web-tools.types.ts` | Web 工具凭证类型 |

## 总结

1. **统一管理** — 所有敏感凭证通过统一接口管理
2. **多来源** — 环境变量、配置引用、加密存储
3. **安全传递** — 凭证不暴露在日志和配置中
4. **Provider 集成** — 自动为 Provider 注入所需凭证
