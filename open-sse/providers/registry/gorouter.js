// GoRouter — new-api style OpenAI-compatible gateway (docs: https://gorouter.app).
// Bearer auth; chat completions at /v1/chat/completions. Base: https://gorouter.app/v1
// No recharge entry (无充值入口) — grouped with the free-tier providers.
export default {
  id: "gorouter",
  alias: "gorouter",
  display: {
    name: "GoRouter",
    icon: "route",
    color: "#10B981",
    textIcon: "GR",
    website: "https://gorouter.app",
    notice: {
      apiKeyUrl: "https://gorouter.app/sign-up?aff=uONM",
    },
  },
  category: "freeTier",
  authType: "apikey",
  authModes: ["apikey"],
  transport: {
    baseUrl: "https://gorouter.app/v1/chat/completions",
    validateUrl: "https://gorouter.app/v1/models",
  },
  models: [
    { id: "claude-opus-4-8", name: "Claude Opus 4.8" },
    { id: "claude-opus-4-8-thinking", name: "Claude Opus 4.8 Thinking" },
    { id: "claude-opus-5", name: "Claude Opus 5" },
    { id: "claude-opus-5-thinking", name: "Claude Opus 5 Thinking" },
  ],
};
