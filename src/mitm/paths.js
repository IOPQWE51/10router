const fs = require("fs");
const path = require("path");
const os = require("os");

const APP_NAME = "10router";
const LEGACY_APP_NAME = "9router";

function legacyDir() {
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), LEGACY_APP_NAME);
  }
  return path.join(os.homedir(), `.${LEGACY_APP_NAME}`);
}

// One-time migration from 9Router data dir (mirrors src/lib/dataDir.js).
function migrateLegacyData() {
  try {
    const legacy = legacyDir();
    const next = defaultDir();
    if (!fs.existsSync(legacy)) return;
    if (fs.existsSync(next) && fs.readdirSync(next).length > 0) return;
    fs.cpSync(legacy, next, { recursive: true });
    console.log(`[migration] copied legacy data dir ${legacy} → ${next}`);
  } catch (e) {
    console.warn(`[migration] failed to migrate ${legacyDir()} → ${defaultDir()}: ${e?.message}`);
  }
}

function defaultDir() {
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), APP_NAME);
  }
  return path.join(os.homedir(), `.${APP_NAME}`);
}

function getDataDir() {
  const configured = process.env.DATA_DIR;
  if (!configured) {
    migrateLegacyData();
    return defaultDir();
  }
  try {
    fs.mkdirSync(configured, { recursive: true });
    return configured;
  } catch (e) {
    if (e?.code === "EACCES" || e?.code === "EPERM") {
      console.warn(`[DATA_DIR] '${configured}' not writable → fallback ~/.${APP_NAME}`);
      return defaultDir();
    }
    throw e;
  }
}

const DATA_DIR = getDataDir();
const MITM_DIR = path.join(DATA_DIR, "mitm");

module.exports = { DATA_DIR, MITM_DIR };
