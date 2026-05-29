# flows — 实现流程与数据流

## Doctor 诊断流程

```
doctorCommand(runtime, options)
  ↓
1. 打印向导标题
   printWizardHeader(runtime)

2. 核心检查
   doctor-core-checks.ts
   → 配置文件有效性
   → Gateway 进程状态
   → 密钥有效性
   → 端口可用性

3. 收集健康贡献
   doctor-health-contributions.ts
   → 内置检查 + 插件贡献

4. 执行检查
   health-check-runner
   → 运行所有注册的检查
   → 收集发现

5. 显示结果
   → info/warning/error 分级显示
   → 提供修复建议

6. 修复流程（如有问题）
   doctor-repair-flow.ts
   → 交互式修复
   → 自动修复或手动指导

7. 完成摘要
   → 修复了 N 个问题
   → 剩余 W 个警告
```

## 渠道设置流程

```
channel-setup.ts
  ↓
1. 发现可用渠道
   resolveChannelSetupEntries()
   → 列出所有渠道插件

2. 选择渠道
   用户选择要配置的渠道

3. 安装插件（如需）
   ensureChannelSetupPluginInstalled()

4. 运行设置向导
   ChannelSetupWizardAdapter
   → 输入凭证
   → 测试连接
   → 保存配置

5. 验证
   channel-setup.status.ts
   → 检查渠道连接状态
```

## Provider 配置流程

```
provider-flow.ts
  ↓
1. 列出 Provider 选项
   providerInstallCatalog → Provider 列表

2. 选择 Provider
   用户选择要配置的 Provider

3. 输入凭证
   → API Key / OAuth

4. 测试连接
   → 调用 Provider API 验证

5. 保存配置
   → 写入配置文件
```

## 健康检查运行流程

```
health-check-registry.ts
  ↓
1. 收集所有检查
   → 内置检查（bundled-health-checks）
   → 插件注册的检查

2. 运行检查
   for (const check of checks):
     findings = await check.run()

3. 分类结果
   → error: 必须修复
   → warning: 建议修复
   → info: 信息性提示

4. 返回结果
```
