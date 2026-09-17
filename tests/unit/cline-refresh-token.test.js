/**
 * Cline / ClinePass background token refresh (issue #21).
 *
 * Upstream POST https://api.cline.bot/api/v1/auth/refresh requires a JSON body
 * with camelCase fields (refreshToken + grantType); the generic OAuth2
 * form-encoded path answered 400 "Validation failed" (refreshtoken/granttype
 * required) on every proactive refresh, so cline credentials died at expiry.
 * These tests lock the dedicated handler's request shape, response
 * normalization, and REFRESH_HANDLERS dispatch routing for both provider ids.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalFetch = global.fetch;

function mockFetch(payload, { ok = true, status = 200 } = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(payload),
    text: () => Promise.resolve(typeof payload === "string" ? payload : JSON.stringify(payload)),
  });
  global.fetch = fn;
  return fn;
}

describe("Cline token refresh (issue #21)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    global.fetch = originalFetch;
  });
  afterEach(() => { global.fetch = originalFetch; });

  describe("refreshClineToken request shape", () => {
    it("sends camelCase JSON (refreshToken + grantType) to the refresh endpoint", async () => {
      const fetchMock = mockFetch({
        success: true,
        data: {
          accessToken: "cl-new",
          refreshToken: "cl-rotated",
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        },
      });
      const { refreshClineToken } = await import("open-sse/services/tokenRefresh/providers.js");

      const result = await refreshClineToken("cline", "cl-old", null);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.cline.bot/api/v1/auth/refresh");
      expect(init.method).toBe("POST");
      expect(init.headers["Content-Type"]).toBe("application/json");
      // Regression guard for the 400: body must be camelCase JSON, never the
      // snake_case form fields the generic path used to send.
      const body = JSON.parse(init.body);
      expect(body.refreshToken).toBe("cl-old");
      expect(body.grantType).toBe("refresh_token");
      expect(body).not.toHaveProperty("refresh_token");
      expect(body).not.toHaveProperty("grant_type");

      expect(result.accessToken).toBe("cl-new");
      expect(result.refreshToken).toBe("cl-rotated");
      // ISO expiresAt is normalized to a relative expiresIn (Trae convention).
      expect(result.expiresIn).toBeGreaterThan(3500);
      expect(result.expiresIn).toBeLessThanOrEqual(3600);
    });

    it("keeps the old refresh token when upstream rotates nothing", async () => {
      mockFetch({ data: { accessToken: "acc-only", expiresAt: new Date(Date.now() + 1800_000).toISOString() } });
      const { refreshClineToken } = await import("open-sse/services/tokenRefresh/providers.js");
      const result = await refreshClineToken("cline", "keep-me", null);
      expect(result.refreshToken).toBe("keep-me");
      expect(result.accessToken).toBe("acc-only");
    });

    it("returns null on non-ok response (the 400 validation path)", async () => {
      mockFetch({ error: "Validation failed" }, { ok: false, status: 400 });
      const { refreshClineToken } = await import("open-sse/services/tokenRefresh/providers.js");
      expect(await refreshClineToken("cline", "bad-token", null)).toBeNull();
    });

    it("returns null when the response carries no accessToken", async () => {
      mockFetch({ success: true, data: { refreshToken: "only-refresh" } });
      const { refreshClineToken } = await import("open-sse/services/tokenRefresh/providers.js");
      expect(await refreshClineToken("cline", "t", null)).toBeNull();
    });

    it("returns null without a refresh token and never calls upstream", async () => {
      const fetchMock = mockFetch({});
      const { refreshClineToken } = await import("open-sse/services/tokenRefresh/providers.js");
      expect(await refreshClineToken("cline", "", null)).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("clinepass resolves the shared refresh endpoint from its own oauth config", async () => {
      const fetchMock = mockFetch({ data: { accessToken: "cp-acc", expiresAt: new Date(Date.now() + 3600_000).toISOString() } });
      const { refreshClineToken } = await import("open-sse/services/tokenRefresh/providers.js");
      const result = await refreshClineToken("clinepass", "cp-old", null);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.cline.bot/api/v1/auth/refresh");
      expect(JSON.parse(init.body).refreshToken).toBe("cp-old");
      expect(result.accessToken).toBe("cp-acc");
    });
  });

  describe("dispatch routing (REFRESH_HANDLERS)", () => {
    it.each(["cline", "clinepass"])(
      "refreshTokenByProvider('%s') routes to the camelCase handler, not the generic form path",
      async (provider) => {
        const fetchMock = mockFetch({
          data: { accessToken: "dsp-acc", expiresAt: new Date(Date.now() + 3600_000).toISOString() },
        });
        const { refreshTokenByProvider } = await import("open-sse/services/tokenRefresh.js");

        const result = await refreshTokenByProvider(provider, { refreshToken: `dsp-${provider}` }, null);

        expect(result?.accessToken).toBe("dsp-acc");
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("https://api.cline.bot/api/v1/auth/refresh");
        const parsed = JSON.parse(init.body);
        expect(parsed.grantType).toBe("refresh_token");
        expect(parsed.refreshToken).toBe(`dsp-${provider}`);
      }
    );

    it("mergeRefreshedCredentials persists handler output with computed expiresAt", async () => {
      const { mergeRefreshedCredentials } = await import("open-sse/services/oauthCredentialManager.js");
      const merged = mergeRefreshedCredentials(
        "cline",
        { refreshToken: "old-rt" },
        { accessToken: "new-at", refreshToken: "new-rt", expiresIn: 3600 }
      );
      expect(merged.accessToken).toBe("new-at");
      expect(merged.refreshToken).toBe("new-rt");
      expect(new Date(merged.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
  });
});
