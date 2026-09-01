---
name: 10router-tts
description: 通过 10Router /v1/audio/speech 进行文本转语音，支持 OpenAI / ElevenLabs / Deepgram / Edge TTS / Google TTS / Hyperbolic / Inworld 等多种音色。当用户想要将文本转换为语音、生成音频、配音、旁白或朗读文本时使用。
---

# 10Router — 文本转语音 (Text-to-Speech)

需要 `TENROUTER_URL`（若启用鉴权还需 `TENROUTER_KEY`）。配置方法见 https://raw.githubusercontent.com/techysy/10router/main/skills/10router/SKILL.md。

## 发现 (Discover)

```bash
# 1) 列出模型
curl $TENROUTER_URL/v1/models/tts | jq '.data[].id'
# 2) 按模型查看元数据（params、voice-by-id 时的 voicesUrl）
curl "$TENROUTER_URL/v1/models/info?id=el/eleven_multilingual_v2"
# 3) 列出音色（elevenlabs、edge-tts、deepgram、inworld、local-device）。可选 ?lang=vi
curl "$TENROUTER_URL/v1/audio/voices?provider=edge-tts&lang=vi" | jq '.data[].model'
```

`/v1/audio/speech` 中的 `model` 字段 = 直接使用音色 ID（例如 `edge-tts/vi-VN-HoaiMyNeural`、`el/<voice_id>`，或 `openai/tts-1` 模型 + 默认音色）。

## 端点 (Endpoint)

`POST $TENROUTER_URL/v1/audio/speech`

| 字段 (Field) | 必填 (Required) | 说明 (Notes) |
|---|---|---|
| `model` | 是 | 来自 `/v1/models/tts` 的音色 ID |
| `input` | 是 | 要朗读的文本 |

查询参数 `?response_format=mp3`（默认，返回原始字节）或 `?response_format=json`（`{audio: base64, format}`）。

## 示例 (Examples)

保存为 MP3：

```bash
curl -X POST "$TENROUTER_URL/v1/audio/speech" \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{"model":"openai/tts-1","input":"Hello world"}' \
  --output speech.mp3
```

JS（保存文件）：

```js
import { writeFile } from "node:fs/promises";
const r = await fetch(`${process.env.TENROUTER_URL}/v1/audio/speech`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${process.env.TENROUTER_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ model: "el/eleven_multilingual_v2", input: "Xin chào" }),
});
await writeFile("speech.mp3", Buffer.from(await r.arrayBuffer()));
```

## 响应格式 (Response shape)

默认 → 原始音频字节（Content-Type `audio/mp3`）。

`?response_format=json`：
```json
{ "audio": "SUQzBAAAA...", "format": "mp3" }
```

## 各提供商注意点 (Provider quirks, model 格式)

| 提供商 (Provider) | `model` 格式 | 说明 (Notes) |
|---|---|---|
| `openai` | `tts-1/alloy`（model/voice）或仅用 voice | 默认模型 `gpt-4o-mini-tts` |
| `elevenlabs` | `<model_id>/<voice_id>` 或 `<voice_id>` | 默认模型 `eleven_flash_v2_5`；可在 Dashboard 查看音色列表 |
| `openrouter` | `openai/gpt-4o-mini-tts/alloy` | 通过 chat-completions 音频模态流式输出 |
| `edge-tts` | 音色 id，例如 `vi-VN-HoaiMyNeural` | **无鉴权 (noAuth)**；默认 `vi-VN-HoaiMyNeural` |
| `google-tts` | 语言代码，例如 `en`、`vi` | **无鉴权 (noAuth)** |
| `local-device` | 系统音色名称（`say -v ?` / SAPI） | **无鉴权 (noAuth)**；需要 `ffmpeg` |
| `deepgram` | `aura-asteria-en` 等 | 需 Token 鉴权 |
| `nvidia`、`inworld`、`cartesia`、`playht` | `model/voice` | 使用提供商专属的鉴权请求头 |
| `coqui`、`tortoise` | speaker / voice id | 本地服务，无鉴权 (noAuth) |
| `hyperbolic` | model id | Body 仅含 `{text}` |
