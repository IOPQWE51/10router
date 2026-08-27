import { beforeEach, describe, expect, it, vi } from "vitest";

// modelJsonImport reads/writes localStorage — mock it.
const store = vi.hoisted(() => {
  const map = new Map();
  return {
    getItem: vi.fn((k) => (map.has(k) ? map.get(k) : null)),
    setItem: vi.fn((k, v) => map.set(k, String(v))),
    _reset: () => map.clear(),
  };
});

beforeEach(() => {
  store._reset();
  global.localStorage = store;
});

describe("modelJsonImport global toggle", () => {
  it("is disabled by default (opt-in)", async () => {
    const { isModelJsonImportEnabled } = await import("../../src/shared/utils/modelJsonImport.js");
    expect(isModelJsonImportEnabled()).toBe(false);
  });

  it("enables after setModelJsonImportEnabled(true)", async () => {
    const { isModelJsonImportEnabled, setModelJsonImportEnabled } = await import("../../src/shared/utils/modelJsonImport.js");
    setModelJsonImportEnabled(true);
    expect(isModelJsonImportEnabled()).toBe(true);
  });

  it("disables after setModelJsonImportEnabled(false)", async () => {
    const { isModelJsonImportEnabled, setModelJsonImportEnabled } = await import("../../src/shared/utils/modelJsonImport.js");
    setModelJsonImportEnabled(true);
    setModelJsonImportEnabled(false);
    expect(isModelJsonImportEnabled()).toBe(false);
  });

  it("returns false when localStorage is undefined (SSR)", async () => {
    delete global.localStorage;
    const { isModelJsonImportEnabled } = await import("../../src/shared/utils/modelJsonImport.js");
    expect(isModelJsonImportEnabled()).toBe(false);
  });
});
