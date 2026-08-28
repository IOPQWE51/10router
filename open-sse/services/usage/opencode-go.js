/**
 * OpenCode Go usage — GET https://opencode.ai/zen/go/v1/usage
 * Auth: Bearer <apiKey>
 *
 * Response shape (verified against opencode.ai/zen/go/v1/usage):
 * {
 *   "usage": {
 *     "rolling": { "status": "ok", "percent": 0, "resetsAt": "..." },
 *     "weekly":  { "status": "ok", "percent": 0, "resetsAt": "..." },
 *     "monthly": { "status": "ok", "percent": 0, "resetsAt": "..." }
 *   }
 * }
 * Each window reports `percent` (0-100 of the allowance already consumed) and
 * `resetsAt`. No single overall percent is returned — surface each window.
 */

import { proxyAwareFetch } from "../../utils/proxyFetch.js";
import { toFiniteNumber, parseResetTime } from "./shared.js";

const USAGE_URL = "https://opencode.ai/zen/go/v1/usage";

// Clamp a 0-100 consumed percent into a QuotaTable-friendly entry where
// `used` is the consumed share of a nominal 100-point budget.
function percentQuota(label, window) {
  if (!window || typeof window !== "object") return null;
  const consumed = Math.min(100, Math.max(0, toFiniteNumber(window.percent, 0)));
  const remaining = Math.round(100 - consumed);
  const resetsAt = parseResetTime(window.resetsAt);
  if (window.percent === undefined && !resetsAt) return null;
  return {
    used: consumed,
    total: 100,
    remainingPercentage: remaining,
    resetAt: resetsAt || null,
    recurring: false,
    name: label,
  };
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
    const quotas = {};

    // Flat windows: rolling / weekly / monthly each carry { status, percent, resetsAt }.
    for (const [key, label] of [["rolling", "Rolling"], ["weekly", "Weekly"], ["monthly", "Monthly"]]) {
      if (usage[key] && typeof usage[key] === "object") {
        const q = percentQuota(label, usage[key]);
        if (q) quotas[label] = q;
      }
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
