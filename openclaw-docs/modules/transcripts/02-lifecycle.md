# transcripts — 实现流程与数据流

## 转录导入流程

```
转录数据到达（实时/手动/录音）
  ↓
1. 选择 Provider
   provider-registry.ts → 根据 sourceKind 查找 Provider

2. 导入转录
   provider.importTranscript(request)
   → 解析为 TranscriptUtterance[]

3. 存储转录
   store.ts → 写入文件系统
   → session 目录 + JSONL 文件

4. 生成摘要
   summary.ts → 提取决策/行动项/风险
```

## 摘要生成流程

```
TranscriptUtterance[] 到达
  ↓
1. 提取概览
   firstSentences(utterances, 5) → 前 5 句话

2. 扫描行动项
   utterances.filter(match(ACTION_PATTERNS))

3. 扫描决策
   utterances.filter(match(DECISION_PATTERNS))

4. 扫描风险
   utterances.filter(match(RISK_PATTERNS))

5. 生成摘要
   → TranscriptsSummary
```

## 存储结构

```
<state-dir>/transcripts/
  └── <date>-<session-id>/
      ├── session.json     ← Session 描述符
      └── utterances.jsonl ← 话语列表（JSONL）
```
