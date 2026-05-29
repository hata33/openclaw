# 模型与运行时层 (Model & Runtime Layer)

> 对接各种 LLM 提供商，统一模型调用接口，支持 30+ 模型服务商。

## 目录结构

```
src/
├── provider-runtime/                # 模型运行时核心
│   └── operation-retry.ts           # 操作重试（网络异常自动重试）
│
├── model-catalog/                   # 模型目录
│   └── ...                          # 管理可用模型列表与能力
│
├── web/                             # Web 运行时
│   ├── provider-runtime-shared.ts   # 共享 Provider 运行时
│   └── provider-runtime-shared.test.ts
│
extensions/                          # 模型提供商扩展
├── anthropic/                       # Anthropic (Claude)
├── anthropic-vertex/                # Anthropic via Google Vertex
├── openai/                          # OpenAI (GPT)
├── copilot-proxy/                   # GitHub Copilot 代理
├── deepseek/                        # DeepSeek
├── alibaba/                         # 阿里通义 (Qwen)
├── qwen/                            # 通义千问
├── minimax/                         # MiniMax
├── moonshot/                        # Moonshot (Kimi)
├── stepfun/                         # 阶跃星辰
├── volcengine/                      # 火山引擎
├── byteplus/                        # BytePlus
├── arcee/                           # Arcee
├── cerebras/                        # Cerebras
├── chutes/                          # Chutes
├── together/                        # Together AI
├── fireworks/                       # Fireworks AI
├── groq/                            # Groq
├── mistral/                         # Mistral AI
├── nvidia/                          # NVIDIA
├── ollama/                          # Ollama (本地模型)
├── huggingface/                     # Hugging Face
├── perplexity/                      # Perplexity
├── amazon-bedrock/                  # AWS Bedrock
├── amazon-bedrock-mantle/           # AWS Bedrock Mantle
├── cloudflare-ai-gateway/           # Cloudflare AI Gateway
├── google/                          # Google (Gemini)
└── azure-openai/                    # Azure OpenAI
```

## 核心设计

### 模型目录 (Model Catalog)
统一管理所有可用模型的元数据：
- 模型名称与版本
- 能力标记（vision、function-calling、streaming）
- 上下文窗口大小
- Token 限制
- 定价信息

### Provider 运行时
所有模型提供商实现统一的 Provider 接口：
```
请求 → Provider 适配 → API 调用 → 响应标准化 → 返回
```

### 重试机制
`operation-retry.ts` 处理网络异常、限流（429）、服务端错误（5xx）等情况，自动重试并支持指数退避。

### 扩展模式
每个模型扩展是独立的 pnpm workspace 包，包含：
- `index.ts` — 扩展入口
- Provider 适配器实现
- 模型定义与能力声明
- 可选的配置界面
