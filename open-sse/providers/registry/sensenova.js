// SenseNova (商汤) TokenPlan — standard OpenAI-compatible endpoint.
// Docs: https://platform.sensenova.cn/docs
// Base URL: https://token.sensenova.cn/v1, Bearer auth with sk- keys.
// Also offers an Anthropic-compatible interface (not proxied here).
export default {
  id: "sensenova",
  alias: "sensenova",
  display: {
    name: "SenseNova",
    icon: "blur_on",
    color: "#1177E4",
    textIcon: "SN",
    website: "https://www.sensenova.cn",
    notice: {
      apiKeyUrl: "https://platform.sensenova.cn/console/keys",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://token.sensenova.cn/v1/chat/completions",
    validateUrl: "https://token.sensenova.cn/v1/models",
  },
  modelsJsonUrl: "https://api.github.com/repos/techysy/10router/contents/providers/sensenova.json",
  fallbackModelsJsonUrl: "https://gitee.com/techysy/10router/raw/main/providers/sensenova.json",
  models: [
    { id: "sensenova-6.8-flash-lite", name: "SenseNova 6.8 Flash Lite" },
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "glm-5.2", name: "GLM 5.2" },
    { id: "sensenova-u1.5-lite", name: "SenseNova U1.5 Lite", kind: "image", capabilities: ["text2img"] },
    { id: "sensenova-u1-fast", name: "SenseNova U1 Fast", kind: "image", capabilities: ["text2img"] },
  ],
};
