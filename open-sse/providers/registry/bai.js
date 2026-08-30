// B.AI — model aggregator exposing OpenAI Chat Completions, OpenAI Responses
// and Anthropic Messages under one key. Docs: https://docs.b.ai/zh-Hans/llmservice/api/
// Bearer (or x-api-key) auth; GET /v1/models lists models tied to the credential.
// Model IDs are per-credential — the static list below is a seed; use the
// Fetch Models catalog JSON (or a validated connection) for the full set.
export default {
  id: "bai",
  alias: "bai",
  aliases: ["b.ai", "b-ai", "bai-llm"],
  display: {
    name: "B.AI",
    icon: "auto_awesome",
    color: "#3B82F6",
    textIcon: "B.AI",
    website: "https://b.ai",
    notice: {
      apiKeyUrl: "https://chat.b.ai",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.b.ai/v1/chat/completions",
    validateUrl: "https://api.b.ai/v1/models",
  },
  modelsJsonUrl: "https://api.github.com/repos/techysy/10router/contents/providers/bai.json",
  fallbackModelsJsonUrl: "https://gitee.com/techysy/10router/raw/main/providers/bai.json",
  models: [],
};
