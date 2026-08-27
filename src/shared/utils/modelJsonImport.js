// Global switch for the "Fetch Models from GitHub JSON" feature.
// When enabled, provider detail pages show a "Fetch Models" button for any
// provider that declares a `modelsJsonUrl` in its registry entry. The button
// pulls the latest catalog from that JSON and merges new models into the
// user's customModels.
//
// Off by default (opt-in). Stored client-side via localStorage, mirroring the
// existing "Regional currency" toggle pattern.
const STORAGE_KEY = "modelJsonImport";

// Is the model-JSON import feature enabled globally?
export function isModelJsonImportEnabled() {
  if (typeof localStorage === "undefined") return false;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "1";
}

// Enable/disable the feature globally.
export function setModelJsonImportEnabled(enabled) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}
