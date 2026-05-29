# wizard — 设置向导

> 负责首次安装和配置的交互式向导，引导用户完成 Gateway、渠道、模型和插件配置。
> 支持 quickstart（快速开始）和 advanced（高级）两种流程。

## 文件结构

| 文件 | 职责 |
|------|------|
| `setup.ts` | 向导主入口 |
| `setup.types.ts` | 类型定义（WizardFlow、GatewayWizardSettings） |
| `prompts.ts` | 交互式提示封装（基于 @clack/prompts） |
| `clack-prompter.ts` | Clack prompts 适配器 |
| `session.ts` | 向导会话管理 |
| `setup.gateway-config.ts` | Gateway 配置步骤 |
| `setup.secret-input.ts` | 密钥输入步骤 |
| `setup.plugin-config.ts` | 插件配置步骤 |
| `setup.official-plugins.ts` | 官方插件选择步骤 |
| `setup.completion.ts` | 完成步骤（配置摘要） |
| `setup.finalize.ts` | 最终化步骤（写入配置） |
| `setup.security-note.ts` | 安全说明 |
| `setup.migration-import.ts` | 迁移导入（从旧版本迁移） |
| `setup.post-install-migration.ts` | 安装后迁移 |
| `i18n/index.ts` | 国际化入口 |
| `i18n/locales/en.ts` | 英文翻译 |
| `i18n/locales/zh-CN.ts` | 简体中文翻译 |
| `i18n/locales/zh-TW.ts` | 繁体中文翻译 |

## 核心概念

- **WizardFlow** — 向导流程（quickstart / advanced）
- **Gateway 配置** — 端口、绑定地址、认证模式
- **密钥配置** — 模型 Provider API Key
- **插件选择** — 安装官方插件
- **i18n** — 支持英文、简体中文、繁体中文

## 向导流程

```
1. 选择流程（quickstart / advanced）
2. Gateway 配置（端口/绑定/认证）
3. 模型配置（选择 Provider + 输入 API Key）
4. 渠道配置（可选）
5. 插件安装（可选）
6. 安全说明
7. 配置摘要 + 确认
8. 写入配置文件
9. 启动 Gateway
```
