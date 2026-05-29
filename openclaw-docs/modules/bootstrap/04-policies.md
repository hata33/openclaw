# bootstrap — 策略

## 一、幂等

如果 `NODE_EXTRA_CA_CERTS` 已设置，不做覆盖。

## 二、仅 Linux

自动 CA 检测仅在 Linux 上生效。macOS 使用固定默认值。

## 三、nvm 检测

通过 `NVM_DIR` 环境变量或 `execPath` 包含 `/.nvm/` 判断。
