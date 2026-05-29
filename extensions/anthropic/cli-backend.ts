/**
 * @fileoverview Claude CLI 后端插件配置（CLI Backend Plugin）
 *
 * 本文件定义了 Claude CLI 作为 OpenClaw CLI 后端的完整配置。
 * CLI 后端是 OpenClaw 与外部命令行工具（如 Claude CLI）的集成层，
 * 负责管理子进程的启动参数、会话管理、输入输出格式等。
 *
 * 核心配置项：
 * - command/args: 启动 Claude CLI 的命令和参数
 * - resumeArgs: 恢复已有会话时的参数（包含 --resume {sessionId}）
 * - output: 输出格式为 JSONL（JSON Lines），便于流式解析
 * - input: 通过 stdin 传递用户输入
 * - liveSession: 使用 claude-stdio 协议进行实时会话通信
 * - modelArg: 模型参数通过 --model 传递
 * - sessionArg: 会话 ID 通过 --session-id 传递
 * - systemPrompt: 系统提示词通过文件追加方式注入
 *
 * 权限管理：
 * Claude CLI 的权限模式（permission mode）会根据 OpenClaw 的安全配置自动调整。
 * 当 OpenClaw 配置为完全信任模式（security: full, ask: off）时，
 * Claude CLI 会自动启用 bypassPermissions 模式。
 *
 * 环境变量清理：
 * 为了确保 Claude CLI 不受宿主环境的影响，启动前会清理大量环境变量，
 * 防止继承的 shell 配置干扰 OpenClaw 管理的 CLI 运行。
 */

import type { CliBackendPlugin } from "openclaw/plugin-sdk/cli-backend";
import {
  CLI_FRESH_WATCHDOG_DEFAULTS,
  CLI_RESUME_WATCHDOG_DEFAULTS,
} from "openclaw/plugin-sdk/cli-backend";
import {
  CLAUDE_CLI_BACKEND_ID,
  CLAUDE_CLI_DEFAULT_MODEL_REF,
  CLAUDE_CLI_CLEAR_ENV,
  CLAUDE_CLI_MODEL_ALIASES,
  CLAUDE_CLI_SESSION_ID_FIELDS,
  normalizeClaudeBackendConfig,
  resolveClaudeCliExecutionArgs,
} from "./cli-shared.js";

/**
 * 构建 Anthropic CLI 后端插件
 *
 * 返回完整的 Claude CLI 后端配置，包括：
 * - 启动命令和参数
 * - 会话管理模式
 * - 输入输出格式
 * - 看门狗（watchdog）超时配置
 * - MCP 集成设置
 *
 * @returns Claude CLI 后端插件实例
 */
export function buildAnthropicCliBackend(): CliBackendPlugin {
  return {
    /** 后端唯一标识符 */
    id: CLAUDE_CLI_BACKEND_ID,

    /**
     * 实时测试配置
     * 用于验证 Claude CLI 后端是否正常工作的默认测试参数
     */
    liveTest: {
      defaultModelRef: CLAUDE_CLI_DEFAULT_MODEL_REF,
      defaultImageProbe: true,   /* 测试图像处理能力 */
      defaultMcpProbe: true,     /* 测试 MCP 集成能力 */
      /**
       * Docker 运行时配置
       * 在容器化环境中使用 @anthropic-ai/claude-code npm 包
       */
      docker: {
        npmPackage: "@anthropic-ai/claude-code",
        binaryName: "claude",
      },
    },

    /** 启用 MCP 捆绑 - Claude CLI 可以访问 OpenClaw 的 MCP 工具 */
    bundleMcp: true,
    /** MCP 捆绑模式 - 通过 Claude 配置文件注入 MCP 服务器 */
    bundleMcpMode: "claude-config-file",

    /**
     * 原生工具模式 - 始终启用
     * Claude CLI 的原生工具（如文件读写、终端执行）始终可用
     */
    nativeToolMode: "always-on",

    /**
     * CLI 启动配置
     * 定义了 Claude CLI 子进程的启动方式和参数
     */
    config: {
      /** 启动命令 */
      command: "claude",
      /**
       * 启动参数：
       * -p: 使用管道模式（非交互式）
       * --output-format stream-json: 流式 JSON 输出
       * --include-partial-messages: 包含部分消息（流式需要）
       * --verbose: 详细输出
       * --setting-sources user: 使用用户级设置
       * --allowedTools mcp__openclaw__*: 允许 OpenClaw MCP 工具
       */
      args: [
        "-p",
        "--output-format",
        "stream-json",
        "--include-partial-messages",
        "--verbose",
        "--setting-sources",
        "user",
        "--allowedTools",
        "mcp__openclaw__*",
      ],
      /**
       * 恢复会话时的参数
       * 与启动参数类似，但额外包含 --resume {sessionId}
       * {sessionId} 会在运行时被实际的会话 ID 替换
       */
      resumeArgs: [
        "-p",
        "--output-format",
        "stream-json",
        "--include-partial-messages",
        "--verbose",
        "--setting-sources",
        "user",
        "--allowedTools",
        "mcp__openclaw__*",
        "--resume",
        "{sessionId}",
      ],
      /** 输出格式为 JSONL（JSON Lines） */
      output: "jsonl",
      /** 实时会话协议 - 使用 claude-stdio 进行标准输入输出通信 */
      liveSession: "claude-stdio",
      /** 输入方式 - 通过 stdin 传递 */
      input: "stdin",
      /** 模型参数标志 - 使用 --model 指定模型 */
      modelArg: "--model",
      /** 模型别名映射 - 简短名称到完整模型 ID 的映射 */
      modelAliases: CLAUDE_CLI_MODEL_ALIASES,
      /** 图像参数标志 - 使用 @ 前缀传递图像路径 */
      imageArg: "@",
      /** 图像路径作用域 - 限制在工作空间范围内 */
      imagePathScope: "workspace",
      /** 会话 ID 参数标志 */
      sessionArg: "--session-id",
      /** 会话模式 - 始终使用会话管理 */
      sessionMode: "always",
      /**
       * 当会话未压缩时，从原始转录重新播种
       * 确保会话恢复时不会丢失上下文
       */
      reseedFromRawTranscriptWhenUncompacted: true,
      /** 会话 ID 字段名列表 - 用于从输出中提取会话 ID */
      sessionIdFields: [...CLAUDE_CLI_SESSION_ID_FIELDS],
      /** 系统提示词文件参数 - 通过文件追加方式注入 */
      systemPromptFileArg: "--append-system-prompt-file",
      /** 系统提示词模式 - 追加而非覆盖 */
      systemPromptMode: "append",
      /** 系统提示词注入时机 - 始终注入 */
      systemPromptWhen: "always",
      /**
       * 需要清理的环境变量
       * 防止宿主 shell 的环境变量干扰 Claude CLI 运行
       */
      clearEnv: [...CLAUDE_CLI_CLEAR_ENV],
      /**
       * 可靠性配置
       * 看门狗（watchdog）用于检测 CLI 进程是否卡住
       */
      reliability: {
        watchdog: {
          fresh: { ...CLI_FRESH_WATCHDOG_DEFAULTS },   /* 新建会话的超时配置 */
          resume: { ...CLI_RESUME_WATCHDOG_DEFAULTS },  /* 恢复会话的超时配置 */
        },
      },
      /** 序列化模式 - 确保命令按顺序执行 */
      serialize: true,
    },

    /**
     * 配置标准化函数
     * 对 CLI 后端配置进行规范化处理，如权限模式、设置源等
     */
    normalizeConfig: normalizeClaudeBackendConfig,

    /**
     * 执行参数解析函数
     * 根据 thinking level 等上下文信息解析实际的 CLI 执行参数
     */
    resolveExecutionArgs: resolveClaudeCliExecutionArgs,
  };
}
