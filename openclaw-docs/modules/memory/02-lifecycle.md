# memory — 实现流程与数据流

## 记忆文件解析流程

```
Agent 启动
  ↓
resolveCanonicalRootMemoryPath(workspaceDir)
  → 返回: <workspaceDir>/MEMORY.md

resolveCanonicalRootMemoryFile(workspaceDir)
  → 读取目录列表
  → 查找 MEMORY.md 文件（非符号链接）
  → 找到 → 返回绝对路径
  → 未找到 → 返回 null
```

## 旧格式检测

```
exactWorkspaceEntryExists(workspaceDir, "memory.md")
  → 检查目录中是否存在 memory.md
  → 用于迁移提示
```

## 修复目录处理

```
扫描工作区文件时：
  ↓
shouldSkipRootMemoryAuxiliaryPath({ workspaceDir, absPath })
  → 计算相对路径
  → 匹配以下路径则跳过：
    - memory.md（旧格式）
    - .openclaw-repair/root-memory/（修复目录）
  → 返回 true（跳过）或 false（处理）
```

## 路径规范化

```
normalizeWorkspaceRelativePath(rawPath)
  → trim()
  → 反斜杠替换为正斜杠
  → 移除前导 ./
```
