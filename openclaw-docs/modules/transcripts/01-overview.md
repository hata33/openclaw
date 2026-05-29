# transcripts — 功能定义与设计思想

## 这个模块解决什么问题？

会议和对话需要记录和回顾。转录模块将各种来源的对话内容统一管理。

核心问题：

1. **多来源** — 实时转录、手动导入、录音转写
2. **标准化** — 统一的 Utterance 格式
3. **摘要** — 自动提取关键信息

## 摘要提取策略

`summary.ts` 使用模式匹配提取关键信息：

### 行动项

```typescript
const ACTION_PATTERNS = /\b(todo|action|follow up|assign|next step|ship|fix|send|schedule)\b/i;
```

### 决策

```typescript
const DECISION_PATTERNS = /\b(decided|decision|we will|agreed|approved|go with|ship it)\b/i;
```

### 风险

```typescript
const RISK_PATTERNS = /\b(risk|blocked|blocker|concern|issue|problem|deadline|security)\b/i;
```

## 手动导入

`manual-source.ts` 解析简单的文本格式：

```
Alice: 我们决定使用 React
Bob: 我来负责前端部分
Alice: 下周三前完成
```

解析为：
```
[
  { speakerLabel: "Alice", text: "我们决定使用 React" },
  { speakerLabel: "Bob", text: "我来负责前端部分" },
  { speakerLabel: "Alice", text: "下周三前完成" }
]
```

## Provider 注册

通过插件系统注册转录来源 Provider，与 tts/talk 模块使用相同的注册模式。
