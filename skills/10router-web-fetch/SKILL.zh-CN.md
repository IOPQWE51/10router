---
name: 10router-web-fetch
description: 通过 10Router /v1/web/fetch 接口，使用 Firecrawl / Jina Reader / Tavily Extract / Exa Contents 将 URL 抓取为 markdown / text / HTML。当用户想要抓取网页、提取 URL 内容、阅读文章或把 URL 转换为 markdown 时使用。
---

# 10Router — Web 抓取（Web Fetch）

需要 `TENROUTER_URL`（若启用了鉴权，还需要 `TENROUTER_KEY`）。环境配置参见 https://raw.githubusercontent.com/techysy/10router/main/skills/10router/SKILL.md

## 发现（Discover）

```bash
curl $TENROUTER_URL/v1/models/web | jq '.data[] | select(.kind=="webFetch") | .id'
# 各提供商参数
curl "$TENROUTER_URL/v1/models/info?id=firecrawl/fetch"
```

ID 以 `/fetch` 结尾（例如 `firecrawl/fetch`、`jina/fetch`）。`fetch-combo` 可串联多个提供商并支持自动回退（auto-fallback）。

## 接口端点（Endpoint）

`POST $TENROUTER_URL/v1/web/fetch`

| 字段 | 是否必填 | 说明 |
|---|---|---|
| `model`（或 `provider`） | 是 | 取自 `/v1/models/web`（例如 `firecrawl` 或 `jina-reader`） |
| `url` | 是 | 要提取的 URL |
| `format` | 否 | `markdown`（默认）/ `text` / `html` |
| `max_characters` | 否 | 截断输出长度 |

## 示例（Examples）

### Jina Reader
```bash
curl -X POST $TENROUTER_URL/v1/web/fetch \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{"model":"jina-reader","url":"https://10router.com","format":"markdown"}'
```

### Exa
```bash
curl -X POST $TENROUTER_URL/v1/web/fetch \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{"model":"exa","url":"https://example.com","format":"markdown","max_characters":0}'
```

### Firecrawl
```bash
curl -X POST $TENROUTER_URL/v1/web/fetch \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{"model":"firecrawl","url":"https://example.com","format":"markdown","max_characters":0}'
```

### Tavily
```bash
curl -X POST $TENROUTER_URL/v1/web/fetch \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{"model":"tavily","url":"https://example.com","format":"markdown","max_characters":0}'
```


JS:

```js
const r = await fetch(`${process.env.TENROUTER_URL}/v1/web/fetch`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${process.env.TENROUTER_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ model: "fetch-combo", url: "https://example.com", format: "markdown", max_characters: 5000 }),
});
const { data } = await r.json();
console.log(data.title, data.content.length);
```

## 响应结构（Response shape）

```json
{
  "provider": "jina-reader",
  "url": "...",
  "title": "...",
  "content": { "format": "markdown", "text": "...", "length": 1234 },
  "metadata": { "author": null, "published_at": null, "language": null },
  "usage": { "fetch_cost_usd": 0 },
  "metrics": { "response_time_ms": 850, "upstream_latency_ms": 700 }
}
```

## 提供商注意事项（Provider quirks）

| 提供商 | 鉴权方式 | 适用场景 |
|---|---|---|
| `firecrawl` | Bearer | JS 渲染的页面，`format=markdown/html` |
| `jina-reader` | Bearer（可选） | 免费额度（约 1M 字符/月）；最快的纯 markdown 提取 |
| `tavily` | Bearer | 批量提取；返回 `raw_content` |
| `exa` | `x-api-key` | 已预索引的页面；快速文本提取 |
