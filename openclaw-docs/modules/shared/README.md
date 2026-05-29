# shared — 共享工具与类型

> 跨模块共享的工具函数、类型定义和常量。
> 不包含业务逻辑，只提供纯工具能力。

## 文件结构（75 个文件）

### 通用工具

| 文件 | 职责 |
|------|------|
| `string-coerce.ts` | 字符串强转（小写、去空格） |
| `number-coercion.ts` | 数字强转（安全整数、有限数） |
| `record-coerce.ts` | Record 类型强转 |
| `string-normalization.ts` | 字符串规范化 |
| `string-sample.ts` | 字符串采样 |
| `regexp.ts` | 正则工具 |
| `json-schema-defaults.ts` | JSON Schema 默认值填充 |
| `json-schema.types.ts` | JSON Schema 类型 |
| `balanced-json.ts` | 平衡 JSON 解析 |
| `lazy-promise.ts` | 惰性 Promise |
| `lazy-runtime.ts` | 惰性运行时加载 |
| `global-singleton.ts` | 全局单例 |
| `runtime-import.ts` | 运行时动态导入 |
| `pid-alive.ts` | PID 存活检测 |
| `listeners.ts` | 事件监听器管理 |

### 消息/聊天

| 文件 | 职责 |
|------|------|
| `chat-content.ts` | 聊天内容类型 |
| `chat-envelope.ts` | 聊天信封 |
| `chat-message-content.ts` | 聊天消息内容提取 |
| `message-content-blocks.ts` | 消息内容块 |
| `text-chunking.ts` | 文本分块 |

### 文本处理（text/）

| 文件 | 职责 |
|------|------|
| `strip-markdown.ts` | Markdown 清理 |
| `code-regions.ts` | 代码区域检测 |
| `reasoning-tags.ts` | Reasoning 标签处理 |
| `final-tags.ts` | Final 标签处理 |
| `model-special-tokens.ts` | 模型特殊 Token |
| `citation-control-markers.ts` | 引用控制标记 |
| `tool-call-shaped-text.ts` | 工具调用文本格式 |
| `plain-text-tool-call-blocks.ts` | 纯文本工具调用块 |
| `formatted-reasoning-message.ts` | 格式化推理消息 |
| `auto-linked-file-ref.ts` | 自动链接文件引用 |
| `assistant-visible-text.ts` | 助手可见文本 |
| `join-segments.ts` | 文本段合并 |

### Agent/会话

| 文件 | 职责 |
|------|------|
| `agent-liveness.ts` | Agent 存活状态 |
| `agent-run-status.ts` | Agent 运行状态 |
| `assistant-identity-values.ts` | 助手身份值 |
| `session-types.ts` | 会话类型 |
| `session-usage-timeseries-types.ts` | 会话用量时序类型 |
| `subagents-format.ts` | 子 Agent 格式 |
| `thread-binding-lifecycle.ts` | 线程绑定生命周期 |

### 网络（net/）

| 文件 | 职责 |
|------|------|
| `ip.ts` | IP 工具 |
| `ipv4.ts` | IPv4 工具 |
| `redact-sensitive-url.ts` | URL 敏感信息脱敏 |
| `url-userinfo.ts` | URL 用户信息 |

### 设备/认证

| 文件 | 职责 |
|------|------|
| `device-auth.ts` | 设备认证 |
| `device-auth-store.ts` | 设备认证存储 |
| `device-bootstrap-profile.ts` | 设备 Bootstrap 配置 |
| `device-pairing-access.ts` | 设备配对访问 |

### 节点

| 文件 | 职责 |
|------|------|
| `node-list-parse.ts` | 节点列表解析 |
| `node-list-types.ts` | 节点列表类型 |
| `node-match.ts` | 节点匹配 |
| `node-presence.ts` | 节点在线状态 |
| `node-resolve.ts` | 节点解析 |

### 配置/Gateway

| 文件 | 职责 |
|------|------|
| `config-eval.ts` | 配置求值 |
| `config-ui-hints-types.ts` | 配置 UI 提示类型 |
| `gateway-bind-url.ts` | Gateway 绑定 URL |
| `gateway-method-policy.ts` | Gateway 方法策略 |
| `gateway-tailscale-auth-policy.ts` | Tailscale 认证策略 |

### 其他

| 文件 | 职责 |
|------|------|
| `avatar-policy.ts` | 头像策略 |
| `entry-metadata.ts` | 条目元数据 |
| `entry-status.ts` | 条目状态 |
| `frontmatter.ts` | Frontmatter 解析 |
| `google-models.ts` | Google 模型列表 |
| `google-turn-ordering.ts` | Google 对话轮次排序 |
| `human-list.ts` | 人类可读列表 |
| `import-specifier.ts` | 导入说明符 |
| `operator-scope-compat.ts` | 操作符作用域兼容 |
| `requirements.ts` | 需求检查 |
| `scoped-expiring-id-cache.ts` | 作用域过期 ID 缓存 |
| `silent-reply-policy.ts` | 静默回复策略 |
| `tailscale-status.ts` | Tailscale 状态 |
| `usage-aggregates.ts` | 用量聚合 |
| `usage-types.ts` | 用量类型 |
| `custom-command-config.ts` | 自定义命令配置 |
| `assistant-error-format.ts` | 助手错误格式 |
| `model-param-b.ts` | 模型参数 B |
