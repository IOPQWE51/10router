import { NextResponse } from "next/server";
import { AI_PROVIDERS } from "@/shared/constants/providers";
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";
import { resolveConnectionProxyConfig } from "@/lib/network/connectionProxy";
import {
  getProviderConnections,
  getProviderJsonModels,
  setProviderJsonModels,
  updateProviderJsonModelEnabled,
} from "@/models";

// Fetch the raw model catalog from a provider's modelsJsonUrl (a GitHub-hosted
// JSON) using the connection proxy, if any.
async function fetchRawCatalog(id) {
  const provider = AI_PROVIDERS[id];
  const modelsJsonUrl = provider?.modelsJsonUrl;
  if (!modelsJsonUrl) {
    throw Object.assign(new Error("Provider does not expose a model JSON source"), { status: 400 });
  }
  const conns = await getProviderConnections({ provider: id, isActive: true });
  const proxyOptions = conns.length
    ? await resolveConnectionProxyConfig(conns[0].providerSpecificData || {})
    : {};
  let response;
  try {
    response = await proxyAwareFetch(
      modelsJsonUrl,
      { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" },
      proxyOptions,
    );
  } catch (e) {
    throw Object.assign(new Error(`Failed to reach model JSON: ${e.message}`), { status: 502 });
  }
  if (!response.ok) {
    throw Object.assign(new Error(`Model JSON returned HTTP ${response.status}`), { status: 502 });
  }
  const data = await response.json().catch(() => null);
  if (!data || !Array.isArray(data.models)) {
    throw Object.assign(new Error("Invalid model JSON: expected { models: [...] }"), { status: 502 });
  }
  // Normalize entries. Preserve optional capability fields.
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
  return { models, source: modelsJsonUrl };
}

// GET /api/providers/[id]/json-models
// Return the catalog from the JSON source, overlaid with the currently stored
// enabled state (if already imported). Used to preview before importing.
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { models } = await fetchRawCatalog(id);
    const stored = await getProviderJsonModels(id);
    const storedById = new Map((stored || []).map((m) => [m.id, m]));
    for (const m of models) {
      const s = storedById.get(m.id);
      if (s) m.enabled = s.enabled;
    }
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to fetch provider model JSON" }, { status: error.status || 500 });
  }
}

// POST /api/providers/[id]/json-models
// Import the catalog: replace the provider's stored JSON model list. Models that
// were previously enabled stay enabled; brand-new models default to disabled.
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { models } = await fetchRawCatalog(id);
    if (models.length === 0) {
      return NextResponse.json({ error: "No models returned" }, { status: 422 });
    }
    const stored = await getProviderJsonModels(id);
    const previouslyActive = new Set(
      (stored || []).filter((m) => m.enabled !== false).map((m) => m.id)
    );
    for (const m of models) {
      if (!m.enabled && previouslyActive.has(m.id)) m.enabled = true;
      else if (m.enabled === undefined) m.enabled = previouslyActive.has(m.id);
    }
    await setProviderJsonModels(id, models);
    const added = models.filter((m) => previouslyActive.has(m.id)).length;
    return NextResponse.json({ models, added, total: models.length });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to import provider model JSON" }, { status: error.status || 500 });
  }
}

// PUT /api/providers/[id]/json-models  body: { modelId, enabled }
// Toggle one stored JSON model's enabled flag (enable/disable, not delete).
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { modelId, enabled } = body;
    if (!modelId || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "modelId and enabled (boolean) required" }, { status: 400 });
    }
    const changed = await updateProviderJsonModelEnabled(id, modelId, enabled);
    return NextResponse.json({ success: true, changed });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to update provider model JSON" }, { status: error.status || 500 });
  }
}
