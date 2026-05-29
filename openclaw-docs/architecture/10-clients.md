# 客户端层 (Client Apps Layer)

> 原生客户端应用，通过 Node Host 协议与 Gateway 通信，提供语音、视觉等本地能力。

## 目录结构

```
apps/
├── android/                         # Android 应用
│   ├── app/                         # 主应用模块
│   ├── build.gradle.kts             # 构建配置
│   └── ...
│
├── ios/                             # iOS 应用
│   ├── OpenClaw/                    # 主应用
│   ├── OpenClaw.xcodeproj/          # Xcode 项目
│   └── ...
│
├── macos/                           # macOS 应用
│   ├── OpenClaw/                    # 主应用
│   ├── OpenClaw.xcodeproj/          # Xcode 项目
│   └── ...
│
├── macos-mlx-tts/                   # macOS MLX TTS 扩展
│   └── ...                          # 本地 TTS 推理
│
├── shared/                          # 共享代码
│   └── ...                          # 跨平台共享逻辑
│
└── swabble/                         # Swabble 轻量客户端
    └── ...
```

## 客户端能力

| 能力 | Android | iOS | macOS | 说明 |
|------|---------|-----|-------|------|
| **语音通话** | ✅ | ✅ | ✅ | 实时语音对话 |
| **摄像头** | ✅ | ✅ | — | 视觉输入 |
| **屏幕共享** | ✅ | ✅ | ✅ | 屏幕内容分析 |
| **本地 TTS** | — | — | ✅ | MLX 本地推理 |
| **推送通知** | ✅ | ✅ | ✅ | 消息推送 |
| **快捷指令** | — | ✅ | ✅ | Siri / Shortcuts |

## Node Host 协议

客户端通过 Node Host 协议与 Gateway 通信：

```
┌─────────────┐       WebSocket/HTTP        ┌─────────────┐
│   客户端     │ ◄──────────────────────────► │   Gateway    │
│  (Node)     │                              │  (Server)    │
└─────────────┘                              └─────────────┘
```

- **双向通信**：WebSocket 长连接
- **能力协商**：客户端声明本地能力（语音、摄像头等）
- **命令执行**：Gateway 通过 TAT (Tencent Automation Tool) 在客户端执行命令
- **文件传输**：支持文件上传下载
