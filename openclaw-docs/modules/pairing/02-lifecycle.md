# pairing — 实现流程与数据流

## 配对挑战流程

```
issuePairingChallenge(params)
  ↓
1. 检查是否已有配对请求
   upsertPairingRequest({ id: senderId })
   → 已存在 → 返回已有配对码
   → 不存在 → 创建新请求 + 生成配对码

2. 构建配对消息
   buildPairingReply({ channel, idLine, code })
   → "OpenClaw: access not configured."
   → "Pairing code: <code>"
   → "Ask the bot owner to approve with:"
   → "openclaw pairing approve <channel> <code>"

3. 发送回复
   sendPairingReply(text)
```

## 批准流程

```
openclaw pairing approve <channel> <code>
  ↓
1. 查找配对请求
   pairing-store.ts → 按 code 查找

2. 验证配对码
   code 匹配 → 继续
   code 不匹配 → 错误

3. 添加到 AllowFrom
   allow-from-store-file.ts
   → 读取当前白名单
   → 添加用户 ID
   → 原子写入

4. 删除配对请求
   → 配对完成
```

## AllowFrom 读取流程

```
readAllowFromFileWithExists(channel, accountId)
  ↓
1. 解析文件路径
   resolveAllowFromFilePath(channel, accountId)

2. 检查缓存
   mtimeMs 未变 → 使用缓存

3. 读取文件
   readJsonFileWithFallback(path, { version: 1, allowFrom: [] })

4. 返回白名单
   → string[]
```

## 设置码生成流程

```
setup-code.ts
  ↓
1. 解析 Gateway 地址
   pickMatchingExternalInterfaceAddress()
   → 排除 loopback、RFC1918、CGNAT

2. 生成 Bootstrap Token
   issueDeviceBootstrapToken()

3. 构建设置 URL
   resolveGatewayBindUrl() + token

4. 返回
   → 设置码 + QR 码
```
