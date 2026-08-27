import { NextResponse } from "next/server";
import { AI_PROVIDERS } from "@/shared/constants/providers";
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";
import { resolveConnectionProxyConfig } from "@/lib/network/connectionProxy";
import { getProviderConnections } from "@/models";

// GET /api/providers/[id]/json-models
// Fetch the model catalog for a provider from a user-maintained GitHub JSON
// (declared as `modelsJsonUrl` in the provider registry). Lets users pull the
// latest model list without waiting for a code release.
//
// JSON format:
//   { "models": [ { "id": "...", "name": "...", "type": "llm",
//                   "vision": true, "reasoning": true,
//                   "contextWindow": 200000, "maxOutput": 48000,
//                   "thinkingFormat": "openai" }, ... ] }
//
// Capability fields (vision/reasoning/contextWindow/maxOutput/thinkingFormat)
// are passed through so the UI can show modality/context info for models that
// aren't in the built-in static catalog.
//
// Only works for providers that declare a `modelsJsonUrl` in their registry entry.
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const provider = AI_PROVIDERS[id];
    const modelsJsonUrl = provider?.modelsJsonUrl;

    if (!modelsJsonUrl) {
      return NextResponse.json({ error: "Provider does not expose a model JSON source" }, { status: 400 });
    }

    // Resolve any proxy the user has configured for this provider's connections.
    const conns = await getProviderConnections({ provider: id, isActive: true });
    const proxyOptions = conns.length
      ? await resolveConnectionProxyConfig(conns[0].providerSpecificData || {})
      : {};

    let response;
    try {
      response = await proxyAwareFetch(
        modelsJsonUrl,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        },
        proxyOptions,
      );
    } catch (e) {
      return NextResponse.json({ error: `Failed to reach model JSON: ${e.message}` }, { status: 502 });
    }

    if (!response.ok) {
      return NextResponse.json({ error: `Model JSON returned HTTP ${response.status}` }, { status: 502 });
    }

    const data = await response.json().catch(() => null);
    if (!data || !Array.isArray(data.models)) {
      return NextResponse.json({ error: "Invalid model JSON: expected { models: [...] }" }, { status: 502 });
    }

    // Normalize entries and drop invalid ones. Preserve optional capability
    // fields (coerce to the expected types) so the client can display them.
    const models = data.models
      .filter((m) => m && typeof m === "object" && typeof m.id === "string" && m.id.trim() !== "")
      .map((m) => {
        const out = {
          id: m.id.trim(),
          name: (typeof m.name === "string" && m.name.trim()) ? m.name.trim() : m.id.trim(),
          type: (typeof m.type === "string" && m.type.trim()) ? m.type.trim() : "llm",
        };
        if (typeof m.vision === "boolean") out.vision = m.vision;
        if (typeof m.reasoning === "boolean") out.reasoning = m.reasoning;
        if (typeof m.contextWindow === "number" && Number.isFinite(m.contextWindow)) out.contextWindow = m.contextWindow;
        if (typeof m.maxOutput === "number" && Number.isFinite(m.maxOutput)) out.maxOutput = m.maxOutput;
        if (typeof m.thinkingFormat === "string" && m.thinkingFormat.trim()) out.thinkingFormat = m.thinkingFormat.trim();
        return out;
      });

    return NextResponse.json({ models, source: modelsJsonUrl });
  } catch (error) {
    console.log("Error fetching provider model JSON:", error);
    return NextResponse.json({ error: "Failed to fetch provider model JSON" }, { status: 500 });
  }
}
