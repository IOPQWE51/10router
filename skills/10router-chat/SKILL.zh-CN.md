---
name: 10router-chat
description: 通过 10Router 使用 OpenAI /v1/chat/completions 或 Anthropic /v1/messages 格式进行聊天/代码生成，支持流式输出和自动故障转移组合。当用户想通过 10Router 向 LLM 提问、生成代码、总结文本或运行提示词时使用。
---

# 10Router — 聊天

需要 `TENROUTER_URL`（如果启用鉴权还需要 `TENROUTER_KEY`）。安装配置请参见 https://raw.githubusercontent.com/techysy/10router/main/skills/10router/SKILL.md。

## 端点

- `POST $TENROUTER_URL/v1/chat/completions` — OpenAI 格式
- `POST $TENROUTER_URL/v1/messages` — Anthropic 格式

## 发现

```bash
curl $TENROUTER_URL/v1/models | jq '.data[].id'
# Per-model metadata (contextWindow, params)
curl "$TENROUTER_URL/v1/models/info?id=openai/gpt-4o"
```

组合（例如 `vip`、`mycodex`）会自动在多个提供商之间故障转移。

## OpenAI 格式

```bash
curl -X POST $TENROUTER_URL/v1/chat/completions \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{"model":"openai/gpt-5","messages":[{"role":"user","content":"Hi"}],"stream":false}'
```

JS（OpenAI SDK）：

```js
import OpenAI from "openai";
const client = new OpenAI({ baseURL: `${process.env.TENROUTER_URL}/v1`, apiKey: process.env.TENROUTER_KEY });
const res = await client.chat.completions.create({
  model: "openai/gpt-5",
  messages: [{ role: "user", content: "Hi" }],
  stream: true,
});
for await (const chunk of res) process.stdout.write(chunk.choices[0]?.delta?.content || "");
```

## Anthropic 格式

```bash
curl -X POST $TENROUTER_URL/v1/messages \
  -H "Authorization: Bearer ***" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"cc/claude-opus-4-7","max_tokens":1024,"messages":[{"role":"user","content":"Hi"}]}'
```

## 响应结构

OpenAI（`/v1/chat/completions`）：
```json
{ "id": "chatcmpl-...", "object": "chat.completion", "model": "openai/gpt-5",
  "choices": [{ "index": 0, "message": { "role": "assistant", "content": "Hello!" }, "finish_reason": "stop" }],
  "usage": { "prompt_tokens": 8, "completion_tokens": 2, "total_tokens": 10 } }
```

流式（`stream:true`）输出 SSE：`data: {choices:[{delta:{content:"..."}}]}\n\n` ... `data: [DONE]\n\n`。

Anthropic（`/v1/messages`）：
```json
{ "id": "msg_...", "type": "message", "role": "assistant", "model": "cc/claude-opus-4-7",
  "content": [{ "type": "text", "text": "Hello!" }],
  "stop_reason": "end_turn", "usage": { "input_tokens": 8, "output_tokens": 2 } }
```
