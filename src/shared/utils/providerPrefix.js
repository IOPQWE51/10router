import { AI_PROVIDERS } from "@/shared/constants/providers";

/**
 * Collect every identifier (id and alias) of the built-in provider registry,
 * plus the local alias overrides, normalized to lowercase. A custom-provider
 * node prefix must not collide with any of these (case-insensitively), or model
 * routing would resolve to the built-in provider instead of the user's node.
 */
export function getReservedProviderPrefixes() {
  const reserved = new Set();
  const add = (v) => {
    if (typeof v === "string" && v) reserved.add(v.toLowerCase());
  };
  for (const p of Object.values(AI_PROVIDERS)) {
    if (!p) continue;
    add(p.id);
    add(p.alias);
  }
  // Local provider alias overrides (see src/sse/services/model.js).
  add("xmtp");
  add("xiaomi-tokenplan");
  return reserved;
}

/**
 * Check whether a candidate prefix is usable for a custom provider node.
 *
 * Prefix comparison is case-insensitive: "CF" collides with reserved "cf" and
 * "MyAPI" collides with an existing "myapi", so a prefix can't silently route
 * to a built-in provider or shadow another node.
 *
 * @param {string} prefix        - The user-supplied prefix (trimmed).
 * @param {Array}  existingNodes - All provider nodes (from getProviderNodes()).
 * @param {string} [excludeNodeId] - Node id to ignore (for PUT, i.e. the node being edited).
 * @returns {{ error: string } | null} null when the prefix is usable, else a 400 error body.
 */
export function checkPrefixConflict(prefix, existingNodes, excludeNodeId = null) {
  const trimmed = (prefix || "").trim();
  if (!trimmed) return { error: "Prefix is required" };
  const lower = trimmed.toLowerCase();

  // Must not collide (case-insensitively) with a built-in provider id/alias.
  const reserved = getReservedProviderPrefixes();
  if (reserved.has(lower)) {
    return { error: `Prefix "${trimmed}" conflicts with a built-in provider` };
  }

  // Must not collide (case-insensitively) with another custom node's prefix.
  const dup = (existingNodes || []).find(
    (n) => n.id !== excludeNodeId && String(n.prefix || "").trim().toLowerCase() === lower
  );
  if (dup) {
    return { error: `Prefix "${trimmed}" is already used by another custom provider` };
  }

  return null;
}

