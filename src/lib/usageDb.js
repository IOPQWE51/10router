import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";
import os from "os";
import fs from "fs";
import { fileURLToPath } from "url";

// Request details live in the SQLite layer; re-export so chatCore's
// `@/lib/usageDb` import keeps working.
export {
  saveRequestDetail, getRequestDetails, getActiveRequests, getChartData,
  getUsageStats,
} from "@/lib/db/index.js";
export { statsEmitter } from "@/lib/db/repos/usageRepo.js";

// Get app name from root package.json config
function getAppName() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // Look for root package.json (monorepo root)
  const rootPkgPath = path.resolve(__dirname, "../../../package.json");
  try {
    const pkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));
    return pkg.config?.appName || "9router";
  } catch {
    return "9router";
  }
}

// Get user data directory based on platform
function getUserDataDir() {
  const platform = process.platform;
  const homeDir = os.homedir();
  const appName = getAppName();

  if (platform === "win32") {
    return path.join(process.env.APPDATA || path.join(homeDir, "AppData", "Roaming"), appName);
  } else {
    // macOS & Linux: ~/.{appName}
    return path.join(homeDir, `.${appName}`);
  }
}

// Data file path - stored in user home directory
const DATA_DIR = getUserDataDir();
const DB_FILE = path.join(DATA_DIR, "usage.json");
const LOG_FILE = path.join(DATA_DIR, "log.txt");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default data structure
const defaultData = {
  history: []
};

// Singleton instance
let dbInstance = null;

// Track in-flight requests in memory
const pendingRequests = {
  byModel: {},
  byAccount: {}
};

/**
 * Track a pending request
 * @param {string} model
 * @param {string} provider
 * @param {string} connectionId
 * @param {boolean} started - true if started, false if finished
 */
export function trackPendingRequest(model, provider, connectionId, started) {
  const modelKey = provider ? `${model} (${provider})` : model;

  // Track by model
  if (!pendingRequests.byModel[modelKey]) pendingRequests.byModel[modelKey] = 0;
  pendingRequests.byModel[modelKey] = Math.max(0, pendingRequests.byModel[modelKey] + (started ? 1 : -1));

  // Track by account
  if (connectionId) {
    const accountKey = connectionId; // We use connectionId as key here
    if (!pendingRequests.byAccount[accountKey]) pendingRequests.byAccount[accountKey] = {};
    if (!pendingRequests.byAccount[accountKey][modelKey]) pendingRequests.byAccount[accountKey][modelKey] = 0;
    pendingRequests.byAccount[accountKey][modelKey] = Math.max(0, pendingRequests.byAccount[accountKey][modelKey] + (started ? 1 : -1));
  }
}

/**
 * Get usage database instance (singleton)
 */
export async function getUsageDb() {
  if (!dbInstance) {
    const adapter = new JSONFile(DB_FILE);
    dbInstance = new Low(adapter, defaultData);

    // Try to read DB with error recovery for corrupt JSON
    try {
      await dbInstance.read();
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.warn('[DB] Corrupt Usage JSON detected, resetting to defaults...');
        dbInstance.data = defaultData;
        await dbInstance.write();
      } else {
        throw error;
      }
    }

    // Initialize with default data if empty
    if (!dbInstance.data) {
      dbInstance.data = defaultData;
      await dbInstance.write();
    }
  }
  return dbInstance;
}

/**
 * Save request usage
 * @param {object} entry - Usage entry { provider, model, tokens: { prompt_tokens, completion_tokens, ... }, connectionId? }
 */
export async function saveRequestUsage(entry) {
  try {
    const db = await getUsageDb();

    // Add timestamp if not present
    if (!entry.timestamp) {
      entry.timestamp = new Date().toISOString();
    }

    // Ensure history array exists
    if (!Array.isArray(db.data.history)) {
      db.data.history = [];
    }

    db.data.history.push(entry);

    // Optional: Limit history size if needed in future
    // if (db.data.history.length > 10000) db.data.history.shift();

    await db.write();
  } catch (error) {
    console.error("Failed to save usage stats:", error);
  }
}

/**
 * Get usage history
 * @param {object} filter - Filter criteria
 */
export async function getUsageHistory(filter = {}) {
  const db = await getUsageDb();
  let history = db.data.history || [];

  // Apply filters
  if (filter.provider) {
    history = history.filter(h => h.provider === filter.provider);
  }

  if (filter.model) {
    history = history.filter(h => h.model === filter.model);
  }

  if (filter.startDate) {
    const start = new Date(filter.startDate).getTime();
    history = history.filter(h => new Date(h.timestamp).getTime() >= start);
  }

  if (filter.endDate) {
    const end = new Date(filter.endDate).getTime();
    history = history.filter(h => new Date(h.timestamp).getTime() <= end);
  }

  return history;
}

/**
 * Format date as dd-mm-yyyy h:m:s
 */
function formatLogDate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${d}-${m}-${y} ${h}:${min}:${s}`;
}

/**
 * Append to log.txt
 * Format: datetime(dd-mm-yyyy h:m:s) | model | provider | account | tokens sent | tokens received | status
 */
export async function appendRequestLog({ model, provider, connectionId, tokens, status }) {
  try {
    const timestamp = formatLogDate();
    const p = provider?.toUpperCase() || "-";
    const m = model || "-";

    // Resolve account name
    let account = connectionId ? connectionId.slice(0, 8) : "-";
    try {
      const { getProviderConnections } = await import("@/lib/localDb.js");
      const connections = await getProviderConnections();
      const conn = connections.find(c => c.id === connectionId);
      if (conn) {
        account = conn.name || conn.email || account;
      }
    } catch {}

    const sent = tokens?.prompt_tokens !== undefined ? tokens.prompt_tokens : "-";
    const received = tokens?.completion_tokens !== undefined ? tokens.completion_tokens : "-";

    const line = `${timestamp} | ${m} | ${p} | ${account} | ${sent} | ${received} | ${status}\n`;

    fs.appendFileSync(LOG_FILE, line);
  } catch (error) {
    console.error("Failed to append to log.txt:", error.message);
  }
}

/**
 * Get last N lines of log.txt
 */
export async function getRecentLogs(limit = 200) {
  if (!fs.existsSync(LOG_FILE)) return [];
  try {
    const content = fs.readFileSync(LOG_FILE, "utf-8");
    const lines = content.trim().split("\n");
    return lines.slice(-limit).reverse();
  } catch (error) {
    console.error("Failed to read log.txt:", error.message);
    return [];
  }
}

/**
 * Calculate cost for a usage entry
 * @param {string} provider - Provider ID
 * @param {string} model - Model ID
 * @param {object} tokens - Token counts
 * @returns {number} Cost in dollars
 */
async function calculateCost(provider, model, tokens) {
  if (!tokens || !provider || !model) return 0;

  try {
    const { getPricingForModel } = await import("@/lib/localDb.js");
    const pricing = await getPricingForModel(provider, model);

    if (!pricing) return 0;

    let cost = 0;

    // Input tokens (non-cached)
    const inputTokens = tokens.prompt_tokens || tokens.input_tokens || 0;
    const cachedTokens = tokens.cached_tokens || tokens.cache_read_input_tokens || 0;
    const nonCachedInput = Math.max(0, inputTokens - cachedTokens);

    cost += (nonCachedInput * (pricing.input / 1000000));

    // Cached tokens
    if (cachedTokens > 0) {
      const cachedRate = pricing.cached || pricing.input; // Fallback to input rate
      cost += (cachedTokens * (cachedRate / 1000000));
    }

    // Output tokens
    const outputTokens = tokens.completion_tokens || tokens.output_tokens || 0;
    cost += (outputTokens * (pricing.output / 1000000));

    // Reasoning tokens
    const reasoningTokens = tokens.reasoning_tokens || 0;
    if (reasoningTokens > 0) {
      const reasoningRate = pricing.reasoning || pricing.output; // Fallback to output rate
      cost += (reasoningTokens * (reasoningRate / 1000000));
    }

    // Cache creation tokens
    const cacheCreationTokens = tokens.cache_creation_input_tokens || 0;
    if (cacheCreationTokens > 0) {
      const cacheCreationRate = pricing.cache_creation || pricing.input; // Fallback to input rate
      cost += (cacheCreationTokens * (cacheCreationRate / 1000000));
    }

    return cost;
  } catch (error) {
    console.error("Error calculating cost:", error);
    return 0;
  }
}

// getUsageStats 已由 SQLite 层提供（支持 period 过滤），见顶部 re-export

