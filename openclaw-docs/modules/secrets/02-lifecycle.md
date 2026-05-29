# secrets — 实现流程与数据流

## 密钥解析流程

```
resolve.ts → resolveSecretRef(ref)
  ↓
1. 判断引用类型
   │
   ├→ { $env: "VAR" }
   │    process.env["VAR"]
   │    → 返回环境变量值
   │
   ├→ { $file: "/path" }
   │    readSecureFile("/path")
   │    → 检查文件权限
   │    → 读取文件内容
   │    → trim() 并返回
   │
   └→ { $exec: ["cmd", "args..."] }
        spawn("cmd", args)
        → 执行命令
        → 捕获 stdout
        → trim() 并返回
```

## 运行时密钥注入流程

```
runtime.ts → prepareSecretsRuntime(config)
  ↓
1. 快速路径检查
   canUseSecretsRuntimeFastPath()
   → 配置未变 → 使用缓存
   → 配置已变 → 重新解析

2. 收集所有密钥位置
   runtime-config-collectors.ts
   ├→ 核心配置密钥
   │    (Gateway auth, model providers)
   ├→ 渠道密钥
   │    (Telegram token, Discord token)
   ├→ 插件密钥
   │    (插件配置中的 SecretRef)
   └→ TTS 密钥
        (语音 Provider API Key)

3. 解析每个密钥引用
   for (const ref of secretRefs):
     value = resolveSecretRef(ref)

4. 注入到运行时配置
   mergeSecretsRuntimeEnv(config, resolvedSecrets)

5. 返回运行时状态
   → 包含所有已解析的密钥
```

## 配置向导流程

```
configure.ts → runSecretsConfigure()
  ↓
1. 加载当前配置
   config = loadConfig()

2. 扫描缺失的密钥
   plan = buildConfigurePlan(config)
   → 列出所有需要但未配置的密钥

3. 交互式配置
   for (const target of plan.targets):
     │
     ├→ 显示提示（隐藏名称）
     ├→ 选择密钥来源（env/file/直接输入）
     ├→ 输入密钥值
     └→ 验证密钥格式

4. 生成配置计划
   configurePlan = buildApplyPlan(targets)

5. 应用变更
   applyResult = runSecretsApply(plan)
   → 写入配置文件
   → 写入 auth store

6. 返回结果
```

## 审计流程

```
audit.ts → runSecretsAudit(config)
  ↓
1. 扫描配置中的明文密钥
   → 检测到 "sk-"、"token" 等模式

2. 检查文件权限
   inspectPathPermissions(secretFilePath)
   → 600 或更严格？

3. 检查 exec 安全性
   selectRefsForExecPolicy(refs)
   → 命令是否在白名单中？

4. 检查认证档案
   iterateAuthProfileCredentials(store)
   → 密钥是否过期？

5. 生成审计发现
   → SecurityAuditFinding[]
```

## Apply 流程

```
apply.ts → runSecretsApply(plan)
  ↓
1. 解析所有密钥值
   for (const target of plan.targets):
     value = resolveSecretRef(target.ref)

2. 写入配置文件
   updateConfig(config, { path: target.path, value })

3. 写入 auth store
   updateAuthProfileStore(store, { provider: target.provider, key: value })

4. 原子写入
   replaceConfigFile(configPath, newConfig)

5. 通知运行时刷新
   → 下次密钥解析使用新值
```

## Web 工具密钥管理

```
runtime-web-tools.ts
  ↓
1. 解析 Web 工具凭证
   → Brave API Key
   → Jina API Key
   → 其他 Web Provider

2. 生成运行时元数据
   → RuntimeWebFetchMetadata
   → RuntimeWebSearchMetadata

3. 注入到工具系统
   → web-fetch 和 web-search 使用凭证
```

## 目标注册表查询

```
target-registry-query.ts → queryTargetRegistry(type, path)
  ↓
1. 匹配模式
   target-registry-pattern.ts → glob 匹配

2. 返回目标信息
   → { type, path, label, required, provider }
```
