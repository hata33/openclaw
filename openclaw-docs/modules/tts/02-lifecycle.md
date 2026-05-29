# tts — 实现流程与数据流

## TTS 完整流程

```
Agent 生成回复文本
  ↓
1. 检查是否需要 TTS
   resolveTtsAutoMode() → 当前自动模式
   isTtsEnabled() → TTS 是否启用
   │
   ↓ 模式判断
   off → 不转语音
   always → 转语音
   inbound → 入站是语音 → 转语音
   tagged → 检查 [[audio_as_voice]] 标记

2. 解析指令
   parseTtsDirectives(text)
   → 提取 [[voice:nova]]、[[speed:1.5]] 等指令
   → 从文本中移除指令标记
   → 返回清理后的文本 + 覆盖参数

3. 解析配置
   resolveEffectiveTtsConfig({ agentId, channelId, accountId })
   → 合并多源配置
   → 解析当前 Persona
   → 返回 ResolvedTtsConfig

4. 文本摘要（如果需要）
   if text.length > maxTextLength && summarizationEnabled:
     → summarizeText(text, model) → 摘要文本

5. 语音合成
   getTtsProvider() → 当前 Provider
   provider.synthesize({
     text,
     voice,
     model,
     speed,
     responseFormat,
   })
   → 返回音频数据

6. 发送语音消息
   maybeApplyTtsToPayload(payload, audioData)
   → 将音频附加到消息 payload

7. 清理临时文件
   scheduleCleanup(tempFilePath)
   → 5 分钟后删除临时音频文件
```

## 配置解析流程

```
resolveEffectiveTtsConfig(context)
  ↓
1. 读取全局配置
   cfg.tts → 基础配置

2. 读取 Agent 级配置
   cfg.agents.list[agentId].tts → 覆盖

3. 读取用户偏好
   tts-prefs.json → 运行时覆盖

4. 深度合并
   deepMergeDefined(global, agent, prefs)
   → 跳过 __proto__ 等危险键

5. 解析结果
   → ResolvedTtsConfig {
       auto, mode, provider, providerSource,
       persona, personas, summaryModel,
       modelOverrides, providerConfigs,
       maxTextLength, timeoutMs
     }
```

## Provider 查找流程

```
listSpeechProviders(cfg)
  ↓
1. 解析插件 Provider
   resolvePluginCapabilityProviders({ key: "speechProviders" })

2. 解析运行时 Provider
   getActiveRuntimePluginRegistry()?.speechProviders

3. 合并去重
   buildCapabilityProviderMaps(providers)
   → Map<canonicalId, provider>

4. 返回 Provider 列表
```

## 指令解析流程

```
parseTtsDirectives(text, options)
  ↓
1. 扫描 [[...]] 模式
   → [[audio_as_voice]] → 标记转语音
   → [[voice:nova]] → 覆盖声音
   → [[speed:1.5]] → 覆盖语速

2. 清理文本
   → 移除所有指令标记
   → trim 多余空白

3. 返回
   → { cleanedText, overrides, shouldSpeak }
```

## 文本摘要流程

```
summarizeText(text, config)
  ↓
1. 选择摘要模型
   config.summaryModel → 默认使用轻量模型

2. 构建摘要提示
   "Summarize the following text for text-to-speech in under N words..."

3. 调用 LLM
   completeSimple({ model, messages })

4. 返回摘要
   → 摘要后的短文本
```

## 状态持久化

```
用户执行 /voice nova
  ↓
1. 解析命令参数
2. 更新 TTS 状态
   setTtsEnabled(true)
   setTtsAutoMode("always")
3. 持久化偏好
   tts-prefs.json → { tts: { voice: "nova", ... } }
```

## OpenAI 兼容 Provider 调用

```
openai-compatible-speech-provider.synthesize(params)
  ↓
1. 解析配置
   { apiKey, baseUrl, model, voice, speed, responseFormat }

2. 构建 HTTP 请求
   POST ${baseUrl}/audio/speech
   Body: { model, voice, input: text, speed, response_format }

3. 发送请求
   postJsonRequest(url, body, config)

4. 读取二进制响应
   readProviderBinaryResponse(response)

5. 返回音频数据
   → Buffer
```
