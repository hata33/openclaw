# talk — 实现流程与数据流

## 语音会话完整流程

```
用户发起语音对话请求
  ↓
1. 创建会话
   talk-session-controller.createSession()
   → emit("session.started")
   ↓
2. 选择 Provider
   provider-resolver.resolveConfiguredProvider()
   → 选择 RealtimeVoiceProviderPlugin
   → 加载配置
   ↓
3. 创建 Voice Bridge
   provider.createBridge(config)
   → 建立 WebSocket/HTTP 连接
   → emit("session.ready")
   ↓
4. 对话循环
   ┌─────────────────────────────────────┐
   │ Turn 开始                            │
   │   emit("turn.started")              │
   │                                     │
   │ 音频捕获                             │
   │   emit("capture.started")           │
   │   用户音频 → Bridge → Provider      │
   │   emit("input.audio.delta")         │
   │   捕获结束                           │
   │   emit("capture.stopped")           │
   │                                     │
   │ 语音识别                             │
   │   Provider 返回转录                  │
   │   emit("transcript.delta")          │
   │   emit("transcript.done")           │
   │                                     │
   │ Agent 处理                           │
   │   agent-run-control.ts              │
   │   → 可能调用 Agent 文本推理          │
   │   → 可能调用 Agent Consult Tool      │
   │                                     │
   │ 语音合成                             │
   │   Agent 回复 → Provider → 音频      │
   │   emit("output.audio.started")      │
   │   emit("output.audio.delta")        │
   │   emit("output.audio.done")         │
   │                                     │
   │ Turn 结束                            │
   │   emit("turn.ended")                │
   └─────────────────────────────────────┘
   ↓
5. 会话关闭
   emit("session.closed")
```

## Agent 运行控制流程

```
语音对话中的 Agent 调用
  ↓
agent-run-control.ts
  │
  ├→ 检查当前 Agent 运行状态
  │    resolveActiveEmbeddedRunSessionId()
  │
  ├→ 排队消息
  │    queueEmbeddedPiMessageWithOutcomeAsync()
  │    → 如果 Agent 正在运行 → 排队
  │    → 如果 Agent 空闲 → 直接运行
  │
  ├→ 等待结果
  │    → 超时 → 返回部分结果
  │    → 完成 → 返回完整结果
  │
  └→ 取消运行（用户打断时）
       abortEmbeddedPiRun()
```

## 音频编解码流程

```
电话音频（G.711 μ-law, 8kHz）
  ↓
audio-codec.ts
  ↓
1. μ-law 解码 → PCM16
2. 8kHz → 24kHz 重采样
   → FIR 滤波器（31 taps）
   → 窗函数：Hann 窗
   → 线性插值重采样
3. 输出 PCM16, 24kHz

反向（24kHz → 8kHz + μ-law 编码）同理
```

## Provider 解析流程

```
resolveConfiguredProvider(params)
  ↓
1. 获取 Provider 列表
   listRealtimeVoiceProviders(cfg)
   → 插件注册的 Provider

2. 选择 Provider
   resolveConfiguredCapabilityProvider({
     configuredProviderId: params.configuredProviderId,
     providers: params.providers,
   })
   → 如果指定了 Provider ID → 使用该 Provider
   → 否则 → 使用默认 Provider

3. 解析 Provider 配置
   providerConfig = params.providerConfigs[providerId]
   → 合并覆盖
   → 返回 { provider, providerConfig }
```

## 激活名称检测流程

```
语音转录到达
  ↓
detectActivationName(transcript, activationName)
  │
  ├→ 检查前导（leading）
  │    "Hey Assistant, what's the weather?"
  │    → 前导匹配 "Hey Assistant"
  │
  ├→ 检查尾随（trailing）
  │    "What's the weather, Hey Assistant"
  │    → 尾随匹配
  │
  ├→ 精确匹配
  │    转录文本 === 激活名称
  │
  └→ 模糊匹配
       编辑距离 / 包含匹配
       → allowed: true, match: "fuzzy"
```

## Agent Consult Tool 流程

```
语音对话中的工具调用
  ↓
Provider 调用 openclaw_agent_consult 工具
  ↓
1. 解析参数
   { question, context?, responseStyle? }

2. 检查策略
   policy: "safe-read-only" | "owner" | "none"

3. 构建 Consult 问题
   consult-question.ts

4. 排队到 Agent
   queueEmbeddedPiMessageWithOutcomeAsync()

5. 等待结果
   → 超时 → 简短回复
   → 完成 → 完整回复

6. 返回给 Provider
   → Provider 将文本转为语音
```

## Barge-in（打断）处理

```
Agent 正在说话（输出音频流）
  ↓
用户开始说话（检测到音频输入）
  ↓
1. 检查 barge-in 配置
   enabled: false → 忽略用户输入
   enabled: true → 继续处理

2. 模式处理
   immediate:
     → 立即停止音频输出
     → clearAudio()
     → cancel current turn

   graceful:
     → 等待当前句子结束（检测停顿）
     → 然后停止

3. 开始新 Turn
   → emit("turn.cancelled", previousTurnId)
   → emit("turn.started", newTurnId)
```
