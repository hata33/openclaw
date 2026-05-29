# transcripts — 转录管理

> 负责会议/对话转录的导入、存储和摘要生成。
> 支持实时音频转录、直播字幕、事后导入和录音转写四种来源。

## 文件结构

| 文件 | 行数 | 职责 |
|------|------|------|
| `provider-types.ts` | Provider 类型定义（Source Kind、Utterance、Session） |
| `provider-registry.ts` | Provider 注册表（插件系统） |
| `manual-source.ts` | 手动导入（解析 "Speaker: Text" 格式） |
| `config.ts` | 转录配置 |
| `store.ts` | 转录存储（文件系统持久化） |
| `summary.ts` | 转录摘要生成（决策、行动项、风险提取） |

## 核心概念

### Source Kind — 转录来源

| 类型 | 说明 |
|------|------|
| `live-audio` | 实时音频转录（如 Google Meet） |
| `live-caption` | 实时字幕（如 Zoom 字幕） |
| `posthoc-transcript` | 事后导入（手动粘贴转录） |
| `recording-stt` | 录音转写（音频文件 → 文本） |

### Utterance — 话语

```typescript
type TranscriptUtterance = {
  id: string;
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  speakerLabel?: string;
  text: string;
};
```

### Summary — 摘要

自动从转录中提取：决策、行动项、风险点。
