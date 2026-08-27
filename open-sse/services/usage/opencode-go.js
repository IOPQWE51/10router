/**
 * OpenCode Go usage — GET https://opencode.ai/zen/go/v1/usage
 * Auth: Bearer <apiKey>
 *
 * Response shape (from OpenCode console service source):
 * {
 *   "usage": {
 *     "rolling": {
 *       "weekly":  { "percent": 0,  "resetsAt": "..." },
 *       "monthly": { "percent": 3,  "resetsAt": "..." }
 *     },
 *     "status": "ok",
 *     "percent": 57,
 *     "resetsAt": "..."
 *   },
 *   "status": "ok"
 * }
 * `percent` values are 0-100 of the allowance already consumed.
 */

import { proxyAwareFetch } from "../../utils/proxyFetch.js";
import { toFiniteNumber, parseResetTime } from "./shared.js";

const USAGE_URL = "https://opencode.ai/zen/go/v1/usage";

// Clamp a 0-100 consumed percent into a QuotaTable-friendly entry where
// `used` is the consumed share of a nominal 100-point budget.
function percentQuota(label, percent, resetsAt) {
  const consumed = Math.min(100, Math.max(0, toFiniteNumber(percent, 0)));
  const remaining = Math.round(100 - consumed);
  const q = {
    used: consumed,
    total: 100,
    remainingPercentage: remaining,
    resetAt: parseResetTime(resetsAt) || null,
    recurring: false,
  };
  // Only expose the row when there is a usable value or a reset window.
  if (q.total === 0 && !q.resetAt) return null;
  q.name = label;
  return q;
}

/**
 * @param {string|null|undefined} apiKey
 * @param {object|null} proxyOptions
 */
export async function getOpencodeGoUsage(apiKey = null, proxyOptions = null) {
  const token = (apiKey || "").trim();
  if (!token) {
    return { message: "OpenCode Go API key not available. Add a key to view usage." };
  }

  try {
    const response = await proxyAwareFetch(
      USAGE_URL,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
      proxyOptions,
    );

    if (response.status === 401 || response.status === 403) {
      return {
        plan: "OpenCode Go",
        message: "OpenCode Go authentication failed. Check the API key.",
      };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        plan: "OpenCode Go",
        message: `OpenCode Go usage API error (${response.status})${errText ? `: ${errText.slice(0, 120)}` : ""}`,
      };
    }

    const data = await response.json().catch(() => null);
    if (!data || typeof data !== "object") {
      return { message: "OpenCode Go usage response was not JSON." };
    }

    const usage = data.usage && typeof data.usage === "object" ? data.usage : {};
    const rolling = usage.rolling && typeof usage.rolling === "object" ? usage.rolling : {};
    const quotas = {};

    if (rolling.weekly && typeof rolling.weekly === "object") {
      const q = percentQuota("Weekly", rolling.weekly.percent, rolling.weekly.resetsAt);
      if (q) quotas["Weekly"] = q;
    }
    if (rolling.monthly && typeof rolling.monthly === "object") {
      const q = percentQuota("Monthly", rolling.monthly.percent, rolling.monthly.resetsAt);
      if (q) quotas["Monthly"] = q;
    }
    if (usage.percent !== undefined) {
      const q = percentQuota("Plan", usage.percent, usage.resetsAt);
      if (q) quotas["Plan"] = q;
    }

    if (Object.keys(quotas).length === 0) {
      return {
        plan: "OpenCode Go",
        message: "OpenCode Go connected. No quota data returned.",
      };
    }

    const status = String(usage.status || data.status || "").toLowerCase();
    return {
      plan: status === "ok" ? "OpenCode Go" : `OpenCode Go (${usage.status || data.status || ""})`,
      quotas,
    };
  } catch (error) {
    return { message: `OpenCode Go error: ${error.message}` };
  }
}
