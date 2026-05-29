# trajectory — 实现流程与数据流

## 轨迹记录流程

```
Agent 运行开始
  ↓
1. 初始化轨迹
   runtime.ts → initTrajectoryRuntime({ cfg, env })
   → 创建 pointer 文件
   → 打开 runtime JSONL 文件

2. 写入元数据事件
   metadata.ts → buildTrajectoryRunMetadata()
   → 收集配置、环境、插件、版本
   → 写入 metadata 事件

3. 事件循环
   Agent Loop 每步操作
   ↓
   sanitizeDiagnosticPayload(event) → 脱敏
   ↓
   queuedFileWriter.write(event) → 队列写入

4. Agent 运行结束
   → 写入 run.end 事件
   → 关闭文件

5. 清理
   cleanup.ts → 清理过期文件
```

## 导出流程

```
用户执行 openclaw trajectory export
  ↓
1. 读取轨迹文件
   export.ts → resolveTrajectoryFilePath(sessionId)

2. 解析 JSONL
   → 每行解析为 TrajectoryEvent

3. 脱敏
   redactSupportString(text, context)
   → 移除 API Key、Token 等

4. 生成支持包
   supportBundleContents = [
     jsonlSupportBundleFile(events),
     jsonSupportBundleFile(manifest),
     textSupportBundleFile(humanReadable),
   ]

5. 写入目录
   writeSupportBundleDirectory(outputDir, contents)

6. 返回摘要
   → TrajectoryCommandExportSummary
```

## Pointer 管理流程

```
paths.ts
  ↓
1. 解析 pointer 文件路径
   resolveTrajectoryPointerFilePath(sessionId)

2. 读取 pointer
   → { runtimeFile: "/path/to/trajectory.jsonl" }

3. 打开 runtime 文件
   resolveTrajectoryPointerOpenFlags()
   → O_CREAT | O_TRUNC | O_WRONLY | O_NOFOLLOW

4. 写入 pointer
   → 更新 pointer 指向新文件
```
