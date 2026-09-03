---
name: 10router
description: 10Router 的入口点——本地/远程 AI 网关，提供兼容 OpenAI 的 REST 接口，支持聊天、图像、TTS、嵌入、联网搜索、网页抓取。当用户提到 10Router、TENROUTER_URL，或希望在无需编写提供商样板代码的情况下使用 AI 时使用。本技能涵盖配置并索引各能力子技能；需要时从下方 URL 获取对应的能力 SKILL.md。
---

# 10Router

本地/远程 AI 网关，暴露兼容 OpenAI 的 REST 接口。一个密钥，多家提供商，自动回退。

## 配置

```bash
export TENROUTER_URL="http://localhost:20128"      # 或 VPS / 隧道 URL
export TENROUTER_KEY="sk-..."                      # 来自 Dashboard → Keys（仅在 requireApiKey=true 时需要）
```

所有请求：`${TENROUTER_URL}/v1/...`，请求头 `Authorization: Bearer ***`（若禁用鉴权则省略）。

验证：`curl $TENROUTER_URL/api/health` → `{"ok":true}`

## 发现模型

```bash
curl $TENROUTER_URL/v1/models                  # 聊天/LLM（默认）
curl $TENROUTER_URL/v1/models/image            # 图像生成
curl $TENROUTER_URL/v1/models/tts              # 文本转语音
curl $TENROUTER_URL/v1/models/embedding        # 嵌入
curl $TENROUTER_URL/v1/models/web              # 联网搜索 + 抓取（条目含 `kind` 字段）
curl $TENROUTER_URL/v1/models/stt              # 语音转文本
curl $TENROUTER_URL/v1/models/image-to-text    # 视觉
```

使用 `data[].id` 作为请求中的 `model` 字段。组合模型以 `owned_by:"combo"` 形式出现。

响应结构：
```json
{ "object": "list", "data": [
  { "id": "openai/gpt-5", "object": "model", "owned_by": "openai", "created": 1735000000 },
  { "id": "tavily/search", "object": "model", "kind": "webSearch", "owned_by": "tavily", "created": 1735000000 }
]}
```

## 能力子技能

当用户需要某项特定能力时，从其 raw URL 获取该技能的 `SKILL.md`：

| 能力 | Raw URL |
|---|---|
| 聊天 / 代码生成 | https://raw.githubusercontent.com/techysy/10router/main/skills/10router-chat/SKILL.zh-CN.md |
| 图像生成 | https://raw.githubusercontent.com/techysy/10router/main/skills/10router-image/SKILL.zh-CN.md |
| 文本转语音 | https://raw.githubusercontent.com/techysy/10router/main/skills/10router-tts/SKILL.zh-CN.md |
| 语音转文本 | https://raw.githubusercontent.com/techysy/10router/main/skills/10router-stt/SKILL.zh-CN.md |
| 嵌入 | https://raw.githubusercontent.com/techysy/10router/main/skills/10router-embeddings/SKILL.zh-CN.md |
| 联网搜索 | https://raw.githubusercontent.com/techysy/10router/main/skills/10router-web-search/SKILL.zh-CN.md |
| 网页抓取（URL → markdown） | https://raw.githubusercontent.com/techysy/10router/main/skills/10router-web-fetch/SKILL.zh-CN.md |
| 添加自定义供应商（自助） | https://raw.githubusercontent.com/techysy/10router/main/skills/10router-add-provider/SKILL.zh-CN.md |

## 错误处理

- 401 → 设置/刷新 `TENROUTER_KEY`（Dashboard → Keys）
- 400 `Invalid model format` → 检查 `model` 是否存在于 `/v1/models/<kind>` 中
- 503 `All accounts unavailable` → 等待 `retry-after` 或添加另一个提供商账号
