# link-understanding — 功能定义

## 解决什么问题？

用户发送链接时，Agent 需要理解链接内容才能有效回复。link-understanding 模块自动抓取和摘要链接内容。

## URL 检测

`detect.ts` 从消息中提取裸 URL：

- 排除 Markdown 链接 `[text](url)`
- 去重
- SSRF 防护（排除内网 IP）
- 限制最大数量

## 摘要生成

`runner.ts` 对每个链接：

1. 使用 `fetchWithSsrFGuard` 抓取页面
2. 使用 `readResponseWithLimit` 限制大小
3. 调用配置的摘要工具生成文本
4. 超时保护

## 上下文注入

`apply.ts` 将摘要注入消息上下文，Agent 在回复时能看到链接内容。

## 格式化

`format.ts` 合并摘要与原始消息正文。
