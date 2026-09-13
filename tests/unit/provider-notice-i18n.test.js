import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import commandCodeRegistry from "open-sse/providers/registry/commandcode.js";

const rootDir = resolve(__dirname, "../..");

describe("Provider Notice i18n", () => {
  const noticeKey = commandCodeRegistry.display?.notice?.text;

  it("CommandCode registry has a notice text", () => {
    expect(noticeKey).toBeTruthy();
    expect(noticeKey).toContain("Use your CommandCode CLI API key");
  });

  it("zh-CN dictionary contains the CommandCode notice translation", () => {
    const zhCN = JSON.parse(readFileSync(resolve(rootDir, "public/i18n/literals/zh-CN.json"), "utf8"));
    expect(zhCN[noticeKey]).toBeDefined();
    expect(zhCN[noticeKey]).toContain("使用来自 ~/.commandcode/auth.json");
    expect(zhCN[noticeKey]).toContain("user_");
  });

  it("zh-TW dictionary contains the CommandCode notice translation", () => {
    const zhTW = JSON.parse(readFileSync(resolve(rootDir, "public/i18n/literals/zh-TW.json"), "utf8"));
    expect(zhTW[noticeKey]).toBeDefined();
    expect(zhTW[noticeKey]).toContain("使用來自 ~/.commandcode/auth.json");
    expect(zhTW[noticeKey]).toContain("user_");
  });

  it("Provider detail page pipes notice.text through translate()", () => {
    const pageSource = readFileSync(
      resolve(rootDir, "src/app/(dashboard)/dashboard/providers/[id]/page.js"),
      "utf8",
    );
    expect(pageSource).toContain("{translate(providerInfo.notice.text)}");
    expect(pageSource).toContain('{translate("Get API Key →")}');
  });

  it("Media provider detail page pipes notice.text through translate()", () => {
    const pageSource = readFileSync(
      resolve(rootDir, "src/app/(dashboard)/dashboard/media-providers/[kind]/[id]/page.js"),
      "utf8",
    );
    expect(pageSource).toContain("{translate(provider.notice.text)}");
    expect(pageSource).toContain('{translate("Get API Key →")}');
  });

  it("ProviderInfoCard component pipes noticeText through translate()", () => {
    const cardSource = readFileSync(
      resolve(rootDir, "src/shared/components/ProviderInfoCard.js"),
      "utf8",
    );
    expect(cardSource).toContain("{translate(noticeText)}");
  });
});
