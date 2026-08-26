import fs from "node:fs";
import path from "path";
import os from "os";

const APP_NAME = "10router";
const LEGACY_APP_NAME = "9router";

function legacyDir() {
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), LEGACY_APP_NAME);
  }
  return path.join(os.homedir(), `.${LEGACY_APP_NAME}`);
}

// One-time migration: users upgrading from 9Router keep their data in ~/.9router.
// If the legacy dir exists and the new dir is missing or empty, copy it over.
// The legacy dir is left in place so the operation can be retried manually.
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

export function getDataDir() {
  const configured = process.env.DATA_DIR;
  if (!configured) {
    migrateLegacyData();
    return defaultDir();
  }

  // On Windows, ignore Unix-style absolute paths (e.g. /var/lib/...) that come
  // from a Linux-targeted .env or Docker config — they are not valid here.
  if (process.platform === "win32" && /^\//.test(configured)) {
    console.warn(`[DATA_DIR] '${configured}' is a Unix path on Windows → fallback to default`);
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

export const DATA_DIR = getDataDir();
