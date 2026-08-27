import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function loadProviderModelsJson(provider) {
  const path = join(root, "providers", `${provider}.json`);
  const raw = readFileSync(path, "utf8");
  return { raw, data: JSON.parse(raw) };
}

describe("providers/*.json model catalogs", () => {
  it("codebuddy-cn.json is valid JSON with a models array", () => {
    const { data } = loadProviderModelsJson("codebuddy-cn");
    expect(Array.isArray(data.models)).toBe(true);
    expect(data.models.length).toBeGreaterThan(0);
    for (const m of data.models) {
      expect(typeof m.id).toBe("string");
      expect(m.id.trim().length).toBeGreaterThan(0);
    }
  });

  it("codebuddy-intl.json is valid JSON with a models array", () => {
    const { data } = loadProviderModelsJson("codebuddy-intl");
    expect(Array.isArray(data.models)).toBe(true);
    expect(data.models.length).toBeGreaterThan(0);
  });

  it("every model id is unique within a catalog", () => {
    for (const provider of ["codebuddy-cn", "codebuddy-intl"]) {
      const { data } = loadProviderModelsJson(provider);
      const ids = data.models.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("models carry capability fields (vision/reasoning/contextWindow)", () => {
    const { data } = loadProviderModelsJson("codebuddy-cn");
    for (const m of data.models) {
      // vision is optional (only vision-capable models carry it); reasoning and
      // contextWindow are expected on every entry.
      if ("vision" in m) expect(typeof m.vision).toBe("boolean");
      expect(typeof m.reasoning).toBe("boolean");
      expect(typeof m.contextWindow).toBe("number");
    }
    // At least one vision-capable model exists (e.g. glm-5v-turbo, kimi-*).
    expect(data.models.some((m) => m.vision === true)).toBe(true);
  });
});

describe("provider registry declares modelsJsonUrl", () => {
  it("codebuddy-cn registry points at the GitHub API JSON", async () => {
    const mod = await import("../../open-sse/providers/registry/codebuddy-cn.js");
    const entry = mod.default;
    expect(entry.modelsJsonUrl).toMatch(/api\.github\.com\/repos\/techysy\/10router\/contents\/providers\/codebuddy-cn\.json/);
  });

  it("codebuddy-intl registry points at the GitHub API JSON", async () => {
    const mod = await import("../../open-sse/providers/registry/codebuddy-intl.js");
    const entry = mod.default;
    expect(entry.modelsJsonUrl).toMatch(/api\.github\.com\/repos\/techysy\/10router\/contents\/providers\/codebuddy-intl\.json/);
  });
});
