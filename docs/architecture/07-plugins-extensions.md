# 插件与扩展层 (Plugin & Extension Layer)

> OpenClaw 的扩展性核心，三层扩展机制：Plugin 框架 → Extensions 扩展包 → Skills 技能。

## 目录结构

```
src/plugins/                         # 插件框架核心
├── activation-context.ts            # 插件激活上下文
├── activation-planner.ts            # 激活规划器
├── activation-source-config.ts      # 激活源配置
├── active-runtime-registry.ts       # 活跃运行时注册表
├── api-builder.ts                   # API 构建器
├── api-facades.ts                   # API 门面
├── api-lifecycle.ts                 # API 生命周期
├── agent-tool-result-middleware.ts   # Agent 工具结果中间件
├── bundle-commands.ts               # 命令捆绑
├── runtime/                         # 运行时
├── contracts/                       # 契约定义
├── compat/                          # 兼容层
└── test-helpers/                    # 测试辅助

extensions/                          # 扩展包（136 个）
│
├── ── 模型提供商（30+）──
│   ├── anthropic/                   # Anthropic Claude
│   ├── openai/                      # OpenAI GPT
│   ├── deepseek/                    # DeepSeek
│   ├── alibaba/                     # 阿里通义
│   ├── ollama/                      # Ollama 本地模型
│   ├── amazon-bedrock/              # AWS Bedrock
│   ├── google/                      # Google Gemini
│   └── ...
│
├── ── 渠道适配（22）──
│   ├── whatsapp/                    # WhatsApp
│   ├── telegram/                    # Telegram
│   ├── discord/                     # Discord
│   ├── wechat/                      # 微信
│   ├── qqbot/                       # QQ
│   ├── signal/                      # Signal
│   ├── slack/                       # Slack
│   └── ...
│
├── ── 功能扩展 ──
│   ├── browser/                     # 浏览器控制
│   ├── canvas/                      # Canvas 渲染
│   ├── brave/                       # Brave 搜索
│   ├── memory-core/                 # 记忆核心
│   ├── memory-lancedb/              # LanceDB 向量记忆
│   ├── memory-wiki/                 # Wiki 记忆
│   ├── speech-core/                 # 语音核心
│   ├── talk-voice/                  # 语音对话
│   ├── voice-call/                  # 语音通话
│   ├── image-generation-core/       # 图片生成
│   ├── video-generation-core/       # 视频生成
│   ├── music-generation/            # 音乐生成
│   ├── active-memory/               # 主动记忆
│   ├── acpx/                        # ACP 扩展
│   ├── admin-http-rpc/              # 管理 HTTP RPC
│   ├── clickclack/                  # 键盘音效
│   ├── codex/                       # Codex 集成
│   ├── comfy/                       # ComfyUI 集成
│   ├── bonjour/                     # mDNS 发现
│   └── azure-speech/                # Azure 语音
│
skills/                              # 技能模块（58 个）
├── github/                          # GitHub 操作
├── tencent-docs/                    # 腾讯文档
├── browser-automation/              # 浏览器自动化
├── weather/                         # 天气查询
├── diagram-maker/                   # 图表制作
├── meme-maker/                      # 表情包制作
├── video-frames/                    # 视频帧提取
├── skill-creator/                   # 技能创建器
├── healthcheck/                     # 健康检查
├── tmux/                            # Tmux 控制
└── ...

packages/                            # 共享包
├── sdk/                             # @openclaw/sdk
├── plugin-sdk/                      # 插件 SDK
├── memory-host-sdk/                 # 记忆宿主 SDK
└── plugin-package-contract/         # 插件包契约
```

## 三层扩展机制

### 1. Plugin 框架 (src/plugins/)
核心插件管理引擎：
- **激活规划**：根据上下文决定激活哪些插件
- **生命周期管理**：加载、初始化、运行、卸载
- **API 构建**：为插件构建标准化 API
- **中间件管道**：工具结果经过中间件链处理

### 2. Extensions 扩展包 (extensions/)
每个扩展是独立的 pnpm workspace 包：
```
extensions/<name>/
├── package.json          # 包定义
├── index.ts              # 入口
├── tsconfig.json         # TypeScript 配置
└── ...                   # 扩展逻辑
```

扩展通过 `package.json` 中的 `openclaw` 字段声明元数据。

### 3. Skills 技能 (skills/)
Agent 可调用的技能模块，通过 `SKILL.md` 描述文件定义：
- 技能发现与搜索（clawhub/skillhub）
- 动态加载，按需激活
- 技能间可组合
