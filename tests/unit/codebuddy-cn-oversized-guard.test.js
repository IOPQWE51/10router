import { describe, it, expect } from "vitest";
import { isOversizedForCbcn, CBCN_PAYLOAD_LIMITS } from "../../open-sse/executors/codebuddy-cn.js";
import { buildErrorBody, unavailableResponse } from "../../open-sse/utils/error.js";

describe("CodeBuddy CN oversized payload pre-check", () => {
  it("detects payload with too many messages", () => {
    const normal = { messages: Array.from({ length: 100 }, () => ({ role: "user", content: "hi" })) };
    expect(isOversizedForCbcn(normal)).toBe(false);

    const oversized = { messages: Array.from({ length: CBCN_PAYLOAD_LIMITS.maxMessages + 10 }, () => ({ role: "user", content: "hi" })) };
    expect(isOversizedForCbcn(oversized)).toBe(true);
  });

  it("detects payload with too many tools", () => {
    const normal = { tools: Array.from({ length: 20 }, (_, i) => ({ type: "function", function: { name: `tool_${i}` } })) };
    expect(isOversizedForCbcn(normal)).toBe(false);

    const oversized = { tools: Array.from({ length: CBCN_PAYLOAD_LIMITS.maxTools + 5 }, (_, i) => ({ type: "function", function: { name: `tool_${i}` } })) };
    expect(isOversizedForCbcn(oversized)).toBe(true);
  });

  it("detects payload exceeding byte size threshold", () => {
    const bigContent = "a".repeat(3.5 * 1024 * 1024);
    const oversized = { messages: [{ role: "user", content: bigContent }] };
    expect(isOversizedForCbcn(oversized)).toBe(true);
  });

  it("handles null or non-object body safely", () => {
    expect(isOversizedForCbcn(null)).toBe(false);
    expect(isOversizedForCbcn(undefined)).toBe(false);
    expect(isOversizedForCbcn("string")).toBe(false);
  });
});

describe("Error body shape compatibility", () => {
  it("buildErrorBody includes top-level type: error for Claude / Anthropic client compatibility", () => {
    const body = buildErrorBody(400, "test bad request");
    expect(body.type).toBe("error");
    expect(body.error).toBeDefined();
    expect(body.error.message).toBe("test bad request");
  });

  it("unavailableResponse includes top-level type: error", async () => {
    const res = unavailableResponse(503, "channel blocked", new Date(Date.now() + 60000).toISOString(), "reset after 60s");
    const json = await res.json();
    expect(json.type).toBe("error");
    expect(json.error.message).toContain("channel blocked");
  });
});
