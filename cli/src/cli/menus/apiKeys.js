const api = require("../api/client");
const { t } = require("../i18n");
const { prompt, confirm, pause } = require("../utils/input");
const { clearScreen, showStatus, showHeader } = require("../utils/display");
const { maskKey, formatDate, getRelativeTime } = require("../utils/format");
const { showMenuWithBack } = require("../utils/menuHelper");
const { copyToClipboard } = require("../utils/clipboard");
const { getEndpoint } = require("../utils/endpoint");

/**
 * Display API keys list with formatted output
 * @param {Array} keys - Array of API key objects
 * @param {number} port - Server port
 */
function displayApiKeys(keys, port) {
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log("│  🔑 API Keys Management                                 │");
  console.log("├─────────────────────────────────────────────────────────┤");
  // Note: This function is legacy, endpoint shown in menu header instead
  console.log("│                                                          │");
  
  if (keys.length === 0) {
    console.log("│  No API keys found.                                     │");
  } else {
    console.log(`│  Your API Keys (${keys.length}):${" ".repeat(42 - String(keys.length).length)}│`);
    
    keys.forEach((key, index) => {
      console.log("│                                                          │");
      console.log(`│  ${index + 1}. ${key.name}${" ".repeat(52 - String(index + 1).length - key.name.length)}│`);
      
      const maskedKey = maskKey(key.key);
      console.log(`│     Key: ${maskedKey}${" ".repeat(47 - maskedKey.length)}│`);
      
      const created = formatDate(key.createdAt);
      console.log(`│     Created: ${created}${" ".repeat(43 - created.length)}│`);
      
      if (key.lastUsedAt) {
        const lastUsed = getRelativeTime(key.lastUsedAt);
        console.log(`│     Last used: ${lastUsed}${" ".repeat(41 - lastUsed.length)}│`);
      } else {
        console.log("│     Last used: Never                                    │");
      }
    });
  }
  
  console.log("│                                                          │");
  console.log("│  Actions:                                               │");
  console.log("│  1. Create New API Key                                  │");
  console.log("│  2. View Full Key (by number)                           │");
  console.log("│  3. Copy Key to Clipboard (by number)                   │");
  console.log("│  4. Delete Key (by number)                              │");
  console.log("│  0. ← Back to Main Menu                                 │");
  console.log("└─────────────────────────────────────────────────────────┘");
}

/**
 * Handle creating new API key
 * @returns {Promise<boolean>} Success status
 */
async function handleCreateKey() {
  console.log(t("menus.apiKeys.createTitle"));
  console.log("─".repeat(30));

  const name = await prompt(t("menus.apiKeys.namePrompt"));

  if (!name) {
    showStatus(t("menus.apiKeys.nameEmpty"), "error");
    await pause();
    return false;
  }

  const result = await api.createApiKey(name);

  if (!result.success) {
    showStatus(t("menus.apiKeys.createFailed", { error: result.error }), "error");
    await pause();
    return false;
  }

  console.log(t("menus.apiKeys.created"));
  console.log(t("menus.apiKeys.saveWarning"));
  console.log(t("menus.apiKeys.keyLine", { value: result.data.key }));
  console.log(t("menus.apiKeys.nameLine", { value: result.data.name }));
  console.log(t("menus.apiKeys.idLine", { value: result.data.id }));

  const shouldCopy = await confirm(t("menus.apiKeys.copyConfirm"));
  if (shouldCopy) {
    if (copyToClipboard(result.data.key)) {
      showStatus(t("menus.apiKeys.copied"), "success");
    } else {
      showStatus(t("menus.apiKeys.copyFailed"), "error");
    }
  }

  await pause();
  return true;
}

/**
 * Handle viewing full API key
 * @param {Object} key - API key object
 */
async function handleViewFullKey(key) {
  console.log(t("menus.apiKeys.viewTitle"));
  console.log("─".repeat(30));
  console.log(t("menus.apiKeys.nameLine", { value: key.name }));
  console.log(t("menus.apiKeys.keyLine", { value: key.key }));
  console.log(t("menus.apiKeys.idLine", { value: key.id }));
  console.log(t("menus.apiKeys.createdLine", { value: formatDate(key.createdAt) }));

  if (key.lastUsedAt) {
    console.log(t("menus.apiKeys.lastUsedLine", { value: getRelativeTime(key.lastUsedAt) }));
  } else {
    console.log(t("menus.apiKeys.lastUsedNever"));
  }

  await pause();
}

/**
 * Handle copying API key to clipboard
 * @param {Object} key - API key object
 */
async function handleCopyKey(key) {
  if (copyToClipboard(key.key)) {
    showStatus(t("menus.apiKeys.copiedNamed", { name: key.name }), "success");
  } else {
    showStatus(t("menus.apiKeys.copyFailed"), "error");
  }
  await pause();
}

/**
 * Handle deleting API key
 * @param {Object} key - API key object
 * @returns {Promise<boolean>} Success status
 */
async function handleDeleteKey(key) {
  console.log(t("menus.apiKeys.deleteTitle", { name: key.name }));
  console.log("─".repeat(30));
  console.log(t("menus.apiKeys.keyLine", { value: maskKey(key.key) }));
  console.log(t("menus.apiKeys.createdLine", { value: formatDate(key.createdAt) }));

  const confirmed = await confirm(t("menus.apiKeys.deleteConfirm"));

  if (!confirmed) {
    showStatus(t("menus.apiKeys.deleteCancelled"), "info");
    await pause();
    return false;
  }

  const result = await api.deleteApiKey(key.id);

  if (!result.success) {
    showStatus(t("menus.apiKeys.deleteFailed", { error: result.error }), "error");
    await pause();
    return false;
  }

  showStatus(t("menus.apiKeys.deleted"), "success");
  await pause();
  return true;
}

/**
 * Show actions for a specific key
 * @param {Object} key - API key object
 * @param {number} port - Server port
 * @param {Array<string>} breadcrumb - Breadcrumb path
 */
async function showKeyActions(key, port, breadcrumb = []) {
  const { endpoint } = await getEndpoint(port);
  await showMenuWithBack({
    title: `🔑 ${key.name}`,
    breadcrumb: [...breadcrumb, key.name],
    headerContent: t("menus.apiKeys.actionsHeader", { name: key.name, key: key.key, endpoint }),
    items: [
      {
        label: t("menus.apiKeys.copyAction"),
        action: async () => {
          await handleCopyKey(key);
          return true;
        }
      },
      {
        label: t("menus.apiKeys.deleteAction"),
        action: async () => {
          await handleDeleteKey(key);
          return false; // Exit after delete
        }
      }
    ]
  });
}

/**
 * Main API Keys menu
 * @param {number} port - Server port number
 * @param {Array<string>} breadcrumb - Breadcrumb path
 */
async function showApiKeysMenu(port, breadcrumb = []) {
  const { showListMenu } = require("../utils/menuHelper");
  
  const { endpoint } = await getEndpoint(port);
  await showListMenu({
    title: t("menus.apiKeys.title"),
    breadcrumb,
    headerContent: t("menus.apiKeys.endpointHeader", { endpoint }),
    fetchItems: async () => {
      const result = await api.getApiKeys();
      if (!result.success) {
        clearScreen();
        showStatus(t("menus.apiKeys.fetchFailed", { error: result.error }), "error");
        await pause();
        return null;
      }
      return { items: result.data.keys || [] };
    },
    formatItem: (key) => `${key.name} (${maskKey(key.key)})`,
    onSelect: async (key) => {
      await showKeyActions(key, port, breadcrumb);
    },
    createAction: {
      label: t("menus.apiKeys.createAction"),
      action: async () => {
        await handleCreateKey();
      }
    }
  });
}

module.exports = {
  showApiKeysMenu
};
