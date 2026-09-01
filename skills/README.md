# 10Router — Agent Skills

Drop-in skills for any AI agent (Claude, Cursor, ChatGPT, custom SDK). Just **copy a link** below and paste it to your AI — it will fetch the skill and use 10Router for you.

适合任何 AI agent（Claude、Cursor、ChatGPT、自定义 SDK）直接使用的技能。**复制下方链接**粘贴给你的 AI 即可——它会拉取技能并通过 10Router 为你服务。

> Tip: start with the **10router** entry skill — it covers setup and links to all capability skills.
> 提示：从 **10router** 入口技能开始——它涵盖配置并链接到所有能力技能。

## Skills / 技能

| Capability 能力 | English 英文 | 中文 Chinese |
|---|---|---|
| **Entry / Setup 入口/配置** (start here 从这里开始) | [10router (EN)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router/SKILL.md) | [10router (中文)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router/SKILL.zh-CN.md) |
| **Dev & Troubleshooting 开发排障** | [10router-dev (EN)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-dev/SKILL.md) | — |
| Chat / code-gen 对话/代码 | [10router-chat (EN)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-chat/SKILL.md) | [10router-chat (中文)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-chat/SKILL.zh-CN.md) |
| Image generation 图像生成 | [10router-image (EN)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-image/SKILL.md) | [10router-image (中文)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-image/SKILL.zh-CN.md) |
| Video generation 视频生成 | [10router-video (EN)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-video/SKILL.md) | [10router-video (中文)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-video/SKILL.zh-CN.md) |
| Text-to-speech 语音合成 | [10router-tts (EN)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-tts/SKILL.md) | [10router-tts (中文)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-tts/SKILL.zh-CN.md) |
| Speech-to-text 语音识别 | [10router-stt (EN)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-stt/SKILL.md) | [10router-stt (中文)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-stt/SKILL.zh-CN.md) |
| Embeddings 向量嵌入 | [10router-embeddings (EN)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-embeddings/SKILL.md) | [10router-embeddings (中文)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-embeddings/SKILL.zh-CN.md) |
| Web search 网页搜索 | [10router-web-search (EN)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-web-search/SKILL.md) | [10router-web-search (中文)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-web-search/SKILL.zh-CN.md) |
| Web fetch 网页抓取 (URL → markdown) | [10router-web-fetch (EN)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-web-fetch/SKILL.md) | [10router-web-fetch (中文)](https://raw.githubusercontent.com/techysy/10router/main/skills/10router-web-fetch/SKILL.zh-CN.md) |

## How to use / 使用方法

Paste to your AI (Claude, Cursor, ChatGPT, …) 粘贴给你的 AI：

```text
Read this skill and use it: <link from the table above>
```

Then ask normally — *"generate an image of a cat"*, *"transcribe this URL"*, etc.
然后正常提问即可——"生成一张猫的图片"、"转写这个 URL" 等。

## Configure your shell once / 一次性配置 shell

```bash
export TENROUTER_URL="http://localhost:20128"   # local default, or your VPS / tunnel URL
export TENROUTER_KEY="sk-..."                   # from Dashboard → Keys (only if requireApiKey=true)
```

Verify 验证: `curl $TENROUTER_URL/api/health` → `{"ok":true}`.

## Links / 链接
