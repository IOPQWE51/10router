// Provider category audit: free-beta platforms must sit in the Free Tier
// section (category "freeTier"), paid platforms in the API-key section.
// Category drives UI grouping via byCategory() in src/shared/constants/providers.js.
import { describe, it, expect } from "vitest";

import {
  APIKEY_PROVIDERS,
  FREE_TIER_PROVIDERS,
} from "@/shared/constants/providers.js";

describe("provider categories", () => {
  it("groups free public-beta providers under freeTier", () => {
    expect(FREE_TIER_PROVIDERS.dots).toBeTruthy();
    expect(FREE_TIER_PROVIDERS.sensenova).toBeTruthy();
    expect(APIKEY_PROVIDERS.dots).toBeUndefined();
    expect(APIKEY_PROVIDERS.sensenova).toBeUndefined();
  });

  it("keeps paid platforms under apikey", () => {
    expect(APIKEY_PROVIDERS.longcat).toBeTruthy();
    expect(APIKEY_PROVIDERS.bai).toBeTruthy();
    expect(FREE_TIER_PROVIDERS.longcat).toBeUndefined();
    expect(FREE_TIER_PROVIDERS.bai).toBeUndefined();
  });

  it("free-beta entries declare apikey-only auth (no oauth on the card)", () => {
    for (const id of ["dots", "sensenova"]) {
      expect(FREE_TIER_PROVIDERS[id].authType).toBe("apikey");
      expect(FREE_TIER_PROVIDERS[id].authModes).toEqual(["apikey"]);
      // Key acquisition link must survive the category move.
      expect(FREE_TIER_PROVIDERS[id].notice?.apiKeyUrl).toBeTruthy();
    }
  });
});
