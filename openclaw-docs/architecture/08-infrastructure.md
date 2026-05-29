# 基础设施层 (Infrastructure Layer)

> 提供底层基础能力：配置管理、日志、安全、定时任务、进程管理等。

## 目录结构

```
src/
├── infra/                           # 基础设施核心
│   ├── command-analysis/            # 命令分析
│   ├── command-explainer/           # 命令解释器
│   ├── format-time/                 # 时间格式化
│   ├── net/                         # 网络工具
│   ├── outbound/                    # 出站通信
│   ├── tls/                         # TLS 管理
│   ├── ssh-config.ts                # SSH 配置
│   ├── ssh-tunnel.ts                # SSH 隧道
│   ├── retry.ts                     # 重试策略
│   ├── retry-policy.ts              # 重试策略定义
│   ├── restart.ts                   # 重启协调
│   ├── restart-sentinel.ts          # 重启哨兵
│   ├── update-check.ts              # 更新检查
│   ├── update-runner.ts             # 更新执行器
│   ├── shell-env.ts                 # Shell 环境
│   ├── shell-inline-command.ts      # 内联命令
│   ├── sqlite-wal.ts                # SQLite WAL 模式
│   ├── secure-random.ts             # 安全随机数
│   ├── secret-file.ts               # 密钥文件管理
│   ├── temp-download.ts             # 临时下载
│   └── ...
│
├── config/                          # 配置管理
│   ├── sessions/                    # 会话配置
│   ├── agent-dirs.ts                # Agent 目录
│   ├── agent-limits.ts              # Agent 限制
│   ├── agent-timeout-defaults.ts    # 超时默认值
│   ├── allowed-values.ts            # 允许值
│   ├── backup-rotation.ts           # 备份轮转
│   ├── bindings.ts                  # 绑定
│   ├── cache-utils.ts               # 缓存工具
│   ├── channel-capabilities.ts      # 渠道能力
│   └── ...
│
├── logging/                         # 日志系统
│   ├── logger.ts                    # 日志器核心
│   ├── levels.ts                    # 日志级别
│   ├── level-filter.ts              # 级别过滤
│   ├── log-file-path.ts             # 日志文件路径
│   ├── log-file-size-cap.ts         # 日志大小限制
│   ├── log-tail.ts                  # 日志尾部读取
│   ├── parse-log-line.ts            # 日志行解析
│   ├── console.ts                   # 控制台输出
│   ├── timestamps.ts                # 时间戳
│   ├── redact.ts                    # 敏感信息脱敏
│   ├── redact-bounded.ts            # 有界脱敏
│   ├── redact-identifier.ts         # 标识符脱敏
│   ├── state.ts                     # 日志状态
│   ├── config.ts                    # 日志配置
│   ├── diagnostic.ts                # 诊断日志
│   ├── diagnostic-*.ts              # 各类诊断子模块
│   └── test-helpers/                # 测试辅助
│
├── security/                        # 安全模块
│   └── ...                          # 安全策略与实现
│
├── memory/                          # 记忆系统
│   └── root-memory-files.ts         # 根目录记忆文件管理
│
├── memory-host-sdk/                 # 记忆宿主 SDK
│   └── ...
│
├── cron/                            # 定时任务
│   ├── active-jobs.ts               # 活跃任务
│   ├── delivery-context.ts          # 投递上下文
│   ├── delivery-plan.ts             # 投递计划
│   ├── delivery-field-schemas.ts    # 投递字段 Schema
│   ├── isolated-agent/              # 隔离 Agent 任务
│   ├── service/                     # 任务服务
│   └── ...
│
├── process/                         # 进程管理
│   ├── supervisor/                  # 进程监控器
│   └── ...
│
├── web-fetch/                       # 网页抓取
├── web-search/                      # 搜索引擎集成
├── tts/                             # 文字转语音
├── mcp/                             # Model Context Protocol
├── hooks/                           # 钩子系统
│   ├── hooks.ts                     # 钩子核心
│   ├── loader.ts                    # 钩子加载器
│   ├── policy.ts                    # 钩子策略
│   ├── gmail.ts                     # Gmail 钩子
│   ├── gmail-watcher.ts             # Gmail 监视器
│   ├── bundled/                     # 内置钩子
│   └── ...
│
├── routing/                         # 路由与绑定
│   ├── session-key.ts               # 会话 Key
│   ├── resolve-route.ts             # 路由解析
│   ├── account-lookup.ts            # 账户查找
│   ├── bindings.ts                  # 绑定
│   └── ...
│
├── pairing/                         # 设备配对
│   └── ...
│
├── bootstrap/                       # 启动引导
│   ├── node-extra-ca-certs.ts       # 额外 CA 证书
│   └── node-startup-env.ts          # Node 启动环境
│
├── secrets/                         # 密钥管理
└── i18n/                            # 国际化
```

## 核心子系统

### 配置管理 (config/)
- Agent 配置：目录结构、资源限制、超时设置
- 渠道配置：能力协商、特性开关
- 会话配置：模型覆盖、行为策略
- 备份轮转：自动清理旧配置备份

### 日志系统 (logging/)
- 结构化日志：JSON 格式，便于分析
- 敏感信息脱敏：自动识别并遮蔽密钥、Token
- 诊断日志：性能指标、错误追踪
- 日志轮转：大小限制与自动清理

### 定时任务 (cron/)
- 定时触发：Cron 表达式调度
- 投递计划：消息投递的上下文管理
- 隔离 Agent：独立的 Agent 实例执行任务

### 钩子系统 (hooks/)
- 消息钩子：拦截并处理消息流
- Gmail 钩子：邮件监听与处理
- 内置钩子：常用钩子预置

### 进程管理 (process/)
- 子进程生命周期管理
- 进程监控器 (supervisor)
- 优雅关闭与信号处理
