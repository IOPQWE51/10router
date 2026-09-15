import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(__dirname, "../..");

// Exact upstream payload from a real Antigravity 429 (5h individual quota exhausted).
const REAL_429_ERROR = `[429]: { "error": { "code": 429, "message": "Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 1h27m36s.", "status": "RESOURCE_EXHAUSTED", "details": [ { "@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": "QUOTA_EXHAUSTED", "domain": "cloudcode-pa.googleapis.com", "metadata": { "uiMessage": "true", "model": "gemini-3.8-flash-high", "quotaResetDelay": "1h27m36.139434956s", "quotaResetTimeStamp": "2026-09-15T12:52:06Z" } }, { "@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "5256.139434956s" } ] } }`;

describe("Antigravity quota exhausted error i18n", () => {
  const zhCN = JSON.parse(readFileSync(resolve(rootDir, "public/i18n/literals/zh-CN.json"), "utf8"));
  const zhTW = JSON.parse(readFileSync(resolve(rootDir, "public/i18n/literals/zh-TW.json"), "utf8"));

  it("zh-CN dictionary contains the quota reset template and duration units", () => {
    expect(zhCN["Individual quota reached. Resets at {time} (in {duration})."]).toContain("该账号额度已用完");
    expect(zhCN["{n}h"]).toBe("{n}小时");
    expect(zhCN["{n}m"]).toBe("{n}分");
    expect(zhCN["{n}s"]).toBe("{n}秒");
  });

  it("zh-TW dictionary contains the quota reset template and duration units", () => {
    expect(zhTW["Individual quota reached. Resets at {time} (in {duration})."]).toContain("該帳號額度已用完");
    expect(zhTW["{n}h"]).toBe("{n}小時");
    expect(zhTW["{n}m"]).toBe("{n}分");
    expect(zhTW["{n}s"]).toBe("{n}秒");
  });

  it("parseQuotaDurationParts parses Google-style duration strings", async () => {
    const { parseQuotaDurationParts } = await import("@/shared/utils/quotaError.js");
    expect(parseQuotaDurationParts("1h27m36.139434956s")).toEqual({ h: 1, m: 27, s: 36 });
    expect(parseQuotaDurationParts("5256.139434956s")).toEqual({ h: 0, m: 0, s: 5256 });
    expect(parseQuotaDurationParts("2m")).toEqual({ h: 0, m: 2, s: 0 });
    expect(parseQuotaDurationParts("garbage")).toBeNull();
  });

  it("formatQuotaDuration renders localized segments with fallback units", async () => {
    const { formatQuotaDuration, parseQuotaDurationParts } = await import("@/shared/utils/quotaError.js");
    // Empty dictionary in test env -> "{n}h" style fallback ("1h 27m 36s").
    const out = formatQuotaDuration(parseQuotaDurationParts("1h27m36.139434956s"));
    expect(out).toContain("1h");
    expect(out).toContain("27m");
    expect(out).toContain("36s");
    // 5256s rolls up to 1h 27m.
    const rolled = formatQuotaDuration(parseQuotaDurationParts("5256.139434956s"));
    expect(rolled).toContain("1h");
    expect(rolled).toContain("27m");
  });

  it("extractQuotaResetInfo pulls delay and timestamp from the real 429 payload", async () => {
    const { extractQuotaResetInfo } = await import("@/shared/utils/quotaError.js");
    const info = extractQuotaResetInfo(REAL_429_ERROR);
    expect(info.delay).toBe("1h27m36.139434956s");
    expect(info.timestamp).toBe("2026-09-15T12:52:06Z");
  });

  it("translateQuotaError produces a friendly template message for the real 429 payload", async () => {
    const { translateQuotaError } = await import("@/shared/utils/quotaError.js");
    const out = translateQuotaError(REAL_429_ERROR);
    // Dictionary is empty in tests, so the English template is kept with values substituted.
    expect(out).toContain("Resets at");
    expect(out).toMatch(/Resets at .+ \(in 1h 27m 36s\)/);
    expect(out).not.toContain("{time}");
    expect(out).not.toContain("{duration}");
  });

  it("translateQuotaError leaves unrelated errors untouched", async () => {
    const { translateQuotaError } = await import("@/shared/utils/quotaError.js");
    const plain = "Some totally unrelated error";
    expect(translateQuotaError(plain)).toBe(plain);
  });

  it("provider detail page and ConnectionRow route errors through translateQuotaError", () => {
    const pageSrc = readFileSync(resolve(rootDir, "src/app/(dashboard)/dashboard/providers/[id]/page.js"), "utf8");
    expect(pageSrc).toContain("translateQuotaError(error)");
    const rowSrc = readFileSync(resolve(rootDir, "src/app/(dashboard)/dashboard/providers/[id]/ConnectionRow.js"), "utf8");
    expect(rowSrc).toContain("translateQuotaError(connection.lastError)");
  });
});

describe("quota error - truncated legacy payload fallback", () => {
  // NOTE: in the vitest environment translate() has no dictionary loaded, so the
  // template comes back in English. Assert on STRUCTURE (placeholders filled /
  // not left empty), which holds in every locale.
  it("never renders empty placeholders when reset fields were cut off", async () => {
    const { translateQuotaError } = await import("@/shared/utils/quotaError.js");
    const truncated =
      '{"error":{"code":429,"message":"Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 1h27m';
    const msg = translateQuotaError(truncated);
    // No "Resets at  (in  )" shell: both slots must carry a value.
    expect(msg).not.toMatch(/Resets at\s+\(in/);
    expect(msg).not.toMatch(/\(in\s*\)/);
    // The neutral fallbacks fill the slots.
    expect(msg).toMatch(/shortly/);
    // Partial duration still parses from the truncated tail ("Resets in 1h27m").
    expect(msg).toMatch(/1h 27m/);
  });

  it("still extracts real values when the payload is complete", async () => {
    const { translateQuotaError } = await import("@/shared/utils/quotaError.js");
    const full =
      '{"error":{"code":429,"message":"Individual quota reached.","details":[{"quotaResetDelay":"1h27m36.139434956s","quotaResetTimeStamp":"2026-09-15T12:52:06Z"}]}}';
    const msg = translateQuotaError(full);
    expect(msg).toMatch(/1h 27m 36s/);
    expect(msg).not.toMatch(/shortly/);
  });
});
