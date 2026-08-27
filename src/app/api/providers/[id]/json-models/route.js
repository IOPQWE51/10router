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

// Parse a catalog from a fetched response body. Supports both plain JSON
// ({ models: [...] }) and GitHub Contents API ({ content: base64 }).
function parseCatalogFromRaw(raw) {
  let data = raw;
  if (raw && typeof raw.content === "string" && raw.encoding === "base64") {
    const decoded = Buffer.from(raw.content, "base64").toString("utf8");
    data = JSON.parse(decoded);
  }
  if (!data || !Array.isArray(data.models)) {
    throw Object.assign(new Error("Invalid model JSON: expected { models: [...] }"), { status: 502 });
  }
  return data.models
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
}

// Fetch and parse the catalog from a single URL. Throws on failure.
async function fetchFromUrl(url, proxyOptions) {
  let response;
  try {
    response = await proxyAwareFetch(
      url,
      { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" },
      proxyOptions,
    );
  } catch (e) {
    throw Object.assign(new Error(`Failed to reach model JSON: ${e.message}`), { status: 502 });
  }
  if (!response.ok) {
    throw Object.assign(new Error(`Model JSON returned HTTP ${response.status}`), { status: 502 });
  }
  const raw = await response.json().catch(() => null);
  if (!raw) {
    throw Object.assign(new Error("Invalid model JSON response"), { status: 502 });
  }
  return parseCatalogFromRaw(raw);
}

// Fetch the raw model catalog for a provider, trying the primary source
// (modelsJsonUrl, e.g. GitHub API) and falling back to the mirror
// (fallbackModelsJsonUrl, e.g. Gitee) when the primary is unreachable.
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

  // Try the primary source first.
  try {
    const models = await fetchFromUrl(modelsJsonUrl, proxyOptions);
    return { models, source: modelsJsonUrl };
  } catch (primaryErr) {
    // Fall back to the mirror (Gitee) if one is declared.
    const fallbackUrl = provider?.fallbackModelsJsonUrl;
    if (fallbackUrl) {
      try {
        const models = await fetchFromUrl(fallbackUrl, proxyOptions);
        return { models, source: fallbackUrl };
      } catch (fallbackErr) {
        throw Object.assign(
          new Error(`Primary source failed (${primaryErr.message}); fallback also failed (${fallbackErr.message})`),
          { status: 502 },
        );
      }
    }
    throw primaryErr;
  }
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
