import { translate } from "@/i18n/runtime";

/**
 * Friendly i18n translation for upstream quota-exhausted errors.
 *
 * Covers Google-style HTTP 429 `RESOURCE_EXHAUSTED` payloads (Antigravity /
 * Gemini Code Assist), e.g.:
 *   "Individual quota reached. Please upgrade your subscription to increase
 *    your limits. Resets in 1h27m36s."
 *   with details[].quotaResetDelay ("1h27m36.139434956s") and
 *   details[].quotaResetTimeStamp ("2026-09-15T12:52:06Z").
 *
 * Dynamic values (reset time / countdown) cannot live in the literal
 * dictionary, so templates are looked up then placeholders replaced here.
 */

const RESET_TEMPLATE_KEY = "Individual quota reached. Resets at {time} (in {duration}).";

function fmtUnit(key, n) {
  // Falls back to the raw key ("{n}h" -> "3h") when the dictionary is missing.
  return translate(key).replace("{n}", String(n));
}

/**
 * Parse a Google-style duration string ("1h27m36.139434956s") into {h, m, s}.
 * Returns null when nothing parses.
 */
export function parseQuotaDurationParts(str) {
  const m = /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?$/i.exec(String(str || "").trim());
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return {
    h: Math.floor(parseFloat(m[1] || 0)),
    m: Math.floor(parseFloat(m[2] || 0)),
    s: Math.round(parseFloat(m[3] || 0)),
  };
}

/** Format parsed parts into a localized duration like "1小时27分36秒" / "1h 27m 36s". */
export function formatQuotaDuration(parts) {
  if (!parts) return "";
  let { h, m, s } = parts;
  if (s >= 60) { m += Math.floor(s / 60); s %= 60; }
  if (m >= 60) { h += Math.floor(m / 60); m %= 60; }
  const segments = [];
  if (h > 0) segments.push(fmtUnit("{n}h", h));
  if (m > 0) segments.push(fmtUnit("{n}m", m));
  if (s > 0 || segments.length === 0) segments.push(fmtUnit("{n}s", s));
  return segments.join(" ");
}

/** Extract reset info from a raw error payload (JSON body or plain message). */
export function extractQuotaResetInfo(text) {
  const raw = String(text || "");
  let delay = null;
  let timestamp = null;

  const delayJson = /"quotaResetDelay"\s*:\s*"([^"]+)"/.exec(raw);
  const delayPlain = /\bResets in\s+([0-9hms.]+)/i.exec(raw);
  delay = (delayJson && delayJson[1]) || (delayPlain && delayPlain[1]) || null;

  const tsJson = /"quotaResetTimeStamp"\s*:\s*"([^"]+)"/.exec(raw);
  const tsPlain = /"quotaResetTimeStamp"\s*:\s*(".*?"|\S+)/.exec(raw);
  timestamp = (tsJson && tsJson[1]) || (tsPlain && tsPlain[1]) || null;
  if (timestamp) timestamp = timestamp.replace(/^"|"$/g, "");

  return { delay, timestamp };
}

function formatResetTime(ts) {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return ts || "";
  try {
    return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return date.toISOString();
  }
}

/**
 * Translate an upstream error string into a friendly localized message.
 * Unmatched inputs fall back to the plain literal translate() pipeline.
 */
export function translateQuotaError(errorText) {
  if (!errorText || typeof errorText !== "string") return errorText ?? "";

  const direct = translate(errorText);
  if (direct && direct !== errorText) return direct;

  // Google-style per-account quota exhausted (HTTP 429 RESOURCE_EXHAUSTED).
  if (/Individual quota reached|QUOTA_EXHAUSTED|RESOURCE_EXHAUSTED/i.test(errorText)) {
    const { delay, timestamp } = extractQuotaResetInfo(errorText);
    const durationStr = formatQuotaDuration(parseQuotaDurationParts(delay));
    const timeStr = timestamp ? formatResetTime(timestamp) : "";
    let msg = translate(RESET_TEMPLATE_KEY);
    // Legacy rows were stored truncated to 100 chars, which cut the reset
    // fields off the JSON tail — substitute neutral values so the sentence
    // never renders with empty placeholders ("将于  重置（约  后）").
    msg = msg.replace("{time}", timeStr || translate("shortly"));
    msg = msg.replace("{duration}", durationStr || translate("a short while"));
    return msg;
  }

  return direct;
}
