import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";
import { makeKv } from "../helpers/kvStore.js";

const aliasKv = makeKv("modelAliases");
const customKv = makeKv("customModels");
const mitmKv = makeKv("mitmAlias");

// modelAliases: key=alias, value=modelString
export async function getModelAliases() {
  return await aliasKv.getAll();
}

export async function setModelAlias(alias, model) {
  await aliasKv.set(alias, model);
}

export async function deleteModelAlias(alias) {
  await aliasKv.remove(alias);
}

// customModels: key=`${providerAlias}|${id}|${type}`, value=full model object
function customKey(providerAlias, id, type) {
  return `${providerAlias}|${id}|${type}`;
}

export async function getCustomModels() {
  const all = await customKv.getAll();
  return Object.values(all);
}

// Atomic check-then-insert inside transaction to prevent duplicate races
export async function addCustomModel({ providerAlias, id, type = "llm", name, vision, reasoning, contextWindow, maxOutput, thinkingFormat }) {
  const k = customKey(providerAlias, id, type);
  const db = await getAdapter();
  let added = false;
  const value = stringifyJson({
    providerAlias, id, type,
    name: name || id,
    ...(vision === undefined ? {} : { vision }),
    ...(reasoning === undefined ? {} : { reasoning }),
    ...(contextWindow === undefined ? {} : { contextWindow }),
    ...(maxOutput === undefined ? {} : { maxOutput }),
    ...(thinkingFormat === undefined ? {} : { thinkingFormat }),
  });
  db.transaction(() => {
    const row = db.get(`SELECT 1 FROM kv WHERE scope = 'customModels' AND key = ?`, [k]);
    if (row) {
      // Update capability fields on an existing custom model (e.g. JSON re-sync).
      db.run(`UPDATE kv SET value = ? WHERE scope = 'customModels' AND key = ?`, [value, k]);
      return;
    }
    db.run(`INSERT INTO kv(scope, key, value) VALUES('customModels', ?, ?)`, [k, value]);
    added = true;
  });
  return added;
}

export async function deleteCustomModel({ providerAlias, id, type = "llm" }) {
  await customKv.remove(customKey(providerAlias, id, type));
}

// Remove every custom model registered under a providerAlias (used when a custom
// provider node is deleted — its customModels would otherwise linger in the kv
// table and pollute /v1/models with orphan entries pointing at a gone node).
// Key format: `${providerAlias}|${id}|${type}` so a prefix match clears them all.
export async function deleteCustomModelsByProvider(providerAlias) {
  const db = await getAdapter();
  db.run(`DELETE FROM kv WHERE scope = 'customModels' AND key LIKE ?`, [`${providerAlias}|%`]);
}

// mitmAlias: key=toolName, value=mappings object
export async function getMitmAlias(toolName) {
  if (toolName) {
    const v = await mitmKv.get(toolName);
    return v || {};
  }
  return await mitmKv.getAll();
}

export async function setMitmAliasAll(toolName, mappings) {
  await mitmKv.set(toolName, mappings || {});
}
