---
name: 10router-web-search
description: 通过 10Router /v1/search 进行网络搜索，支持 Tavily / Exa / Brave / Serper / SearXNG / Google PSE / Linkup / SearchAPI / You.com / Perplexity。当用户需要搜索网络、查询信息、查找文章或调用搜索引擎时使用。
---

# 10Router — 网络搜索

需要 `TENROUTER_URL`（若启用鉴权还需 `TENROUTER_KEY`）。安装配置参见 https://raw.githubusercontent.com/techysy/10router/main/skills/10router/SKILL.md。

## 发现可用模型

```bash
curl $TENROUTER_URL/v1/models/web | jq '.data[] | select(.kind=="webSearch") | .id'
# 各提供商的参数（searchTypes、maxResults、必填选项，如 google-pse 的 cx）
curl "$TENROUTER_URL/v1/models/info?id=tavily/search"
```

ID 以 `/search` 结尾（例如 `tavily/search`）。组合模型（`owned_by:"combo"`）会串联多个提供商并自动回退。

## 接口端点

`POST $TENROUTER_URL/v1/search`

| 字段 | 是否必填 | 说明 |
|---|---|---|
| `model`（或 `provider`） | 是 | 取自 `/v1/models/web`（例如 `tavily` 或 `brave`） |
| `query` | 是 | 搜索关键词 |
| `max_results` | 否 | 默认为 5 |
| `search_type` | 否 | `web`（默认）/ `news` |
| `country`、`language`、`time_range`、`domain_filter` | 否 | 取决于提供商 |

## 示例

```bash
curl -X POST $TENROUTER_URL/v1/search \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{"model":"tavily","query":"10Router open source","max_results":5}'
```

JS：

```js
const r = await fetch(`${process.env.TENROUTER_URL}/v1/search`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${process.env.TENROUTER_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ model: "search-combo", query: "latest LLM benchmarks", max_results: 10 }),
});
console.log(await r.json());
```

## 响应结构

```json
{
  "provider": "tavily",
  "query": "10Router open source",
  "results": [
    {
      "title": "...", "url": "https://...", "display_url": "github.com/...",
      "snippet": "...", "position": 1, "score": 0.92,
      "published_at": null, "favicon_url": null, "content": null,
      "metadata": { "author": null, "language": null, "source_type": null, "image_url": null },
      "citation": { "provider": "tavily", "retrieved_at": "2026-...", "rank": 1 }
    }
  ],
  "answer": null,
  "usage": { "queries_used": 1, "search_cost_usd": 0.008 },
  "metrics": { "response_time_ms": 850, "upstream_latency_ms": 700, "total_results_available": 12 },
  "errors": []
}
```

## 各提供商特性

所有提供商都接受 `query` + `max_results`。可选字段各不相同：

| 提供商 | 支持 | 必填附加项 |
|---|---|---|
| `tavily` | country、domain_filter、news 主题 | — |
| `exa` | domain_filter（含/排除）、news 分类 | — |
| `brave-search` | country、language | — |
| `serper` | country、language、news 端点 | — |
| `perplexity` | country、language、domain_filter | — |
| `linkup` | domain_filter、time_range | `depth: fast/standard/deep`（可选） |
| `google-pse` | country、language、time_range、offset | **`cx` 必填**（providerOptions） |
| `searchapi` | country、language、分页 | — |
| `youcom` | country、language、time_range、domain_filter、full_page | — |
| `searxng` | language、time_range | 自托管，**无需鉴权** |

提供商即模型 —— `"provider":"tavily"` 等价于 `"model":"tavily"`。
