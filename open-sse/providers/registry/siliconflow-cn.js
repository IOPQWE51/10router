// SiliconFlow 中国区 (api.siliconflow.cn) — 国内直连节点，LLM/Embedding/Rerank/
// 生图模型齐全（issue #19-3）。独立成家而非与国际区 (siliconflow) 合并：密钥、
// 端点、网络面完全不同。目录以「Import from /models」动态拉取为主
// （MODELS_CONFIGS 的 siliconflow-cn 条目），下方仅为基线；倍率按官方价目
// ¥→$（÷7.15）录入 pricing.js 的 PROVIDER_PRICING。
export default {
  id: "siliconflow-cn",
  priority: 115,
  alias: "siliconflow-cn",
  aliases: ["sfcn"],
  uiAlias: "sfcn",
  display: {
    name: "SiliconFlow CN",
    icon: "bolt",
    color: "#1FA34A",
    textIcon: "SF",
    website: "https://siliconflow.cn",
    notice: {
      apiKeyUrl: "https://cloud.siliconflow.cn/account/asicKey",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.siliconflow.cn/v1/chat/completions",
    validateUrl: "https://api.siliconflow.cn/v1/models",
  },
  models: [
    { id: "deepseek-ai/DeepSeek-V3.2", name: "DeepSeek V3.2" },
    { id: "deepseek-ai/DeepSeek-V4-Pro", name: "DeepSeek V4 Pro" },
    { id: "deepseek-ai/DeepSeek-V4-Flash", name: "DeepSeek V4 Flash" },
    { id: "moonshotai/Kimi-K2.6", name: "Kimi K2.6" },
  ],
  features: {
    usage: true,
    usageApikey: true,
  },
};
