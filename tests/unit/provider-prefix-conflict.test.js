import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  AI_PROVIDERS: {
    openai: { id: "openai", alias: "oa" },
    deepseek: { id: "deepseek", alias: "ds" },
    opencode: { id: "opencode", alias: "oc" },
  },
}));

vi.mock("@/shared/constants/providers", () => ({
  AI_PROVIDERS: mocks.AI_PROVIDERS,
}));

const { checkPrefixConflict, getReservedProviderPrefixes } = await import("../../src/shared/utils/providerPrefix.js");

describe("checkPrefixConflict", () => {
  it("returns null for a fresh, non-colliding prefix", () => {
    expect(checkPrefixConflict("my-api", [])).toBeNull();
  });

  it("rejects a prefix colliding with a built-in provider id", () => {
    const r = checkPrefixConflict("openai", []);
    expect(r).not.toBeNull();
    expect(r.error).toMatch(/conflicts with a built-in provider/);
  });

  it("rejects a prefix colliding with a built-in provider alias", () => {
    const r = checkPrefixConflict("ds", []);
    expect(r).not.toBeNull();
    expect(r.error).toMatch(/conflicts with a built-in provider/);
  });

  it("rejects a prefix used by another existing node", () => {
    const nodes = [
      { id: "node-1", prefix: "dup" },
      { id: "node-2", prefix: "other" },
    ];
    const r = checkPrefixConflict("dup", nodes);
    expect(r).not.toBeNull();
    expect(r.error).toMatch(/already used by another custom provider/);
  });

  it("allows a prefix when it only matches the node being edited (excludeNodeId)", () => {
    const nodes = [
      { id: "node-1", prefix: "myapi" },
      { id: "node-2", prefix: "other" },
    ];
    expect(checkPrefixConflict("myapi", nodes, "node-1")).toBeNull();
  });

  it("treats whitespace-colliding prefixes as duplicates", () => {
    const nodes = [{ id: "node-1", prefix: "  myapi  " }];
    expect(checkPrefixConflict("myapi", nodes)).not.toBeNull();
  });
});
