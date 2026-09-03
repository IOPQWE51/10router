// Agnes AI — International site (agnes-ai.com), OpenAI-compatible gateway.
// Bearer auth; chat completions at /v1/chat/completions. Base: https://apihub.agnes-ai.com/v1
// Fixed catalog (not per-credential); text chat models probed live from /v1/models 2026-09-03.
export default {
  id: "agnes-ai",
  alias: "agnes-ai",
  display: {
    name: "Agnes AI",
    icon: "auto_awesome",
    color: "#111827",
    textIcon: "AG",
    website: "https://www.agnes-ai.com/",
    notice: {
      apiKeyUrl: "https://www.agnes-ai.com/",
    },
  },
  category: "apikey",
  authType: "apikey",
  authModes: ["apikey"],
  transport: {
    baseUrl: "https://apihub.agnes-ai.com/v1/chat/completions",
    validateUrl: "https://apihub.agnes-ai.com/v1/models",
  },
  models: [
    { id: "agnes-2.5-flash", name: "Agnes 2.5 Flash" },
    { id: "agnes-2.5-pro", name: "Agnes 2.5 Pro" },
  ],
};
