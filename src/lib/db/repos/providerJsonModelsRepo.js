import { makeKv } from "../helpers/kvStore.js";

// providerJsonModels: key = providerId, value = { models: [ {id, name, enabled,
// vision, reasoning, contextWindow, maxOutput, thinkingFormat}, ... ] }
//
// This stores the model catalog pulled from a provider's `modelsJsonUrl` (a
// GitHub-hosted JSON) as the provider's authoritative model list — distinct from
// user-added customModels. Each model carries an `enabled` flag so the user can
// enable/disable (not delete) individual entries.
const jsonModelsKv = makeKv("providerJsonModels");

export async function getProviderJsonModels(providerId) {
  const entry = await jsonModelsKv.get(providerId, null);
  if (!entry || !Array.isArray(entry.models)) return null;
  return entry.models;
}

export async function setProviderJsonModels(providerId, models) {
  await jsonModelsKv.set(providerId, { models });
}

export async function updateProviderJsonModelEnabled(providerId, modelId, enabled) {
  const entry = await jsonModelsKv.get(providerId, null);
  if (!entry || !Array.isArray(entry.models)) return false;
  let changed = false;
  for (const m of entry.models) {
    if (m.id === modelId && m.enabled !== enabled) {
      m.enabled = enabled;
      changed = true;
    }
  }
  if (changed) await jsonModelsKv.set(providerId, entry);
  return changed;
}

// Bulk flip the enabled flag of every model in the catalog (one write).
export async function setAllProviderJsonModelsEnabled(providerId, enabled) {
  const entry = await jsonModelsKv.get(providerId, null);
  if (!entry || !Array.isArray(entry.models)) return false;
  let changed = false;
  for (const m of entry.models) {
    if (m.enabled !== enabled) {
      m.enabled = enabled;
      changed = true;
    }
  }
  if (changed) await jsonModelsKv.set(providerId, entry);
  return changed;
}

export async function clearProviderJsonModels(providerId) {
  await jsonModelsKv.remove(providerId);
}
