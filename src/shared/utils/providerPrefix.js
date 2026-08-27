import { AI_PROVIDERS } from "@/shared/constants/providers";

/**
 * Collect every identifier (id and alias) of the built-in provider registry,
 * plus the local alias overrides. A custom-provider node prefix must not collide
 * with any of these, or model routing would resolve to the built-in provider
 * instead of the user's custom node.
 */
export function getReservedProviderPrefixes() {
  const reserved = new Set();
  for (const p of Object.values(AI_PROVIDERS)) {
    if (!p) continue;
    if (p.id) reserved.add(p.id);
    if (p.alias) reserved.add(p.alias);
  }
  // Local provider alias overrides (see src/sse/services/model.js).
  reserved.add("xmtp");
  reserved.add("xiaomi-tokenplan");
  return reserved;
}

/**
 * Check whether a candidate prefix is usable for a custom provider node.
 *
 * @param {string} prefix        - The user-supplied prefix (trimmed).
 * @param {Array}  existingNodes - All provider nodes (from getProviderNodes()).
 * @param {string} [excludeNodeId] - Node id to ignore (for PUT, i.e. the node being edited).
 * @returns {{ error: string } | null} null when the prefix is usable, else a 400 error body.
 */
export function checkPrefixConflict(prefix, existingNodes, excludeNodeId = null) {
  const trimmed = (prefix || "").trim();
  if (!trimmed) return { error: "Prefix is required" };

  // Must not collide with a built-in provider id/alias.
  const reserved = getReservedProviderPrefixes();
  if (reserved.has(trimmed)) {
    return { error: `Prefix "${trimmed}" conflicts with a built-in provider` };
  }

  // Must not collide with another custom node's prefix.
  const dup = (existingNodes || []).find(
    (n) => n.id !== excludeNodeId && String(n.prefix || "").trim() === trimmed
  );
  if (dup) {
    return { error: `Prefix "${trimmed}" is already used by another custom provider` };
  }

  return null;
}
