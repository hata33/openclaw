# 入口层 (Entry Layer)

> 程序启动入口，负责进程引导、CLI 命令分发与崩溃恢复。

## 核心目录

```
src/
├── entry.ts                    # 主入口文件
├── entry.respawn.ts            # 进程重生机制（崩溃后自动恢复）
├── entry.compile-cache.ts      # 编译缓存加速
├── entry.version-fast-path.ts  # 版本快速路径检测
├── index.ts                    # 库入口（供外部引用）
├── library.ts                  # 库导出
├── global-state.ts             # 全局状态
├── globals.ts                  # 全局变量
├── runtime.ts                  # 运行时入口
├── version.ts                  # 版本信息
│
├── cli/                        # CLI 命令系统
│   ├── argv.ts                 # 参数解析
│   ├── argv-invocation.ts      # 参数调用
│   ├── banner.ts               # 启动 banner
│   ├── banner-config-lite.ts   # banner 配置
│   ├── acp-cli.ts              # ACP CLI 命令
│   ├── capability-cli.ts       # 能力管理命令
│   ├── channel-auth.ts         # 渠道认证命令
│   ├── channel-options.ts      # 渠道选项
│   ├── gateway-cli/            # 网关管理命令
│   ├── daemon-cli/             # 守护进程命令
│   ├── cron-cli/               # 定时任务命令
│   ├── node-cli/               # 节点管理命令
│   ├── nodes-cli/              # 多节点管理
│   ├── update-cli/             # 更新命令
│   ├── send-runtime/           # 发送运行时
│   ├── program/                # 程序主逻辑
│   └── shared/                 # 共享工具
│
└── openclaw.mjs                # 最外层可执行脚本
```

## 设计要点

### 进程重生 (Respawn)
`entry.respawn.ts` 实现了进程崩溃后的自动恢复机制。当 Gateway 进程异常退出时，通过 sentinel 文件检测并自动重启，确保服务持续可用。

### 编译缓存
`entry.compile-cache.ts` 利用 Node.js 的编译缓存能力加速 TypeScript 模块的后续加载，减少冷启动时间。

### CLI 架构
CLI 采用子命令模式，每个子命令对应一个独立目录：
- `gateway-cli/` — `openclaw gateway` 网关管理
- `daemon-cli/` — `openclaw daemon` 守护进程
- `cron-cli/` — `openclaw cron` 定时任务
- `node-cli/` — `openclaw node` 节点管理
- `update-cli/` — `openclaw update` 版本更新

## 启动流程

```
openclaw.mjs
    → entry.ts (编译缓存 → 版本检测 → 进程重生检查)
        → cli/argv.ts (参数解析)
            → cli/gateway-cli/ 或其他子命令
                → gateway/boot.ts (网关启动)
```
