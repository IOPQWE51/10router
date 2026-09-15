// getUsageDashboard compares this instance's own traffic only: rows stamped
// meta.imported = true (9r backups / ZCode sync via importUsageRows) must not
// leak into node/model scores. The daily activity series intentionally keeps
// them — the heatmap reflects all traffic including imports.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;
let tempDir;
let usageRepo;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "10router-dashboard-import-"));
  process.env.DATA_DIR = tempDir;
  vi.resetModules();
  const db = await import("@/lib/db/index.js");
  await db.initDb();
  usageRepo = await import("@/lib/db/repos/usageRepo.js");
});

afterAll(() => {
  // Best-effort: sqlite handles can lag release on Windows, EPERM on rmSync
  // is a cleanup race, not a test failure.
  if (tempDir) { try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {} }
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

const todayIso = () => new Date().toISOString();

const LIVE_ROW = {
  timestamp: todayIso(),
  provider: "acme",
  model: "acme-1",
  connectionId: "conn-live",
  status: "ok",
  tokens: { prompt_tokens: 100, completion_tokens: 50 },
};

const IMPORTED_ROW = {
  timestamp: todayIso(),
  provider: "acme",
  model: "acme-1",
  connectionId: "conn-live",
  apiKey: null,
  endpoint: "zcode://zcode-agent",
  promptTokens: 9000,
  completionTokens: 900,
  cost: 0,
  status: "ok",
  tokens: { prompt_tokens: 9000, completion_tokens: 900 },
  meta: {},
};

describe("getUsageDashboard imported-row handling", () => {
  it("imported row is excluded from scores but counted in daily", async () => {
    await usageRepo.saveRequestUsage({ ...LIVE_ROW });
    const { imported } = await usageRepo.importUsageRows([{ ...IMPORTED_ROW }]);
    expect(imported).toBe(1);

    const dash = await usageRepo.getUsageDashboard({ days: 30, minRequests: 1 });

    const node = dash.nodes.find((n) => n.provider === "acme");
    expect(node).toBeTruthy();
    expect(node.requests).toBe(1);
    expect(node.promptTokens).toBe(100);

    const model = dash.models.find((m) => m.provider === "acme" && m.model === "acme-1");
    expect(model).toBeTruthy();
    expect(model.requests).toBe(1);

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const localDayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const day = dash.daily.find((d) => d.date === localDayKey);
    expect(day).toBeTruthy();
    expect(day.requests).toBe(2);
    expect(day.tokens).toBe(150 + 9900);

    expect(dash.lifetime.totalTokens).toBeGreaterThan(0);
    expect(dash.lifetime.peakTokens).toBeGreaterThan(0);
    expect(dash.lifetime.currentStreak).toBeGreaterThanOrEqual(1);
    expect(dash.lifetime.longestStreak).toBeGreaterThanOrEqual(1);
  });

  it("imported-only provider disappears from scores but stays in daily", async () => {
    const { imported } = await usageRepo.importUsageRows([{
      ...IMPORTED_ROW,
      provider: "ghost",
      model: "ghost-1",
      connectionId: null,
      timestamp: "2026-09-01T10:00:00.000Z",
    }]);
    expect(imported).toBe(1);

    const dash = await usageRepo.getUsageDashboard({ days: 30, minRequests: 1 });
    expect(dash.nodes.find((n) => n.provider === "ghost")).toBeUndefined();
    expect(dash.models.find((m) => m.provider === "ghost")).toBeUndefined();

    const day = dash.daily.find((d) => d.date === "2026-09-01");
    expect(day).toBeTruthy();
    expect(day.requests).toBe(1);
  });

  it("range params are ignored: nodes use a fixed 7d window, daily is unaffected", async () => {
    await usageRepo.saveRequestUsage({
      ...LIVE_ROW,
      provider: "oldco",
      model: "old-1",
      connectionId: "conn-old",
      timestamp: "2026-08-01T10:00:00.000Z",
    });

    const pad = (n) => String(n).padStart(2, "0");
    const localKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const startKey = localKey(start);
    const endKey = localKey(end);

    const dash = await usageRepo.getUsageDashboard({ start: startKey, end: endKey, minRequests: 1 });
    // Node health is a fixed trailing-7d window regardless of range params:
    // the old row is outside 7d, today's acme row is inside.
    expect(dash.nodes.find((n) => n.provider === "oldco")).toBeUndefined();
    expect(dash.nodes.find((n) => n.provider === "acme")).toBeTruthy();
    // The heatmap series covers the trailing 12 months either way.
    expect(dash.daily.find((d) => d.date === "2026-08-01")).toBeTruthy();
  });

  it("default threshold excludes nodes/models under 100 requests from scoring", async () => {
    const dash = await usageRepo.getUsageDashboard({ days: 30 });
    // acme has exactly 1 live request — far below the default 100 threshold.
    expect(dash.nodes.find((n) => n.provider === "acme")).toBeUndefined();
    expect(dash.models.find((m) => m.provider === "acme")).toBeUndefined();
    // The daily series has no request threshold.
    expect(dash.daily.length).toBeGreaterThan(0);
  });

  it("cacheHitRate strictly excludes requests with no cache or prompt == cached", async () => {
    // 1. Request with no cache (cached = 0) -> should be excluded
    await usageRepo.saveRequestUsage({
      ...LIVE_ROW,
      tokens: { prompt_tokens: 500, completion_tokens: 50, cached_tokens: 0 },
    });
    // 2. Request with input = cache (prompt == cached) -> should be excluded
    await usageRepo.saveRequestUsage({
      ...LIVE_ROW,
      tokens: { prompt_tokens: 300, completion_tokens: 20, cached_tokens: 300 },
    });
    // 3. Request with valid real cache (prompt = 1000, cached = 750) -> should be counted (75.0%)
    await usageRepo.saveRequestUsage({
      ...LIVE_ROW,
      tokens: { prompt_tokens: 1000, completion_tokens: 100, cached_tokens: 750 },
    });

    const dash = await usageRepo.getUsageDashboard({ days: 30, minRequests: 1 });
    expect(dash.lifetime.cacheHitRate).toBe(75);
    expect(dash.lifetime.cacheTokens).toBe(750);
    expect(dash.lifetime.cacheRequests).toBe(1);
  });

  it("avgSpeed computes correctly for streaming and non-streaming requests", async () => {
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();

    const insertDetail = (id, latency, tokens) => {
      const record = { id, timestamp: todayIso(), provider: "speed-provider", model: "speed-model", latency, tokens };
      db.run(
        `INSERT INTO requestDetails(id, timestamp, provider, model, connectionId, status, data) VALUES(?, ?, ?, ?, ?, ?, ?)`,
        [id, record.timestamp, record.provider, record.model, null, "success", JSON.stringify(record)]
      );
    };

    // 1. Streaming request: ttft=200ms, total=1200ms (duration=1000ms), completion_tokens=50 -> 50 tok/s
    insertDetail("detail-stream", { ttft: 200, total: 1200 }, { prompt_tokens: 10, completion_tokens: 50 });
    // 2. Non-streaming request (or instant stream): ttft=1000ms, total=1000ms (duration=1000ms), completion_tokens=30 -> 30 tok/s
    insertDetail("detail-nonstream", { ttft: 1000, total: 1000 }, { prompt_tokens: 10, completion_tokens: 30 });

    // Add 1 request row in usageHistory so it passes minRequests
    await usageRepo.saveRequestUsage({
      timestamp: todayIso(),
      provider: "speed-provider",
      model: "speed-model",
      status: "ok",
      tokens: { prompt_tokens: 20, completion_tokens: 80 },
    });

    const dash = await usageRepo.getUsageDashboard({ days: 30, minRequests: 1 });
    const node = dash.nodes.find((n) => n.provider === "speed-provider");
    expect(node).toBeTruthy();
    // (50 tok/s + 30 tok/s) / 2 = 40 tok/s
    expect(node.avgSpeed).toBe(40);
  });
});
