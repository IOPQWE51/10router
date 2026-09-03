// Agnes AI — China site (agnes-ai.cn), OpenAI-compatible gateway.
// Bearer auth; chat completions at /v1/chat/completions. Base: https://api.agnes-ai.cn/v1
// Fixed catalog (not per-credential); text chat models probed live from /v1/models 2026-09-03.
export default {
  id: "agnes-ai-cn",
  alias: "agnes-ai-cn",
  display: {
    name: "Agnes AI (CN)",
    icon: "auto_awesome",
    color: "#111827",
    textIcon: "AG",
    website: "https://www.agnes-ai.cn/",
    notice: {
      apiKeyUrl: "https://www.agnes-ai.cn/",
    },
  },
  category: "apikey",
  authType: "apikey",
  authModes: ["apikey"],
  transport: {
    baseUrl: "https://api.agnes-ai.cn/v1/chat/completions",
    validateUrl: "https://api.agnes-ai.cn/v1/models",
  },
  models: [
    { id: "agnes-2.5-flash", name: "Agnes 2.5 Flash" },
    { id: "agnes-2.5-pro", name: "Agnes 2.5 Pro" },
  ],
};
