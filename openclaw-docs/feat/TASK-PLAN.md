# 模块文档生成任务清单

## 任务目标
为 OpenClaw 项目所有 src/ 模块生成完整文档，每个模块包含：
- README.md — 索引与概述
- 01-overview.md — 功能定义、设计思想
- 02-lifecycle.md — 实现流程、数据流
- 03-capabilities.md — 能力清单、对外接口
- 04-policies.md — 策略、配置、边界情况

## 优先级定义
- P0（核心）：理解项目必须掌握的模块
- P1（重要）：日常开发频繁接触的模块
- P2（一般）：辅助性/工具性模块
- P3（低优先级）：兼容层、测试工具、脚本等

## 进度追踪
- [ ] = 待执行
- [x] = 已完成
- [~] = 进行中

---

## P0 — 核心模块（必须首先完成）

### 1. gateway — 网关层
- [ ] README.md
- [ ] 01-overview.md
- [ ] 02-lifecycle.md
- [ ] 03-capabilities.md
- [ ] 04-policies.md

### 2. sessions — 会话管理
- [ ] README.md
- [ ] 01-overview.md
- [ ] 02-lifecycle.md
- [ ] 03-capabilities.md
- [ ] 04-policies.md

### 3. agents — Agent 运行时
- [ ] README.md
- [ ] 01-overview.md
- [ ] 02-lifecycle.md
- [ ] 03-capabilities.md
- [ ] 04-policies.md

### 4. plugins — 插件系统
- [ ] README.md
- [ ] 01-overview.md
- [ ] 02-lifecycle.md
- [ ] 03-capabilities.md
- [ ] 04-policies.md

### 5. plugin-sdk — 插件 SDK
- [ ] README.md
- [ ] 01-overview.md
- [ ] 02-lifecycle.md
- [ ] 03-capabilities.md
- [ ] 04-policies.md

### 6. channels — 渠道系统
- [ ] README.md
- [ ] 01-overview.md
- [ ] 02-lifecycle.md
- [ ] 03-capabilities.md
- [ ] 04-policies.md

### 7. model-catalog — 模型目录
- [ ] README.md
- [ ] 01-overview.md
- [ ] 02-lifecycle.md
- [ ] 03-capabilities.md
- [ ] 04-policies.md

### 8. provider-runtime — Provider 运行时
- [ ] README.md
- [ ] 01-overview.md
- [ ] 02-lifecycle.md
- [ ] 03-capabilities.md
- [ ] 04-policies.md

### 9. tools — 工具系统
- [ ] README.md
- [ ] 01-overview.md
- [ ] 02-lifecycle.md
- [ ] 03-capabilities.md
- [ ] 04-policies.md

### 10. security — 安全系统
- [ ] README.md
- [ ] 01-overview.md
- [ ] 02-lifecycle.md
- [ ] 03-capabilities.md
- [ ] 04-policies.md

### 11. config — 配置系统
- [ ] README.md
- [ ] 01-overview.md
- [ ] 02-lifecycle.md
- [ ] 03-capabilities.md
- [ ] 04-policies.md

### 12. routing — 路由系统
- [ ] README.md
- [ ] 01-overview.md
- [ ] 02-lifecycle.md
- [ ] 03-capabilities.md
- [ ] 04-policies.md

### 13. infra — 基础设施
- [ ] README.md
- [ ] 01-overview.md
- [ ] 02-lifecycle.md
- [ ] 03-capabilities.md
- [ ] 04-policies.md

### 14. hooks — 钩子系统
- [ ] README.md
- [ ] 01-overview.md
- [ ] 02-lifecycle.md
- [ ] 03-capabilities.md
- [ ] 04-policies.md

### 15. cli — CLI 系统
- [ ] README.md
- [ ] 01-overview.md
- [ ] 02-lifecycle.md
- [ ] 03-capabilities.md
- [ ] 04-policies.md

### 16. entry — 入口系统
- [ ] README.md
- [ ] 01-overview.md
- [ ] 02-lifecycle.md
- [ ] 03-capabilities.md
- [ ] 04-policies.md

---

## P1 — 重要模块

### 17. talk — 语音对话
- [ ] README.md + 01 ~ 04

### 18. tts — 文本转语音
- [ ] README.md + 01 ~ 04

### 19. memory — 记忆系统
- [ ] README.md + 01 ~ 04

### 20. cron — 定时任务
- [ ] README.md + 01 ~ 04

### 21. web-fetch — 网页抓取
- [ ] README.md + 01 ~ 04

### 22. web-search — 网页搜索
- [ ] README.md + 01 ~ 04

### 23. media — 媒体处理
- [ ] README.md + 01 ~ 04

### 24. media-understanding — 媒体理解
- [ ] README.md + 01 ~ 04

### 25. image-generation — 图片生成
- [ ] README.md + 01 ~ 04

### 26. video-generation — 视频生成
- [ ] README.md + 01 ~ 04

### 27. music-generation — 音乐生成
- [ ] README.md + 01 ~ 04

### 28. realtime-transcription — 实时转录
- [ ] README.md + 01 ~ 04

### 29. flows — 流程编排
- [ ] README.md + 01 ~ 04

### 30. mcp — MCP 协议
- [ ] README.md + 01 ~ 04

### 31. interactive — 交互式模式
- [ ] README.md + 01 ~ 04

### 32. wizard — 设置向导
- [ ] README.md + 01 ~ 04

### 33. pairing — 配对系统
- [ ] README.md + 01 ~ 04

### 34. secrets — 密钥管理
- [ ] README.md + 01 ~ 04

### 35. logging — 日志系统
- [ ] README.md + 01 ~ 04

### 36. trajectory — 轨迹记录
- [ ] README.md + 01 ~ 04

### 37. transcripts — 转录管理
- [ ] README.md + 01 ~ 04

### 38. web — Web 服务
- [ ] README.md + 01 ~ 04

### 39. tui — 终端 UI
- [ ] README.md + 01 ~ 04

### 40. context-engine — 上下文引擎
- [ ] README.md + 01 ~ 04

---

## P2 — 一般模块

### 41. node-host — 节点宿主
### 42. link-understanding — 链接理解
### 43. process — 进程管理
### 44. commands — 命令系统
### 45. shared — 共享工具
### 46. types — 类型定义
### 47. utils — 工具函数
### 48. markdown — Markdown 处理
### 49. status — 状态系统
### 50. tasks — 任务系统
### 51. daemon — 守护进程
### 52. terminal — 终端
### 53. proxy-capture — 代理捕获
### 54. commitments — 承诺系统
### 55. i18n — 国际化
### 56. chat — 聊天
### 57. auto-reply — 自动回复
### 58. crestodian — 管理员
### 59. bindings — 绑定
### 60. bootstrap — 启动引导

---

## P3 — 低优先级

### 61. compat — 兼容层
### 62. scripts — 脚本
### 63. test-helpers — 测试辅助
### 64. test-utils — 测试工具
### 65. docs — 文档构建

---

## 执行策略
1. 每批 5-8 个模块，并行执行
2. 每批完成后 git commit + push
3. 进度实时更新到此文件
4. 子 Agent 执行时传递上下文（项目结构 + 参考文档）
