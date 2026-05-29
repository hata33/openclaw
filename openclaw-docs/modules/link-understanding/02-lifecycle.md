# link-understanding — 数据流

```
消息到达
  ↓
1. 检测链接
   extractLinksFromMessage(text, { maxLinks: 3 })
   → 过滤 Markdown 链接
   → SSRF 检查
   → 去重

2. 并行抓取
   for url in urls:
     fetchWithSsrFGuard(url)
     readResponseWithLimit(response)

3. 生成摘要
   for content in contents:
     调用配置的摘要工具
     → 文本摘要

4. 注入上下文
   applyLinkUnderstanding({ ctx, cfg })
   → formatLinkUnderstandingBody({ body, outputs })
   → 注入到 MsgContext

5. Agent 处理
   → 看到包含链接摘要的消息
```
