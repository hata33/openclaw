# wizard — 实现流程与数据流

## Quickstart 流程

```
openclaw setup
  ↓
1. 选择语言
   prompts.select(["English", "简体中文", "繁體中文"])

2. 检测迁移
   detectSetupMigrationSources()
   → 有旧配置 → 提示导入

3. Gateway 配置
   setup.gateway-config.ts
   → 端口（默认 12587）
   → 绑定（loopback / lan）
   → 认证（token / password / none）

4. 模型配置
   → 选择 Provider（OpenAI / Anthropic / Google）
   → 输入 API Key

5. 完成
   setup.completion.ts → 显示摘要
   setup.finalize.ts → 写入配置

6. 启动
   → 启动 Gateway
   → 显示访问 URL
```

## Advanced 流程

```
openclaw setup --advanced
  ↓
（在 Quickstart 基础上增加）
→ 渠道配置（Telegram / Discord / WhatsApp...）
→ 插件选择（官方插件列表）
→ 安全配置
→ 详细配置确认
```

## 配置写入流程

```
setup.finalize.ts
  ↓
1. 构建配置对象
   OpenClawConfig

2. 写入配置文件
   createConfigIO().writeConfig(config)

3. 写入密钥
   → SecretRef 写入配置
   → 明文密钥写入 auth store

4. 提交
   commitConfigWriteWithPendingPluginInstalls()

5. 安装插件（如有）
   → npm install 插件包
```
