// TaBiAI — new-api style OpenAI-compatible gateway (docs: https://tabitoken.com).
// Bearer auth; chat completions at /v1/chat/completions. Base: https://tabitoken.com/v1
// No recharge entry (无充值入口) — grouped with the free-tier providers.
export default {
  id: "tabiauto",
  alias: "tabiauto",
  display: {
    name: "TaBiAI",
    icon: "auto_awesome",
    color: "#F97316",
    textIcon: "TAB",
    website: "https://tabitoken.com",
    notice: {
      apiKeyUrl: "https://tabitoken.com/sign-up?aff=O0ld",
    },
  },
  category: "freeTier",
  authType: "apikey",
  authModes: ["apikey"],
  transport: {
    baseUrl: "https://tabitoken.com/v1/chat/completions",
    validateUrl: "https://tabitoken.com/v1/models",
  },
  models: [
    { id: "claude-opus-4-8", name: "Claude Opus 4.8" },
    { id: "claude-opus-4-8-thinking", name: "Claude Opus 4.8 Thinking" },
    { id: "claude-opus-5", name: "Claude Opus 5" },
    { id: "claude-opus-5-thinking", name: "Claude Opus 5 Thinking" },
  ],
};
