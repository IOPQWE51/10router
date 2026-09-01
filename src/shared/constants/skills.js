// Agent Skills metadata — single source of truth for /dashboard/skills page.
// Each skill = 1 raw GitHub URL the user copies and pastes to any AI agent.

const REPO = "techysy/10router";
const BRANCH = "master";
const SKILL_PATH = "skills";

export const SKILLS_REPO_URL = `https://github.com/${REPO}`;
export const SKILLS_RAW_BASE = `https://raw.githubusercontent.com/${REPO}/refs/heads/${BRANCH}/${SKILL_PATH}`;
export const SKILLS_BLOB_BASE = `https://github.com/${REPO}/blob/${BRANCH}/${SKILL_PATH}`;

export const SKILLS = [
  {
    id: "10router",
    name: "10Router (Entry)",
    description: "Setup + index of all capabilities. Start here — covers base URL, auth, model discovery, and links to every capability skill.",
    endpoint: null,
    icon: "hub",
    isEntry: true,
  },
  {
    id: "10router-chat",
    name: "Chat",
    description: "Chat / code-gen via OpenAI or Anthropic format with streaming.",
    endpoint: "/v1/chat/completions",
    icon: "chat",
  },
  {
    id: "10router-image",
    name: "Image Generation",
    description: "Text-to-image via DALL-E, Imagen, FLUX, MiniMax, SDWebUI…",
    endpoint: "/v1/images/generations",
    icon: "image",
  },
  {
    id: "10router-tts",
    name: "Text-to-Speech",
    description: "OpenAI / ElevenLabs / Edge / Google / Deepgram voices.",
    endpoint: "/v1/audio/speech",
    icon: "record_voice_over",
  },
  {
    id: "10router-stt",
    name: "Speech-to-Text",
    description: "Transcribe audio via OpenAI Whisper, Groq, Gemini, Deepgram, AssemblyAI…",
    endpoint: "/v1/audio/transcriptions",
    icon: "mic",
  },
  {
    id: "10router-embeddings",
    name: "Embeddings",
    description: "Vectors for RAG / semantic search via OpenAI, Gemini, Mistral…",
    endpoint: "/v1/embeddings",
    icon: "scatter_plot",
  },
  {
    id: "10router-web-search",
    name: "Web Search",
    description: "Tavily / Exa / Brave / Serper / SearXNG / Google PSE / You.com.",
    endpoint: "/v1/search",
    icon: "search",
  },
  {
    id: "10router-web-fetch",
    name: "Web Fetch",
    description: "URL → markdown / text / HTML via Firecrawl, Jina, Tavily, Exa.",
    endpoint: "/v1/web/fetch",
    icon: "language",
  },
];

// Pick the SKILL.md filename based on the active locale: Chinese locales link
// to the bilingual Chinese version (SKILL.zh-CN.md); everything else uses the
// English default. This keeps the /dashboard/skills page's links in sync with
// the user's language.
function skillFileForLocale(locale) {
  return locale === "zh-CN" ? "SKILL.zh-CN.md" : "SKILL.md";
}

export function getSkillRawUrl(id, locale) {
  return `${SKILLS_RAW_BASE}/${id}/${skillFileForLocale(locale)}`;
}

export function getSkillBlobUrl(id, locale) {
  return `${SKILLS_BLOB_BASE}/${id}/${skillFileForLocale(locale)}`;
}
