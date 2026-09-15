// GET /api/providers strips credential VALUES from the payload but keeps
// capability BOOLEANS so connection badges can reflect what a row holds.
// Regression guard: the Xiaomi desktop session cookie (mimoPassToken) lived
// inside providerSpecificData, which rode along wholesale — any dashboard
// consumer could read it in plaintext from the list response. Edit safety
// is preserved because the PUT route ([id]/route.js) merges into existing
// providerSpecificData instead of replacing it, so a roundtrip that no
// longer carries the value cannot wipe the stored token.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;
let tempDir;
let connectionsRepo;
let get;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "10router-providers-route-"));
  process.env.DATA_DIR = tempDir;
  vi.resetModules();
  const db = await import("@/lib/db/index.js");
  await db.initDb();
  connectionsRepo = await import("@/lib/db/repos/connectionsRepo.js");
  ({ GET: get } = await import("@/app/api/providers/route.js"));
});

afterAll(() => {
  if (tempDir) { try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {} }
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

const PASS_TOKEN = "session-cookie-secret-abc123";
const REAL_KEY = "sk-real-key-xyz789";

async function listConnections() {
  const res = await get();
  expect(res.status).toBe(200);
  const body = await res.json();
  return body.connections;
}

describe("GET /api/providers credential stripping", () => {
  it("hides mimoPassToken value but exposes hasDesktopSession", async () => {
    await connectionsRepo.createProviderConnection({
      provider: "xiaomi-mimo",
      name: "MiMo session",
      accessToken: "mimo-desktop-session-123456",
      providerSpecificData: {
        authMethod: "desktop-session",
        mimoPassToken: PASS_TOKEN,
        mimoUserId: "123456",
      },
    });

    const conns = await listConnections();
    const conn = conns.find((c) => c.provider === "xiaomi-mimo");
    expect(conn).toBeTruthy();
    expect(conn.hasDesktopSession).toBe(true);
    expect(conn.hasAccessToken).toBe(false); // placeholder is not a key
    expect(conn.accessToken).toBeUndefined();
    // The secret itself must never travel in the response.
    expect(conn.providerSpecificData?.mimoPassToken).toBeUndefined();
    expect(JSON.stringify(conn)).not.toContain(PASS_TOKEN);
    // Non-sensitive specific data still reaches the UI.
    expect(conn.providerSpecificData?.mimoUserId).toBe("123456");
  });

  it("dual-credential row reports both booleans without leaking either secret", async () => {
    await connectionsRepo.createProviderConnection({
      provider: "xiaomi-mimo",
      name: "MiMo dual",
      accessToken: REAL_KEY,
      apiKey: "api-key-secret-000",
      providerSpecificData: {
        authMethod: "oauth",
        mimoPassToken: PASS_TOKEN,
      },
    });

    const conns = await listConnections();
    const conn = conns.find((c) => c.name === "MiMo dual");
    expect(conn.hasAccessToken).toBe(true);
    expect(conn.hasDesktopSession).toBe(true);
    expect(conn.providerSpecificData?.mimoPassToken).toBeUndefined();
    const dump = JSON.stringify(conn);
    expect(dump).not.toContain(REAL_KEY);
    expect(dump).not.toContain("api-key-secret-000");
    expect(dump).not.toContain(PASS_TOKEN);
  });
});
