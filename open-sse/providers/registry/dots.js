// Dots (小红书 Dots Studio) — free-beta OpenAI-compatible gateway.
// Docs: https://dots.ai/platform/docs
// Auth uses a CUSTOM "api-key" header (NOT Bearer) — handled via
// transport.auth { header: "api-key", scheme: "raw" } in executors/default.js.
// NOTE: host is a beta endpoint (note3-prev-...) and may change on GA.
// Thinking is controlled via chat_template_kwargs.enable_thinking (on by default).
export default {
  id: "dots",
  alias: "dots",
  display: {
    name: "Dots",
    icon: "hub",
    color: "#FF2442",
    textIcon: "DT",
    website: "https://dots.ai",
    notice: {
      apiKeyUrl: "https://dots.ai/platform/apikeys",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://note3-prev-api.askdiandian.com/v1/chat/completions",
    auth: { combined: true, header: "api-key", scheme: "raw" },
    // No documented GET /models endpoint — connection validation falls back to a chat ping.
  },
  modelsJsonUrl: "https://api.github.com/repos/techysy/10router/contents/providers/dots.json",
  fallbackModelsJsonUrl: "https://gitee.com/techysy/10router/raw/main/providers/dots.json",
  models: [{ id: "dots3-note-prev", name: "Dots3 Note Prev" }],
};
