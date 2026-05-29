# node-host — 数据流

## 节点启动

```
runner.ts
  ↓
1. 加载配置
   ensureNodeHostConfig() → NodeHostGatewayConfig

2. 解析连接参数
   resolveGatewayConnectionAuth()

3. 启动 Gateway 客户端
   startGatewayClientWhenEventLoopReady()

4. 注册为 node-host 客户端模式
   GATEWAY_CLIENT_MODES.NODE_HOST

5. 保持连接
   → 自动重连
   → 心跳保活
```

## 命令执行

```
Gateway 下发命令
  ↓
1. 接收命令
   invoke.ts → invokeCommand()

2. 安全检查
   invoke-system-run.ts
   → 检查白名单
   → 分析命令危险度

3. 审批（如需）
   → 发送审批请求
   → 等待用户响应

4. 执行
   spawn(command, options)
   → 收集 stdout/stderr

5. 返回结果
   → stdout, stderr, exitCode
```
