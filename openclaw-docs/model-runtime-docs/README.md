# 模型与运行时层 (Model & Runtime Layer)

> 本目录详细描述 OpenClaw 的模型与运行时层——系统的"大脑"，负责对接 LLM 提供商、管理模型生命周期、处理流式响应。

## 目录结构

| 文档 | 内容 |
|------|------|
| [01-overview.md](01-overview.md) | 功能全局概览、能力来源、解决的问题、做了什么 |
| [02-lifecycle.md](02-lifecycle.md) | 完整生命周期：从插件注册到模型调用的全链路 |
| [03-capabilities.md](03-capabilities.md) | 运行时能力清单与来源：每个能力由哪个组件提供 |
| [04-policies.md](04-policies.md) | 其他特性和策略：重放、缓存、重试、安全、流处理 |

## 核心代码位置

```
src/
├── plugin-sdk/                    # 插件 SDK — Provider 框架核心
│   ├── provider-*.ts              # Provider 相关 SDK（认证、目录、流、模型）
│   ├── plugin-entry.ts            # 插件入口定义
│   └── provider-stream-shared.ts  # 流式处理共享逻辑
│
├── provider-runtime/              # 运行时
│   └── operation-retry.ts         # 操作重试策略
│
├── model-catalog/                 # 模型目录
│   ├── types.ts                   # 类型定义
│   ├── normalize.ts               # 模型规范化
│   ├── authority.ts               # 权威来源
│   └── provider-index/            # Provider 索引
│
extensions/                        # Provider 扩展
├── anthropic/                     # Anthropic (Claude)
├── openai/                        # OpenAI (GPT)
├── deepseek/                      # DeepSeek
├── ollama/                        # Ollama (本地模型)
├── amazon-bedrock/                # AWS Bedrock
├── google/                        # Google (Gemini)
├── alibaba/                       # 阿里通义
├── qwen/                          # 通义千问
├── minimax/                       # MiniMax
├── moonshot/                      # Moonshot (Kimi)
├── stepfun/                       # 阶跃星辰
├── volcengine/                    # 火山引擎
├── cerebras/                      # Cerebras
├── together/                      # Together AI
├── groq/                          # Groq
├── mistral/                       # Mistral AI
├── nvidia/                        # NVIDIA
├── fireworks/                     # Fireworks AI
├── huggingface/                   # Hugging Face
├── perplexity/                    # Perplexity
└── ...                            # 更多 Provider
```
