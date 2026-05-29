/**
 * Amazon Bedrock Provider 入口文件
 *
 * 本文件是 Amazon Bedrock 提供者插件的注册入口。
 * Amazon Bedrock 是 AWS 的托管 AI 服务，提供多种基础模型（如 Claude、Llama、Nova 等）。
 *
 * 与其他 Provider 不同，Bedrock 的注册逻辑被拆分到 register.sync.runtime.ts 中，
 * 因为 Bedrock 需要处理大量 AWS 特有的功能：
 * 1. AWS 凭证管理和自动刷新
 * 2. Bedrock Converse API 的流式传输
 * 3. 模型发现（通过 AWS SDK 列出可用模型和推理配置文件）
 * 4. Guardrail（护栏）配置，用于内容安全过滤
 * 5. 应用推理配置文件（Application Inference Profile）的支持
 * 6. 缓存点注入，优化 Claude 模型的 prompt caching
 * 7. 思考/推理能力配置，支持 Claude 4.x 的 extended thinking
 */
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { registerAmazonBedrockPlugin } from "./register.sync.runtime.js";

export default definePluginEntry({
  id: "amazon-bedrock",
  name: "Amazon Bedrock Provider",
  description: "Bundled Amazon Bedrock provider policy plugin",
  register(api) {
    registerAmazonBedrockPlugin(api);
  },
});
