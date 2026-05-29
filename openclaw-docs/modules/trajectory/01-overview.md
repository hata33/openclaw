# trajectory — 功能定义与设计思想

## 这个模块解决什么问题？

调试 AI Agent 的行为很困难——需要回溯 Agent 做了什么、为什么做、调用了哪些工具。trajectory 模块记录完整的运行轨迹。

核心问题：

1. **事件捕获** — Agent 运行中的每一步操作都被记录
2. **持久化** — 轨迹写入文件，不丢失
3. **脱敏** — 敏感信息（API Key、用户消息）自动脱敏
4. **导出** — 生成可分享的调试支持包

## 设计思想

### 1. JSONL 格式

轨迹以 JSONL（JSON Lines）格式写入，每行一个事件：

```jsonl
{"traceSchema":"openclaw-trajectory","type":"run.start","ts":"2026-05-30T...","seq":1,...}
{"traceSchema":"openclaw-trajectory","type":"tool.call","ts":"2026-05-30T...","seq":2,...}
{"traceSchema":"openclaw-trajectory","type":"tool.result","ts":"2026-05-30T...","seq":3,...}
{"traceSchema":"openclaw-trajectory","type":"run.end","ts":"2026-05-30T...","seq":4,...}
```

### 2. Pointer 机制

`TrajectoryPointer` 指向当前活跃的轨迹文件：

```
pointer 文件 → 记录当前 runtimeFile 路径
runtimeFile → 实际的 JSONL 轨迹文件
```

### 3. 元数据收集

`metadata.ts` 收集运行上下文：

```
配置快照（脱敏后的配置）
  环境信息（OS、Node 版本）
    插件列表和版本
      Git commit hash
        技能快照
          模型信息
```

### 4. 队列化写入

`QueuedFileWriter` 异步队列写入，不阻塞 Agent 运行。

### 5. 导出支持包

`export.ts` 生成多种格式的支持包：

- JSON（结构化数据）
- JSONL（原始事件流）
- Text（人类可读）

### 6. 自动清理

`cleanup.ts` 清理过期的轨迹文件，防止磁盘被填满。
