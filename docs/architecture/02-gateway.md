# 网关层 (Gateway Layer)

> 系统核心控制平面，负责认证鉴权、会话调度、Agent 管理与事件分发。

## 目录结构

```
src/gateway/
├── boot.ts                          # 网关启动入口
├── client.ts                        # Gateway 客户端
├── client-bootstrap.ts              # 客户端引导
├── client-start-readiness.ts        # 客户端启动就绪检测
│
├── server/                          # HTTP/WebSocket 服务器
├── server-methods/                  # 服务器方法注册
├── methods/                         # RPC 方法实现
├── protocol/                        # 通信协议定义
│
├── auth.ts                          # 认证主模块
├── auth-config-utils.ts             # 认证配置工具
├── auth-install-policy.ts           # 安装策略
├── auth-mode-policy.ts              # 认证模式策略（token/basic/none）
├── auth-rate-limit.ts               # 速率限制
├── auth-resolve.ts                  # 认证解析
├── auth-surface-resolution.ts       # 认证表面解析
├── auth-token-resolution.ts         # Token 解析
├── auth-token-source-conflict.ts    # Token 来源冲突处理
│
├── agent-prompt.ts                  # Agent Prompt 构建引擎
├── agent-list.ts                    # Agent 列表管理
├── agent-scope.ts                   # Agent 作用域
├── agent-command.ts                 # Agent 命令处理
├── agent-event-assistant-text.ts    # Assistant 文本事件
├── agent-runtime-config.ts          # Agent 运行时配置
├── agent-runtime-metadata.ts        # Agent 运行时元数据
│
├── assistant-identity.ts            # 助手身份管理
├── active-sessions-shutdown-tracker.ts  # 活跃会话关闭追踪
│
├── chat-abort.ts                    # 对话中断处理
├── chat-attachments.ts              # 附件处理
├── chat-display-projection.ts       # 显示投影
├── chat-sanitize.ts                 # 消息清洗
│
├── channel-health-monitor.ts        # 渠道健康监控
├── channel-health-policy.ts         # 渠道健康策略
├── channel-status-patches.ts        # 渠道状态补丁
│
├── config/                          # 配置子系统
├── status/                          # 状态管理
├── flows/                           # 流程控制
└── test/                            # 测试
```

## 核心职责

### 1. 认证鉴权 (Auth)
- **多模式认证**：支持 Token、Basic Auth、无认证等模式
- **安装策略**：首次安装时的认证引导
- **速率限制**：防止 API 滥用
- **Token 管理**：Token 解析、来源冲突检测

### 2. Agent Prompt 构建
`agent-prompt.ts` 是整个系统的灵魂，负责：
- 组装系统提示词（persona、tools、skills）
- 注入上下文（记忆、会话历史、用户信息）
- 管理 Prompt 模板与变量替换

### 3. 会话调度
- 追踪活跃会话
- 管理会话生命周期（创建、挂起、关闭）
- 协调多会话并发

### 4. 渠道健康监控
- 实时监测各渠道连接状态
- 自动重连与故障转移
- 健康状态上报

## 子系统

### server/
HTTP/WebSocket 服务器实现，提供 Gateway API 服务端。

### methods/
RPC 方法的具体实现，处理来自客户端的请求。

### protocol/
通信协议定义，包括消息格式、序列化规则。

### config/
网关级别的配置管理。
