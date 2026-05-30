# 19 — 实时转录

> OpenClaw 的实时转录模块通过 WebSocket 连接到语音转录 Provider，
> 将实时音频流转换为文字，用于语音对话、实时字幕等场景。

## 适用场景

```
场景 1: 语音对话 (Talk Mode)
  用户说话 → 麦克风采集音频 → 实时转录为文字 → Agent 理解 → 回复

场景 2: 实时字幕
  音频流 → 实时转录 → 文字叠加到画面

场景 3: 通话转录
  电话/会议音频 → 实时转录 → 保存为文字记录
```

## 架构

```
音频源（麦克风/通话/流）
  │
  ▼
┌─────────────────────────────────────┐
│  RealtimeTranscriptionSession       │
│  (WebSocket 连接到转录 Provider)     │
│                                     │
│  sendAudio(buffer) → 发送音频帧     │
│  onPartial(text)  → 接收部分转录    │
│  onTranscript(text) → 接收完整转录  │
│  onSpeechStart()  → 检测到语音开始  │
│  onError(error)   → 错误处理        │
└─────────────────────────────────────┘
                    │
              WebSocket
                    │
┌───────────────────┴─────────────────┐
│         转录 Provider API            │
│   Deepgram / AssemblyAI / ...       │
└─────────────────────────────────────┘
```

## Provider 接口

`src/realtime-transcription/provider-types.ts` 定义了统一的 Provider 接口：

```typescript
// Provider 配置
type RealtimeTranscriptionProviderConfig = Record<string, unknown>;

// 会话回调
type RealtimeTranscriptionSessionCallbacks = {
  onPartial?: (partial: string) => void;      // 部分转录（实时更新）
  onTranscript?: (transcript: string) => void; // 完整转录（一句话完成）
  onSpeechStart?: () => void;                  // 检测到语音开始
  onError?: (error: Error) => void;            // 错误回调
};

// 会话接口
interface RealtimeTranscriptionSession {
  connect(): Promise<void>;        // 建立连接
  sendAudio(audio: Buffer): void;  // 发送音频数据
  close(): void;                   // 关闭连接
  isConnected(): boolean;          // 连接状态
}
```

## WebSocket 会话实现

`src/realtime-transcription/websocket-session.ts` — 基于 WebSocket 的转录会话：

### 连接生命周期

```
connect()
  → 建立 WebSocket 连接到 Provider
  → 等待 ready 消息（或 readyOnOpen = true 时立即就绪）
  → 超时控制（默认 10 秒）
  → 连接成功 → 开始接受音频

sendAudio(buffer)
  → 检查连接状态
  → 未就绪 → 加入音频队列
  → 已就绪 → 直接发送
  → 队列溢出控制（maxQueuedBytes = 2MB）

close()
  → 发送关闭请求
  → 等待确认（超时 5 秒）
  → 强制关闭
```

### 音频队列

```
音频数据进入速度快于连接建立速度
  → queuedAudio[] 缓冲
  → queuedBytes 追踪总量
  → 超过 maxQueuedBytes → 丢弃最旧数据
  → 连接就绪后 → 刷新队列
```

### 自动重连

```
WebSocket 连接断开
  → suppressReconnect? → 不重连
  → reconnectAttempts < maxReconnectAttempts → 重连
    → 等待 reconnectDelayMs
    → 重新建立连接
    → 恢复音频发送
  → 重连失败 → 触发 onError
```

### 流量捕获

WebSocket 通信可通过 proxy-capture 模块进行调试：

```
音频/转录事件
  → captureWsEvent() 记录到 proxy-capture
  → 用于调试和分析转录质量
```

## Provider 注册

`src/realtime-transcription/provider-registry.ts` — 管理转录 Provider 的注册：

```
Provider 插件注册
  → provider-registry 记录
  → 根据配置选择 Provider
  → 解析 Provider 特定配置
```

### 已支持的转录 Provider

| Provider | 扩展包 | 特点 |
|----------|--------|------|
| Deepgram | `extensions/deepgram/` | 低延迟，高精度 |
| AssemblyAI | `extensions/...` | 支持多语言 |
| Azure Speech | `extensions/azure-speech/` | 微软云服务 |

## 与 Talk Mode 的集成

实时转录是 Talk Mode 的核心组件：

```
Talk Mode 激活
  → 麦克风采集音频
  → 分帧发送到 RealtimeTranscriptionSession
  → onPartial() → 实时显示正在说的话
  → onTranscript() → 一句话说完 → 发送给 Agent
  → Agent 回复 → TTS 播放
  → 循环
```

## 错误处理

```
转录过程中的错误
  → 连接超时 → 自动重连
  → Provider API 错误 → 触发 onError 回调
  → 音频格式不匹配 → 转码或报错
  → 认证失败 → 不重试，报告错误
```

## 关键代码入口

| 文件 | 职责 |
|------|------|
| `src/realtime-transcription/websocket-session.ts` | WebSocket 转录会话实现 |
| `src/realtime-transcription/provider-types.ts` | Provider 接口定义 |
| `src/realtime-transcription/provider-registry.ts` | Provider 注册 |

## 总结

1. **实时性** — 基于 WebSocket 的流式转录，毫秒级延迟
2. **回调驱动** — 部分转录/完整转录/语音检测通过回调通知
3. **健壮连接** — 自动重连、音频队列、超时控制
4. **Provider 可插拔** — 不同转录服务通过统一接口接入
5. **Talk Mode 集成** — 作为语音对话的转录核心
