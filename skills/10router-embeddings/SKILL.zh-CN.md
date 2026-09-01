---
name: 10router-embeddings
description: 通过 10Router 的 /v1/embeddings 接口生成向量嵌入，支持 OpenAI / Gemini / Mistral / Voyage / Nvidia / GitHub 等嵌入模型，适用于 RAG、语义搜索、相似度计算。当用户需要嵌入（embedding）、向量、RAG、语义搜索或对文本进行嵌入时使用本技能。
---

# 10Router — 嵌入（Embeddings）

需要 `TENROUTER_URL`（若启用了鉴权还需 `TENROUTER_KEY`）。设置方法见 https://raw.githubusercontent.com/techysy/10router/main/skills/10router/SKILL.md。

## 发现可用模型

```bash
curl $TENROUTER_URL/v1/models/embedding | jq '.data[].id'
# 按模型查询维度
curl "$TENROUTER_URL/v1/models/info?id=openai/text-embedding-3-small"
```

## 接口地址

`POST $TENROUTER_URL/v1/embeddings`

| 字段 | 是否必填 | 说明 |
|---|---|---|
| `model` | 是 | 来自 `/v1/models/embedding` |
| `input` | 是 | 字符串 或 字符串数组 |
| `encoding_format` | 否 | `float`（默认）/ `base64` |
| `dimensions` | 否 | 仅 OpenAI v3 支持 |

## 示例

```bash
curl -X POST $TENROUTER_URL/v1/embeddings \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{"model":"openai/text-embedding-3-small","input":["hello","world"]}'
```

JS：

```js
const r = await fetch(`${process.env.TENROUTER_URL}/v1/embeddings`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${process.env.TENROUTER_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ model: "gemini/text-embedding-004", input: "RAG chunk text" }),
});
const { data } = await r.json();
console.log(data[0].embedding.length);  // dimension
```

## 响应结构

```json
{ "object": "list", "model": "openai/text-embedding-3-small",
  "data": [
    { "object": "embedding", "index": 0, "embedding": [0.0123, -0.045, ...] },
    { "object": "embedding", "index": 1, "embedding": [...] }
  ],
  "usage": { "prompt_tokens": 5, "total_tokens": 5 } }
```

## 各提供方的差异

| 提供方 | 说明 |
|---|---|
| `openai`, `openrouter`, `mistral`, `voyage-ai`, `fireworks`, `together`, `nebius`, `github`, `nvidia`, `jina-ai` | 原生 OpenAI 结构 —— `dimensions` 仅对 OpenAI v3（`text-embedding-3-*`）生效 |
| `gemini`, `google_ai_studio` | 服务端自动转换为 `embedContent`/`batchEmbedContents` —— 直接按 OpenAI 结构发送 |
| `openai-compatible-*`, `custom-embedding-*` | 使用凭据中的自定义 `baseUrl` |

批量（`input` 为数组）速度更快；部分提供方对批量大小有上限。
