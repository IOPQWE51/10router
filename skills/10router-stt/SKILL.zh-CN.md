---
name: 10router-stt
description: 通过 10Router /v1/audio/transcriptions 使用 OpenAI Whisper / Groq / Gemini / Deepgram / AssemblyAI / NVIDIA / HuggingFace 模型进行语音转文字。当用户想要转录音频、将语音转换为文本，或从音频文件中获取字幕时使用。
---

# 10Router — 语音转文字（Speech-to-Text）

需要 `TENROUTER_URL`（若启用鉴权还需 `TENROUTER_KEY`）。配置说明见 https://raw.githubusercontent.com/techysy/10router/main/skills/10router/SKILL.md。

## 发现模型

```bash
curl $TENROUTER_URL/v1/models/stt | jq '.data[].id'
# 各模型参数（language, response_format, prompt, temperature 支持情况）
curl "$TENROUTER_URL/v1/models/info?id=openai/whisper-1"
```

`model` = STT 模型 ID（例如 `openai/whisper-1`、`groq/whisper-large-v3`、`deepgram/nova-3`、`gemini/gemini-2.5-flash`）。

## 端点

`POST $TENROUTER_URL/v1/audio/transcriptions`（兼容 OpenAI Whisper，`multipart/form-data`）

| 字段 | 是否必填 | 说明 |
|---|---|---|
| `model` | 是 | 来自 `/v1/models/stt` |
| `file` | 是 | 音频文件（mp3、wav、m4a、webm、ogg、flac） |
| `language` | 否 | ISO-639-1 语言代码（例如 `en`、`vi`） |
| `prompt` | 否 | 引导转写的提示文本 |
| `response_format` | 否 | `json`（默认）/ `text` / `verbose_json` / `srt` / `vtt` |
| `temperature` | 否 | 0–1 |

## 示例

```bash
curl -X POST "$TENROUTER_URL/v1/audio/transcriptions" \
  -H "Authorization: Bearer ***" \
  -F "model=openai/whisper-1" \
  -F "file=@audio.mp3" \
  -F "language=vi"
```

JS（Node）：

```js
import { createReadStream } from "node:fs";
const form = new FormData();
form.append("model", "groq/whisper-large-v3-turbo");
form.append("file", new Blob([await (await import("node:fs/promises")).readFile("audio.mp3")]), "audio.mp3");
const r = await fetch(`${process.env.TENROUTER_URL}/v1/audio/transcriptions`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${process.env.TENROUTER_KEY}` },
  body: form,
});
const { text } = await r.json();
console.log(text);
```

## 响应结构

默认（`response_format=json`）：
```json
{ "text": "Xin chào, đây là bản ghi âm." }
```

`verbose_json` 会额外返回 `language`、`duration` 以及带时间戳的 `segments[]`。
`srt` / `vtt` 返回字幕文本。

## 各提供商差异

| 提供商 | `model` 格式 | 说明 |
|---|---|---|
| `openai` | `whisper-1`、`gpt-4o-transcribe`、`gpt-4o-mini-transcribe` | 原生 OpenAI 结构 |
| `groq` | `whisper-large-v3`、`whisper-large-v3-turbo`、`distil-whisper-large-v3-en` | 最快；OpenAI 结构 |
| `gemini` | `gemini-2.5-flash`、`gemini-2.5-pro`、`gemini-2.5-flash-lite` | 服务端转换为 `generateContent`，音频内联 |
| `deepgram` | `nova-3`、`nova-2`、`whisper-large` | Token 鉴权；服务端适配响应 |
| `assemblyai` | `universal-3-pro`、`universal-2` | 异步上传+轮询由服务端处理 |
| `nvidia` | `nvidia/parakeet-ctc-1.1b-asr` | NIM 端点 |
| `huggingface` | `openai/whisper-large-v3`、`openai/whisper-small` | HF Inference API |
