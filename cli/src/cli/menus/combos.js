const api = require("../api/client");
const { t } = require("../i18n");
const { prompt, confirm, pause } = require("../utils/input");
const { clearScreen, showStatus, showHeader } = require("../utils/display");
const { formatDate } = require("../utils/format");
const { selectModelFromList } = require("../utils/modelSelector");
const { showMenuWithBack } = require("../utils/menuHelper");

/**
 * Format model to string (handle both string and object)
 */
function formatModel(model) {
  if (typeof model === "string") return model;
  if (model && typeof model === "object") {
    return model.id || model.name || `${model.provider}/${model.model}` || JSON.stringify(model);
  }
  return String(model);
}

/**
 * Show actions for a specific combo
 * @param {Object} combo - Combo object
 * @param {Array<string>} breadcrumb - Breadcrumb path
 */
async function showComboActions(combo, breadcrumb = []) {
  const modelsChain = Array.isArray(combo.models) 
    ? combo.models.map(formatModel).join(" → ") 
    : "";
  
  await showMenuWithBack({
    title: `🔀 ${combo.name}`,
    breadcrumb: [...breadcrumb, combo.name],
    headerContent: t("menus.combos.actionsHeader", { name: combo.name, models: modelsChain }),
    items: [
      {
        label: t("menus.combos.editCombo"),
        action: async () => {
          await handleEditSingleCombo(combo);
          return true;
        }
      },
      {
        label: t("menus.combos.deleteCombo"),
        action: async () => {
          await handleDeleteSingleCombo(combo);
          return false; // Exit after delete
        }
      }
    ]
  });
}

/**
 * Handle editing a single combo
 * @param {Object} combo - Combo to edit
 */
async function handleEditSingleCombo(combo) {
  clearScreen();
  console.log(`\n${t("menus.combos.editTitle", { name: combo.name })}\n`);

  const newName = await prompt(t("menus.combos.newNamePrompt", { name: combo.name }));
  const name = newName || combo.name;

  console.log(t("menus.combos.currentModels", { models: Array.isArray(combo.models) ? combo.models.map(formatModel).join(" → ") : "" }));
  console.log(t("menus.combos.selectModelsOneByOne"));

  const models = [];
  let addMore = true;

  while (addMore) {
    const currentChain = models.length > 0 ? models.join(" → ") : t("menus.combos.none");
    const model = await selectModelFromList(t("menus.combos.addModelNumbered", { number: models.length + 1 }), t("menus.combos.chainLabel", { chain: currentChain }));

    if (model) {
      models.push(model);
      console.log(`\n${t("menus.combos.addedCheck", { model })}`);
      console.log(t("menus.combos.currentChain", { chain: models.join(" → ") }) + "\n");

      const continueAdding = await confirm(t("menus.combos.addAnother"));
      addMore = continueAdding;
    } else {
      addMore = false;
    }
  }
  
  // Use new models if any were added, otherwise keep current
  const finalModels = models.length > 0 ? models : combo.models;
  
  const result = await api.updateCombo(combo.id, { name, models: finalModels });
  
  if (result.success) {
    showStatus(t("menus.combos.updateSuccess"), "success");
  } else {
    showStatus(t("menus.combos.updateFailedShort", { error: result.error }), "error");
  }
  await pause();
}

/**
 * Handle deleting a single combo
 * @param {Object} combo - Combo to delete
 */
async function handleDeleteSingleCombo(combo) {
  const confirmed = await confirm(t("menus.combos.deleteOneConfirm", { name: combo.name }));
  if (confirmed) {
    const result = await api.deleteCombo(combo.id);
    if (result.success) {
      showStatus(t("menus.combos.deleteOneSuccess"), "success");
    } else {
      showStatus(t("menus.combos.deleteFailedShort", { error: result.error }), "error");
    }
    await pause();
  }
}

/**
 * Main combos menu - list all combos and actions
 * @param {Array<string>} breadcrumb - Breadcrumb path
 */
async function showCombosMenu(breadcrumb = []) {
  const { showListMenu } = require("../utils/menuHelper");
  
  await showListMenu({
    title: t("menus.combos.managementTitle"),
    breadcrumb,
    fetchItems: async () => {
      const result = await api.getCombos();
      if (!result.success) {
        clearScreen();
        showStatus(t("menus.combos.loadFailed", { error: result.error }), "error");
        await pause();
        return null;
      }
      return { items: result.data.combos || [] };
    },
    formatItem: (combo) => {
      const modelsChain = Array.isArray(combo.models) ? combo.models.map(formatModel).join(" → ") : "";
      const maxLen = 35;
      const displayModels = modelsChain.length > maxLen 
        ? modelsChain.substring(0, maxLen - 3) + "..." 
        : modelsChain;
      return `${combo.name}: ${displayModels}`;
    },
    onSelect: async (combo) => {
      await showComboActions(combo, breadcrumb);
    },
    createAction: {
      label: t("menus.combos.createNewCombo"),
      action: async () => {
        await handleCreateCombo();
      }
    }
  });
}

/**
 * Show combo detail with stats
 */
async function showComboDetail(comboId) {
  clearScreen();
  
  const result = await api.getComboById(comboId);
  
  if (!result.success) {
    showStatus(t("menus.combos.detailLoadFailed", { error: result.error }), "error");
    await pause();
    return;
  }

  const combo = result.data;

  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log(`│  ${t("menus.combos.detailComboLabel", { name: combo.name.padEnd(46) })} │`);
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log("│                                                          │");
  console.log(`│  ${t("menus.combos.detailIdLabel", { id: combo.id.padEnd(51) })} │`);
  console.log(`│  ${t("menus.combos.detailCreatedLabel", { date: formatDate(combo.createdAt).padEnd(46) })} │`);
  console.log(`│  ${t("menus.combos.detailUpdatedLabel", { date: formatDate(combo.updatedAt).padEnd(46) })} │`);
  console.log("│                                                          │");
  console.log("│  " + t("menus.combos.detailModelChain").padEnd(55) + "│");
  
  // Models is array of strings like ["ag/claude-sonnet-4-5", "kr/claude-sonnet-4.5"]
  const models = Array.isArray(combo.models) ? combo.models : [];
  models.forEach((modelStr, index) => {
    const arrow = index < models.length - 1 ? " →" : "  ";
    const displayText = `${index + 1}. ${modelStr}${arrow}`;
    const padding = Math.max(0, 54 - displayText.length);
    console.log(`│    ${displayText}${" ".repeat(padding)} │`);
  });
  
  console.log("│                                                          │");
  console.log("└─────────────────────────────────────────────────────────┘");
  
  await pause();
}

/**
 * Format combo for menu display
 */
function formatComboLabel(combo) {
  const modelsChain = Array.isArray(combo.models) ? combo.models.map(formatModel).join(" → ") : "";
  const maxLen = 40;
  const displayModels = modelsChain.length > maxLen 
    ? modelsChain.substring(0, maxLen - 3) + "..." 
    : modelsChain;
  return `${combo.name}: ${displayModels}`;
}

/**
 * Create new combo
 */
async function handleCreateCombo() {
  clearScreen();
  
  showStatus(t("menus.combos.createNewCombo"), "info");
  console.log();

  // Get combo name
  const name = await prompt(t("menus.combos.namePrompt"));
  if (!name) {
    showStatus(t("menus.combos.nameRequired"), "error");
    await pause();
    return;
  }

  // Fetch available models
  showStatus(t("menus.combos.loadingModels"), "info");
  const modelsResult = await api.getModels();

  if (!modelsResult.success) {
    showStatus(t("menus.combos.modelsLoadFailed", { error: modelsResult.error }), "error");
    await pause();
    return;
  }

  const availableModels = modelsResult.data.models || [];

  if (availableModels.length === 0) {
    showStatus(t("menus.combos.noModels"), "warning");
    await pause();
    return;
  }

  // Select models for chain
  const selectedModels = [];

  console.log();
  showStatus(t("menus.combos.selectForChain"), "info");

  while (true) {
    clearScreen();
    console.log(t("menus.combos.creatingNamed", { name }));
    console.log(t("menus.combos.selectedModels", { count: selectedModels.length }));

    if (selectedModels.length > 0) {
      selectedModels.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.provider}/${m.model}`);
      });
    } else {
      console.log("  " + t("menus.combos.noneInParens"));
    }

    console.log();
    console.log(t("menus.combos.availableModels"));
    availableModels.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.provider}/${m.model}`);
    });

    console.log();
    console.log(t("menus.combos.actionsTitle"));
    console.log("  " + t("menus.combos.hintEnterNumber"));
    console.log("  " + t("menus.combos.hintDone"));
    console.log("  " + t("menus.combos.hintCancel"));

    const input = await prompt(t("menus.combos.actionPrompt"));

    if (input.toLowerCase() === "cancel") {
      showStatus(t("menus.combos.cancelled"), "warning");
      await pause();
      return;
    }

    if (input.toLowerCase() === "done") {
      if (selectedModels.length < 2) {
        showStatus(t("menus.combos.minTwoModels"), "error");
        await pause();
        continue;
      }
      break;
    }

    const num = parseInt(input, 10);
    if (isNaN(num) || num < 1 || num > availableModels.length) {
      showStatus(t("menus.combos.invalidNumber"), "error");
      await pause();
      continue;
    }

    selectedModels.push(availableModels[num - 1]);
  }

  // Create combo
  showStatus(t("menus.combos.creating"), "info");

  const createResult = await api.createCombo({
    name,
    models: selectedModels
  });

  if (!createResult.success) {
    showStatus(t("menus.combos.createFailed", { error: createResult.error }), "error");
    await pause();
    return;
  }

  showStatus(t("menus.combos.createSuccess", { name }), "success");
  await pause();
}

/**
 * Edit combo - select which combo to edit
 */
async function handleEditCombo(combos) {
  if (combos.length === 0) {
    showStatus(t("menus.combos.noCombos"), "warning");
    await pause();
    return;
  }

  let selectedCombo = null;

  await showMenuWithBack({
    title: t("menus.combos.selectToEdit"),
    items: combos.map(combo => ({
      label: formatComboLabel(combo),
      action: async () => {
        selectedCombo = combo;
        return false;
      }
    }))
  });
  
  if (!selectedCombo) return;
  await editSingleCombo(selectedCombo);
}

/**
 * Edit a single combo
 */
async function editSingleCombo(combo) {
  clearScreen();
  showStatus(t("menus.combos.editingNamed", { name: combo.name }), "info");
  console.log();

  const newName = await prompt(t("menus.combos.newNameCurrentPrompt", { name: combo.name }));
  const editModels = await confirm(t("menus.combos.editChainPrompt"));

  let newModels = combo.models;

  if (editModels) {
    newModels = [];

    while (true) {
      clearScreen();
      console.log(t("menus.combos.editingNamed", { name: combo.name }));
      console.log(t("menus.combos.selectedModels", { count: newModels.length }));

      if (newModels.length > 0) {
        newModels.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
      } else {
        console.log("  " + t("menus.combos.noneInParens"));
      }

      console.log("\n" + t("menus.combos.doneOrCancel") + "\n");

      const model = await selectModelFromList(t("menus.combos.addModelTitle"), "");

      if (model === null) {
        showStatus(t("menus.combos.cancelled"), "warning");
        await pause();
        return;
      }

      if (model === "done") {
        if (newModels.length < 2) {
          showStatus(t("menus.combos.minTwoModels"), "error");
          await pause();
          continue;
        }
        break;
      }

      newModels.push(model);
      showStatus(t("menus.combos.addedModel", { model }), "success");
      await pause();
    }
  }

  const updateData = {};
  if (newName) updateData.name = newName;
  if (editModels) updateData.models = newModels;

  if (Object.keys(updateData).length === 0) {
    showStatus(t("menus.combos.noChanges"), "warning");
    await pause();
    return;
  }

  showStatus(t("menus.combos.updating"), "info");

  const updateResult = await api.updateCombo(combo.id, updateData);

  if (!updateResult.success) {
    showStatus(t("menus.combos.updateFailed", { error: updateResult.error }), "error");
    await pause();
    return;
  }

  showStatus(t("menus.combos.updateSuccessFull"), "success");
  await pause();
}

/**
 * Delete combo - select which combo to delete
 */
async function handleDeleteCombo(combos) {
  if (combos.length === 0) {
    showStatus(t("menus.combos.noCombos"), "warning");
    await pause();
    return;
  }

  let selectedCombo = null;

  await showMenuWithBack({
    title: t("menus.combos.selectToDelete"),
    items: combos.map(combo => ({
      label: formatComboLabel(combo),
      action: async () => {
        selectedCombo = combo;
        return false;
      }
    }))
  });
  
  if (!selectedCombo) return;
  
  clearScreen();
  showStatus(t("menus.combos.comboLabel", { name: selectedCombo.name }), "warning");
  const modelsDisplay = Array.isArray(selectedCombo.models)
    ? selectedCombo.models.map(formatModel).join(" → ")
    : "";
  console.log(t("menus.combos.modelsLabel", { models: modelsDisplay }));
  console.log();

  const confirmed = await confirm(t("menus.combos.deleteConfirm"));

  if (!confirmed) {
    showStatus(t("menus.combos.cancelled"), "info");
    await pause();
    return;
  }

  showStatus(t("menus.combos.deleting"), "info");

  const deleteResult = await api.deleteCombo(selectedCombo.id);

  if (!deleteResult.success) {
    showStatus(t("menus.combos.deleteFailed", { error: deleteResult.error }), "error");
    await pause();
    return;
  }

  showStatus(t("menus.combos.deleteSuccessFull"), "success");
  await pause();
}

module.exports = { showCombosMenu };
