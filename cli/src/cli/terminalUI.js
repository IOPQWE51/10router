const api = require("./api/client");
const { t } = require("./i18n");
const { showMenuWithBack } = require("./utils/menuHelper");
const { showProvidersMenu } = require("./menus/providers");
const { showApiKeysMenu } = require("./menus/apiKeys");
const { showCombosMenu } = require("./menus/combos");
const { showSettingsMenu } = require("./menus/settings");
const { showCliToolsMenu } = require("./menus/cliTools");

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m"
};

// Cached header (SWR): show last value instantly, refresh in background.
let cachedHeader = "";
let fetchingHeader = false;

function renderHeader(port, keys, tunnel) {
  const tunnelEnabled = tunnel && tunnel.enabled === true;
  const lines = [];
  if (tunnelEnabled && tunnel.publicUrl) {
    lines.push(t("terminal.endpointUrl", { url: `${COLORS.green}${tunnel.publicUrl}/v1${COLORS.reset}` }));
    lines.push(t("terminal.tunnelOn", {
      status: `${COLORS.green}${t("terminal.on")}${COLORS.reset}`,
      shortId: `${COLORS.dim}(${tunnel.shortId})${COLORS.reset}`
    }));
  } else {
    lines.push(t("terminal.endpointLocal", { port }));
    lines.push(t("terminal.tunnelOff", {
      status: `${COLORS.red}${t("terminal.off")}${COLORS.reset}`,
      note: `${COLORS.dim}${t("terminal.localOnly")}${COLORS.reset}`
    }));
  }
  if (!keys || keys.length === 0) {
    lines.push(t("terminal.keyLine", { value: `${COLORS.dim}${t("terminal.noKeysYet")}${COLORS.reset}` }));
  } else {
    lines.push(t("terminal.keyLine", { value: `${COLORS.cyan}${keys[0].key}${COLORS.reset}` }));
    keys.slice(1).forEach(k => lines.push(`          ${COLORS.cyan}${k.key}${COLORS.reset}`));
  }
  return lines.join("\n");
}

async function refreshHeaderBg(port) {
  if (fetchingHeader) return;
  fetchingHeader = true;
  try {
    const [keysResult, tunnelResult] = await Promise.all([
      api.getApiKeys(),
      api.getTunnelStatus()
    ]);
    const keys = keysResult.success ? (keysResult.data.keys || []) : [];
    const tunnel = tunnelResult.success ? (tunnelResult.data || {}) : {};
    cachedHeader = renderHeader(port, keys, tunnel);
  } finally {
    fetchingHeader = false;
  }
}

function getHeader(port) {
  // Kick off background refresh; return cache (or placeholder on first call).
  refreshHeaderBg(port);
  return cachedHeader || t("terminal.headerPlaceholder", { port, dots: `${COLORS.dim}...${COLORS.reset}` });
}

/**
 * Start Terminal UI
 * @param {number} port - Server port number
 */
async function startTerminalUI(port) {
  // Configure API client
  api.configure({ port });

  const basePath = ["10Router"];

  // Prime header cache before first render
  await refreshHeaderBg(port);

  // Main menu
  await showMenuWithBack({
    title: t("terminal.title"),
    breadcrumb: basePath,
    headerContent: () => getHeader(port),
    items: [
      {
        label: t("terminal.providers"),
        action: async () => {
          await showProvidersMenu([...basePath, t("terminal.providers")]);
          return true; // Continue
        }
      },
      {
        label: t("terminal.apiKeys"),
        action: async () => {
          await showApiKeysMenu(port, [...basePath, t("terminal.apiKeys")]);
          return true;
        }
      },
      {
        label: t("terminal.combos"),
        action: async () => {
          await showCombosMenu([...basePath, t("terminal.combos")]);
          return true;
        }
      },
      {
        label: t("terminal.cliTools"),
        action: async () => {
          await showCliToolsMenu(port, [...basePath, t("terminal.cliTools")]);
          return true;
        }
      },
      {
        label: t("terminal.settings"),
        action: async () => {
          await showSettingsMenu([...basePath, t("terminal.settings")]);
          return true;
        }
      }
    ],
    backLabel: t("terminal.backToInterfaceMenu")
  });
}

module.exports = { startTerminalUI };
