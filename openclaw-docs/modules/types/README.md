# types — 类型声明

> 第三方库的类型声明补充（.d.ts）。
> 为没有自带 TypeScript 类型的 npm 包提供类型定义。

## 文件结构

| 文件 | 职责 |
|------|------|
| `create-markdown-preview.d.ts` | create-markdown-preview 类型 |
| `lydell-node-pty.d.ts` | node-pty 类型（lydell fork） |
| `microsoft-teams-sdk.d.ts` | Microsoft Teams SDK 类型 |
| `modelcontextprotocol-sdk-subpaths.d.ts` | MCP SDK 子路径类型 |
| `node-edge-tts.d.ts` | edge-tts Node.js 绑定类型 |
| `node-llama-cpp.d.ts` | node-llama-cpp 类型 |
| `pdfjs-dist-legacy.d.ts` | PDF.js Legacy 构建类型 |
| `pi-agent-core.d.ts` | @earendil-works/pi-agent-core 类型 |
| `pi-coding-agent.d.ts` | @earendil-works/pi-coding-agent 类型 |
| `qrcode.d.ts` | QR 码生成库类型 |
| `web-push.d.ts` | Web Push 库类型 |

## 用途

当 npm 包没有自带 `.d.ts` 文件且 @types/* 也没有时，在项目本地补充声明。
