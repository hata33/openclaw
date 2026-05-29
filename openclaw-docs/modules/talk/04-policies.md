# talk — 策略、配置与边界情况

## 一、会话管理策略

### 1.1 会话模式

| 模式 | 说明 | 延迟 |
|------|------|------|
| `duplex` | 全双工，同时说和听 | 最低 |
| `push-to-talk` | 按键说话 | 低 |
| `vox` | 声控激活 | 中（需要 VAD） |

### 1.2 Turn 生命周期

```
Turn 创建 → 捕获音频 → 转录 → Agent 处理 → 语音输出 → Turn 结束
                                        ↑
                                   用户打断 → Turn 取消
```

### 1.3 事件序列化

`TalkEventSequencer` 确保事件按正确顺序分发：

```typescript
createTalkEventSequencer() → {
  push(event),     // 添加事件
  subscribe(handler), // 订阅事件
}
```

## 二、音频策略

### 2.1 格式转换

```
电话场景：
  G.711 μ-law (8kHz) ↔ PCM16 (24kHz)
  → FIR 重采样滤波器（31 taps）
  → Hann 窗函数
  → 线性插值

高质量场景：
  PCM16 (24kHz) 直通
```

### 2.2 重采样参数

```typescript
const TELEPHONY_SAMPLE_RATE = 8000;
const RESAMPLE_FILTER_TAPS = 31;
const RESAMPLE_CUTOFF_GUARD = 0.94;
const RESAMPLE_MAX_PRECOMPUTED_PHASES = 4096;
```

### 2.3 字节序处理

```typescript
const HOST_IS_LITTLE_ENDIAN = new Uint16Array(new Uint8Array([1, 0]).buffer)[0] === 1;
```

自动检测主机字节序，确保 PCM16 数据正确处理。

## 三、激活名称策略

### 3.1 匹配规则

```
精确匹配（exact）：
  转录文本以激活名称开头/结尾 → 精确匹配

模糊匹配（fuzzy）：
  编辑距离在一定范围内 → 模糊匹配
  适用于语音识别不精确的情况
```

### 3.2 位置限制

```typescript
type RealtimeVoiceActivationNameEdge = "leading" | "trailing";
```

激活名称必须在转录文本的开头或结尾，不能在中间。

### 3.3 长度限制

```typescript
const REALTIME_VOICE_ACTIVATION_NAME_MAX_WORDS = 2;
```

最多 2 个单词（如 "Hey Assistant"），避免长唤醒词。

## 四、Agent Consult 策略

### 4.1 工具策略

| 策略 | 说明 |
|------|------|
| `safe-read-only` | 只允许只读操作（搜索、查询） |
| `owner` | 只允许所有者级别的操作 |
| `none` | 无限制 |

### 4.2 超时处理

Agent Consult 可能耗时较长。超时后返回简短回复，避免语音对话长时间中断。

### 4.3 回复风格

```typescript
responseStyle?: string;  // "concise" | "detailed" | default
```

语音场景通常使用简洁风格（concise），避免冗长的语音输出。

## 五、打断策略

### 5.1 立即打断（immediate）

```
用户开始说话 → 立即停止音频输出
  → clearAudio()
  → 取消当前 Turn
  → 开始新 Turn
```

### 5.2 优雅打断（graceful）

```
用户开始说话 → 等待当前句子结束
  → 检测语音停顿
  → 自然结束当前输出
  → 开始新 Turn
```

### 5.3 禁用打断

```typescript
bargeIn: { enabled: false }
```

Agent 必须完成当前回复后才能接受新的输入。

## 六、Provider 选择策略

### 6.1 显式指定

```yaml
talk:
  provider: openai-realtime
```

直接使用指定的 Provider。

### 6.2 自动选择

未指定时使用第一个可用的 Provider：

```
1. 收集插件注册的 Provider
2. 检查配置和凭证
3. 选择第一个可用的
```

## 七、已知边界情况

### 7.1 并发会话

同一时间只能有一个活跃的语音会话。新会话会替换旧会话（`session.replaced` 事件）。

### 7.2 网络中断

Provider 连接断开时触发 `session.error`，调用方负责重连或清理。

### 7.3 音频缓冲区溢出

音频数据到达速度超过处理速度时，旧数据会被丢弃。

### 7.4 重采样精度

31 taps FIR 滤波器在极端频率下可能有少量混叠。`RESAMPLE_CUTOFF_GUARD = 0.94` 提供额外保护。

### 7.5 激活名称误触发

模糊匹配可能在正常对话中误触发激活名称。限制最多 2 个单词可降低误触发率。
