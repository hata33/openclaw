# memory — 能力清单与对外接口

## 常量

```typescript
const CANONICAL_ROOT_MEMORY_FILENAME = "MEMORY.md";  // 规范记忆文件名
const LEGACY_ROOT_MEMORY_FILENAME = "memory.md";       // 旧格式文件名
```

## 函数

### resolveCanonicalRootMemoryPath

```typescript
function resolveCanonicalRootMemoryPath(workspaceDir: string): string
```

- **功能**：返回 MEMORY.md 的规范绝对路径（不检查文件是否存在）
- **参数**：workspaceDir — 工作区目录

### resolveLegacyRootMemoryPath

```typescript
function resolveLegacyRootMemoryPath(workspaceDir: string): string
```

- **功能**：返回 memory.md（旧格式）的绝对路径

### resolveRootMemoryRepairDir

```typescript
function resolveRootMemoryRepairDir(workspaceDir: string): string
```

- **功能**：返回修复目录路径 `<workspace>/.openclaw-repair/root-memory/`

### resolveCanonicalRootMemoryFile

```typescript
async function resolveCanonicalRootMemoryFile(workspaceDir: string): Promise<string | null>
```

- **功能**：查找 MEMORY.md 文件（必须是真实文件，非符号链接）
- **返回**：文件绝对路径或 null

### exactWorkspaceEntryExists

```typescript
async function exactWorkspaceEntryExists(dir: string, name: string): Promise<boolean>
```

- **功能**：检查目录中是否存在指定名称的条目

### shouldSkipRootMemoryAuxiliaryPath

```typescript
function shouldSkipRootMemoryAuxiliaryPath(params: {
  workspaceDir: string;
  absPath: string;
}): boolean
```

- **功能**：判断路径是否为记忆辅助路径（应在扫描时跳过）
- **跳过条件**：路径为 memory.md 或在 .openclaw-repair/root-memory/ 下
