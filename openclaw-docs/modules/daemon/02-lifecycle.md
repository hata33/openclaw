# daemon — 数据流

## 服务安装流程

```
openclaw service install
  ↓
1. 检测平台
   → Linux: systemd
   → macOS: launchd
   → Windows: schtasks

2. 生成配置
   systemd → .service unit 文件
   launchd → .plist 文件
   schtasks → 计划任务

3. 环境配置
   service-env-plan.ts → 解析需要的环境变量
   service-env-render-policy.ts → 渲染策略

4. 注册服务
   → systemctl enable / launchctl load / schtasks /create

5. 启动
   → systemctl start / launchctl start / schtasks /run
```
