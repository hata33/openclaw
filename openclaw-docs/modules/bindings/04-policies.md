# bindings — 策略

## 一、委托

bindings 模块本身无状态，完全委托给 `session-binding-service`。

## 二、触摸

`touch` 更新绑定的最后活跃时间，用于活跃会话检测。

## 三、边界情况

- 同一对话只能绑定到一个会话
- 解绑后重新绑定创建新记录
