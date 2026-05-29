# talk — 语音对话（Realtime Voice）

> 负责 Agent 的实时语音对话能力，包括语音会话管理、Provider 桥接、音频编解码、打断控制和工具调用。
> 是 OpenClaw 语音交互功能的核心模块。

## 文件结构

| 文件 | 行数 | 职责 |
|------|------|------|
| `talk-events.ts` | — | 事件类型定义（30+ 事件类型，如 session.started, turn.ended） |
| `talk-session-controller.ts` | — | 会话控制器：管理语音对话的 Turn 生命周期 |
| `session-runtime.ts` | — | 会话运行时：Bridge 接口、音频收发、工具调用 |
| `agent-run-control.ts` | — | Agent 运行控制：Agent Loop 与语音会话的协调 |
| `agent-consult-tool.ts` | — | Agent 咨询工具：语音对话中调用 Agent 的文本能力 |
| `agent-talkback-runtime.ts` | 158 | Agent 回话运行时：语音回复的生成和调度 |
| `provider-types.ts` | 204 | Provider 类型定义（Bridge、音频格式、工具） |
| `provider-registry.ts` | — | Provider 注册表（插件 + 内置） |
| `provider-resolver.ts` | — | Provider 解析器（选择和配置 Provider） |
| `audio-codec.ts` | — | 音频编解码（G.711 μ-law ↔ PCM16 重采样） |
| `activation-name.ts` | — | 激活名称检测（唤醒词） |
| `fast-context-runtime.ts` | — | 快速上下文：低延迟上下文注入 |
| `agent-run-control-shared.ts` | — | Agent 运行控制共享逻辑 |
| `forced-consult-coordinator.ts` | — | 强制咨询协调器 |
| `consult-question.ts` | — | 咨询问题处理 |
| `consult-transcript.ts` | — | 咨询转录管理 |
| `diagnostics.ts` | — | 诊断信息 |
| `event-metrics.ts` | — | 事件指标收集 |
| `logging.ts` | 76 | 日志工具 |
| `observability.ts` | — | 可观测性（指标、追踪） |
| `output-activity-tracker.ts` | — | 输出活动追踪 |
| `session-log-runtime.ts` | 156 | 会话日志运行时 |
| `turn-context-tracker.ts` | — | Turn 上下文追踪 |

## 核心概念

- **Realtime Voice Provider** — 实时语音 Provider（如 OpenAI Realtime API）
- **Voice Bridge** — 语音桥接：连接 Provider 和音频 I/O
- **Turn** — 一次对话轮次（用户说 → Agent 回）
- **Barge-in** — 用户打断 Agent 的回复
- **Activation Name** — 唤醒词（如 "Hey Assistant"）
- **Agent Consult** — 语音对话中调用 Agent 的文本能力

## 与其他模块的关系

```
channels (渠道层，如电话/WebSocket)
    ↓ 音频流
talk ← 本模块
    ↓ 语音对话控制
tts (文本转语音，可选)
    ↓ 语音合成
agents (Agent 运行时)
    ↓ 文本推理
plugins (语音 Provider 插件)
```
