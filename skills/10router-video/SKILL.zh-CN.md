---
name: 10router-video
description: 通过 10Router /v1/videos/generations 使用 xAI Grok Imagine (grok-imagine-video) 生成视频。异步作业流程 - 提交、轮询 request_id 直到完成、下载 MP4。当用户想要创建、生成或渲染视频、文本转视频 (txt2vid) 或图像转视频时使用。
---

# 10Router — 视频生成 (xAI Grok Imagine)

需要 `TENROUTER_URL`（如果启用了身份验证则还需要 `TENROUTER_KEY`）。设置说明请参见 https://raw.githubusercontent.com/techysy/10router/main/skills/10router/SKILL.md。

需要在 10Router 仪表板中连接一个 **xAI 帐户**——可以是 **Grok Build OAuth**（SuperGrok / X Premium+ 订阅登录）或直接来自 console.x.ai 的 **xAI API 密钥**。这是两种独立的身份验证类型，具有独立的计费方式；仪表板会显示每个连接使用的是哪一种。

## 端点（异步作业流程）

视频生成是**异步的**：POST 立即返回 `request_id`，然后轮询直到作业 `done` 或 `failed`。

| 端点 | 用途 |
|---|---|
| `POST /v1/videos/generations` | 文本转视频 / 图像转视频 |
| `POST /v1/videos/edits` | 编辑现有视频 |
| `POST /v1/videos/extensions` | 扩展现有视频 |
| `GET /v1/videos/{request_id}` | 轮询作业状态 |

请求字段（原样传递给 xAI — 请参见 https://docs.x.ai/developers/rest-api-reference/inference/videos）：

| 字段 | 必填 | 备注 |
|---|---|---|
| `model` | 否 | `xai/grok-imagine-video`（在传递给上游前会剥离前缀） |
| `prompt` | 文本转视频必填 | 视频描述 |
| `duration` | 否 | 秒数 |
| `aspect_ratio` | 否 | `16:9`、`9:16`、`1:1`、`4:3`、`3:4`、`3:2`、`2:3` |
| `resolution` | 否 | `480p`、`720p`、`1080p` |
| `image` | 否 | `{ "url": "https://… 或 data:image/…;base64,…" }` 用于图像转视频 |
| `video` | 编辑/扩展 | `{ "url": "…mp4" }` 或 `{ "file_id": "…" }` |

## 示例

提交作业：

```bash
curl -X POST "$TENROUTER_URL/v1/videos/generations" \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{"model":"xai/grok-imagine-video","prompt":"A cinematic tracking shot through a neon city at night","duration":8,"aspect_ratio":"16:9","resolution":"720p"}'
# → {"request_id":"abc123"}   (响应头 x-10router-connection-id: <id>)
```

轮询直到完成（回传连接头以便同一帐户轮询作业）：

```bash
curl "$TENROUTER_URL/v1/videos/abc123" \
  -H "Authorization: Bearer ***" \
  -H "x-connection-id: <来自创建响应的 id>"
# → {"status":"pending","progress":42}
# → {"status":"done","video":{"url":"https://…mp4","duration":8},"model":"grok-imagine-video"}
# → {"status":"failed","error":{"code":"…","message":"…"}}
```

下载：从 `done` 响应中获取 `video.url`。

## 一键式 CLI

```bash
10router xai video \
  --prompt "A cinematic tracking shot through a neon city at night" \
  --output video.mp4
# 选项: --model --duration --aspect-ratio --resolution --image --timeout --port --api-key
```

提交作业，带进度轮询，下载到 `video.mp4.part`，成功后原子重命名。Ctrl+C 可干净取消；失败时返回非零退出码。

## 备注与限制

- 作业在**上游帐户绑定**：使用创建作业的同一连接进行轮询（`x-connection-id` 头，值来自创建响应的 `x-10router-connection-id`）。
- 创建 POST **永不自动重试**（重试可能会创建并计费两个视频）。仅执行 401→令牌刷新→单次重试，上游会在作业创建前拒绝该操作。
- 视频模型标记为 `kind: "video"`，并从聊天模型列表和聊天回退组合中排除。
- Grok Build **订阅 OAuth** 令牌与 API 密钥发送到相同的 `api.x.ai/v1/videos` 端点；给定订阅层级是否包含视频生成配额由 xAI 控制，10Router 不验证此点——上游返回 `403`/`permission_denied` 表示连接的帐户没有视频访问权限。