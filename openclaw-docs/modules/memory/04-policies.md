# memory — 策略、配置与边界情况

## 一、文件名策略

### 1.1 规范文件名

使用大写 `MEMORY.md` 作为规范文件名，与其他 `*.md` 文件（如 `AGENTS.md`、`SOUL.md`）保持命名一致性。

### 1.2 旧格式兼容

`memory.md`（小写）被检测但不再作为主文件使用。系统不会自动重命名，但在扫描时会跳过旧格式文件。

## 二、安全策略

### 2.1 符号链接排除

```typescript
entry.isFile() && !entry.isSymbolicLink()
```

符号链接可能指向工作区外的文件（安全风险），因此记忆文件必须是真实文件。

### 2.2 路径穿越防护

```typescript
const relative = path.relative(params.workspaceDir, params.absPath);
if (relative.startsWith("..") || path.isAbsolute(relative)) {
  return false;  // 不跳过工作区外的路径
}
```

`shouldSkipRootMemoryAuxiliaryPath()` 只处理工作区内的路径。

## 三、修复目录策略

### 3.1 修复目录位置

```
<workspace>/.openclaw-repair/root-memory/
```

### 3.2 扫描时跳过

修复目录中的文件不应作为正常记忆文件处理，`shouldSkipRootMemoryAuxiliaryPath()` 确保扫描时跳过。

## 四、已知边界情况

### 4.1 文件不存在

`resolveCanonicalRootMemoryFile()` 在文件不存在时返回 `null`，调用方需要处理此情况。

### 4.2 目录不存在

`fs.readdir(workspaceDir)` 失败时（目录不存在），catch 块静默返回 `null`。

### 4.3 大小写敏感文件系统

在大小写不敏感的文件系统（如 macOS HFS+）上，`memory.md` 和 `MEMORY.md` 可能指向同一文件。`exactWorkspaceEntryExists()` 使用 `entries.includes(name)` 检查，在大小写不敏感的文件系统上可能产生意外结果。
