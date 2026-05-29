# test-utils — 测试工具

> 全面的测试工具集：模拟、断言、夹具、环境管理。
> 33 个文件，为集成测试和单元测试提供基础设施。

## 核心工具

| 类别 | 文件 | 说明 |
|------|------|------|
| 模拟 | `fetch-mock.ts`, `mock-http-response.ts` | HTTP 请求模拟 |
| 认证 | `auth-token-assertions.ts` | Token 断言 |
| 环境 | `env.ts`, `temp-dir.ts`, `temp-home.ts` | 测试环境 |
| 插件 | `plugin-registration.ts`, `plugin-runtime-env.ts` | 插件测试 |
| 会话 | `session-conversation-registry.ts`, `session-state-cleanup.ts` | 会话测试 |
| 命令 | `command-runner.ts`, `exec-assertions.ts` | 命令执行 |
| 时间 | `frozen-time.ts` | 时间冻结 |
| 端口 | `ports.ts` | 端口分配 |
| 夹具 | `fixture-suite.ts`, `secret-file-fixture.ts` | 测试夹具 |

## 设计

每个文件提供特定领域的测试辅助，避免测试代码重复。
