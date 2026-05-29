# pairing — 功能定义与设计思想

## 这个模块解决什么问题？

Bot 需要控制谁可以使用它。不是所有人都能直接与 Agent 对话——需要某种授权机制。

核心问题：

1. **身份验证** — 如何确认用户身份？
2. **授权控制** — 如何管理谁可以使用 Bot？
3. **配对流程** — 如何让新用户获得访问权限？

## 设计思想

### 1. 配对码机制

类似于蓝牙配对：

```
陌生用户 → Bot → 配对码
                  ↓
Bot 所有者看到配对码 → 批准 → 用户获得访问权限
```

### 2. AllowFrom 白名单

```yaml
channels:
  telegram:
    accounts:
      bot1:
        allowFrom:
          - "123456789"    # Telegram user ID
          - "987654321"
```

### 3. 文件锁保护

配对操作使用文件锁，防止并发修改白名单：

```typescript
withPathLock(lockFilePath, () => { /* 修改白名单 */ })
```

### 4. 设置码（Setup Code）

首次配置 Gateway 时生成 Bootstrap Token：

```
openclaw setup → 显示设置码 + QR 码
→ 扫码/输入码 → 设备配对
```

### 5. 渠道适配器

每个渠道有不同的配对适配器：

```typescript
type ChannelPairingAdapter = {
  idLabel: string;  // "userId", "phone", etc.
  normalizeId: (id: string) => string;
};
```

Telegram 用 user ID，WhatsApp 用手机号，Discord 用 user ID。
