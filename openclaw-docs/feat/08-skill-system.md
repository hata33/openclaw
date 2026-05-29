# 08 — 技能系统

> 技能（Skill）是 OpenClaw 中 Agent 能力的最小可组合单元。
> 每个技能定义了一个特定的能力——怎么搜索网页、怎么操作浏览器、怎么管理文档。
> 技能让 Agent 的知识和能力可复用、可分享、可版本控制。

## 技能是什么？

技能不是代码插件。技能的核心是一份 **SKILL.md** 文件——一份给 Agent 看的指令文档。

```
skills/
  web-tools-guide/
    SKILL.md          ← 核心：告诉 Agent 在什么场景下怎么做
    templates/        ← 可选：模板文件
    scripts/          ← 可选：辅助脚本
```

### SKILL.md 的本质

SKILL.md 不是给人读的文档，而是**给 Agent 的操作手册**。它告诉 Agent：

1. **什么时候触发** — 什么场景下应该使用这个技能
2. **怎么做** — 具体的操作步骤
3. **怎么处理错误** — 出错时的降级策略
4. **怎么输出** — 结果的格式要求

例如 `web-tools-guide/SKILL.md` 可能包含：

```markdown
## 触发条件
当用户要求搜索网页、查资料、打开网站时触发。

## 操作流程
1. 先尝试 web_search
2. 如果失败，尝试 opencli
3. 如果还失败，使用 browser
4. 如果都失败，告诉用户无法完成

## 错误处理
- web_search 失败：检查 API 配置
- 浏览器超时：增加 timeoutMs 参数
```

## 技能的发现与加载

### 技能来源

```
1. Workspace 技能（~/.openclaw/workspace/skills/）
   → 用户自己创建或安装的技能
   
2. 内置技能（随 OpenClaw 发布）
   → web-tools-guide、clawhub、meme-maker 等

3. ClawHub 市场（https://clawhub.ai）
   → 社区贡献的技能
```

### 技能扫描

Gateway 启动时扫描所有技能目录：

```
扫描 skills/ 目录
  → 每个子目录检查是否有 SKILL.md
  → 解析 SKILL.md 的元数据
  → 注册到技能目录
```

### 按需加载

技能不是全部加载到上下文中的。系统根据用户请求**按需注入**：

```
用户: "帮我搜索一下最新的 AI 新闻"
  → 系统识别到需要 web 搜索能力
  → 匹配到 web-tools-guide 技能
  → 将 SKILL.md 内容注入 Agent 上下文
  → Agent 按照技能指令操作
```

这种设计避免了上下文膨胀——不用的技能不会占用 token。

## 技能的触发机制

### 触发匹配

技能通过以下方式匹配：

1. **关键词匹配** — 用户消息中的关键词
2. **意图识别** — Agent 识别到特定意图
3. **显式请求** — 用户直接提到技能名称

### 优先级

当多个技能可能匹配时：
- **更具体的技能优先** — `github` 优先于 `web-tools-guide`
- **用户安装的优先于内置的** — workspace skills 优先级最高

## 技能与工具的关系

技能和工具是互补的概念：

| 维度 | 技能（Skill） | 工具（Tool） |
|------|--------------|-------------|
| 本质 | 指令文档（给 Agent 看） | 可执行代码（给系统跑） |
| 作用 | 告诉 Agent 怎么做 | 实际执行操作 |
| 加载方式 | 按需注入上下文 | 始终注册在工具列表 |
| 示例 | "搜索时先用 web_search" | `web_search` 函数本身 |

一个技能可以引用多个工具。例如 `web-tools-guide` 技能引用了 `web_search`、`web_fetch`、`browser` 等工具。

## ClawHub 技能市场

ClawHub（https://clawhub.ai）是 OpenClaw 的官方技能市场：

### 安装技能

```bash
# 通过 ClawHub CLI
clawhub install github

# 通过 OpenClaw 命令
openclaw skills install github
```

### 技能发布

```bash
clawhub publish my-skill
```

技能发布到 ClawHub 后，其他用户可以搜索和安装。

### 技能版本管理

技能支持版本管理，可以指定安装特定版本：

```bash
clawhub install github@1.2.0
```

## 技能的组成

一个完整的技能可能包含：

```
my-skill/
  ├── SKILL.md              ← 核心指令（必需）
  ├── manifest.json         ← 元数据（可选）
  ├── templates/            ← 模板文件（可选）
  │   └── report.md
  ├── scripts/              ← 辅助脚本（可选）
  │   └── helper.sh
  └── examples/             ← 使用示例（可选）
      └── example-usage.md
```

### manifest.json

```json
{
  "name": "github",
  "version": "1.0.0",
  "description": "GitHub CLI 操作技能",
  "triggers": ["github", "issue", "pull request", "PR"],
  "tools": ["exec"]
}
```

## 自定义技能

用户可以在 workspace 中创建自定义技能：

### 创建步骤

```bash
# 1. 创建技能目录
mkdir -p ~/.openclaw/workspace/skills/my-skill

# 2. 编写 SKILL.md
cat > ~/.openclaw/workspace/skills/my-skill/SKILL.md << 'EOF'
# My Custom Skill

## 触发条件
当用户要求 XXX 时触发。

## 操作流程
1. 步骤一
2. 步骤二
3. 步骤三

## 错误处理
- 如果失败，做 YYY
EOF
```

### 设计原则

1. **明确触发条件** — 告诉 Agent 什么时候该用这个技能
2. **详细操作步骤** — 每一步都说清楚
3. **错误处理** — 告诉 Agent 出错怎么办
4. **输出格式** — 告诉 Agent 结果怎么呈现

## 关键代码入口

| 文件/目录 | 职责 |
|-----------|------|
| `skills/` | workspace 技能目录 |
| `src/plugins/` | 技能扫描和加载 |
| `src/plugins/bundled-dir.ts` | 内置技能目录 |
| `extensions/` | 内置技能扩展 |
| `skills/clawhub/SKILL.md` | ClawHub CLI 使用技能 |
| `skills/find-skills/SKILL.md` | 技能搜索技能 |

## 总结

1. **技能是 Agent 的操作手册** — SKILL.md 是给 Agent 看的指令
2. **按需加载** — 只在需要时注入上下文，节省 token
3. **技能 ≠ 工具** — 技能告诉 Agent 怎么做，工具实际执行
4. **可分享** — 通过 ClawHub 市场分发
5. **可自定义** — 用户可以在 workspace 中创建自己的技能
