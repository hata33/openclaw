# logging — 实现流程与数据流

## 日志写入流程

```
代码调用 logInfo/logDebug/logError(...)
  ↓
1. 检查日志级别
   levelToMinLevel(level) >= currentMinLevel
   → 低于当前级别 → 跳过

2. 格式化日志消息
   tslog 格式化器
   → 添加时间戳、级别、模块名

3. 脱敏处理
   redactSecrets(formattedLog)
   → 检测敏感模式
   → 替换为脱敏字符串

4. 传输
   ├→ 控制台（彩色输出）
   ├→ 文件（追加写入）
   └→ 诊断事件（emitDiagnosticEvent）
```

## 脱敏流程

```
redact.ts → redactSecrets(logEntry)
  ↓
1. 字符串模式匹配
   → API Key 前缀（sk-、key-）
   → Token 模式（长十六进制/Base64）
   → 密码字段值

2. 结构化数据脱敏
   → 遍历对象字段
   → 匹配 STRUCTURED_SECRET_FIELD_RE
   → 替换值为 "***"

3. 有界脱敏
   replacePatternBounded(text, pattern, keepStart, keepEnd)
   → 保留前 N 后 M 字符
   → 中间替换为 "..."

4. 返回脱敏后的日志
```

## 日志级别变更流程

```
用户执行 /debug on 或配置变更
  ↓
1. 读取新日志级别
   resolveEnvLogLevelOverride()  // 环境变量优先
   readLoggingConfig(cfg)        // 配置文件

2. 更新状态
   loggingState.minLevel = newLevel

3. 生效
   → 下次日志调用使用新级别
```
