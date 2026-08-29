import { NextResponse } from "next/server";
import { AI_PROVIDERS } from "@/shared/constants/providers";
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";
import { resolveConnectionProxyConfig } from "@/lib/network/connectionProxy";
import {
  getProviderConnections,
  getProviderJsonModels,
  setProviderJsonModels,
  updateProviderJsonModelEnabled,
  setAllProviderJsonModelsEnabled,
} from "@/models";

// Parse a catalog from a fetched response body. Supports:
//   - plain JSON            { models: [...] }        (CodeBuddy-style static file)
//   - GitHub Contents API   { content: <base64> }    (api.github.com)
//   - OpenAI list           { data: [{ id, ... }] }  (live provider /v1/models)
function parseCatalogFromRaw(raw) {
  let data = raw;
  if (raw && typeof raw.content === "string" && raw.encoding === "base64") {
    const decoded = Buffer.from(raw.content, "base64").toString("utf8");
    data = JSON.parse(decoded);
  }
  let models;
  if (data && Array.isArray(data.models)) {
    models = data.models;
  } else if (data && Array.isArray(data.data)) {
    // OpenAI-style list — map data[] entries (id/object/owned_by).
    models = data.data.map((m) =>
      typeof m === "string" ? { id: m } : m
    );
  } else {
    throw Object.assign(
      new Error("Invalid model JSON: expected { models: [...] } or { data: [...] }"),
      { status: 502 },
    );
  }
  return models
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
// authToken (optional) is sent as a Bearer Authorization header for
// authenticated endpoints (e.g. a provider's own /v1/models).
async function fetchFromUrl(url, proxyOptions, authToken = null) {
  let response;
  const headers = { Accept: "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  try {
    response = await proxyAwareFetch(
      url,
      { method: "GET", headers, cache: "no-store" },
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

  // Authenticated endpoints (e.g. a provider's own /v1/models) need the
  // account's API key. Public GitHub/Gitee sources do not — only attach the
  // key when the primary source is not one of those public hosts.
  const isPublicSource =
    modelsJsonUrl.startsWith("https://raw.githubusercontent.com") ||
    modelsJsonUrl.startsWith("https://api.github.com") ||
    modelsJsonUrl.startsWith("https://gitee.com");
  const authToken = !isPublicSource && conns[0]?.apiKey ? conns[0].apiKey : null;

  // Try the primary source first.
  try {
    const models = await fetchFromUrl(modelsJsonUrl, proxyOptions, authToken);
    return { models, source: modelsJsonUrl };
  } catch (primaryErr) {
    // Fall back to the mirror (Gitee) if one is declared.
    const fallbackUrl = provider?.fallbackModelsJsonUrl;
    if (fallbackUrl) {
      try {
        const models = await fetchFromUrl(fallbackUrl, proxyOptions, authToken);
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
    const { modelId, enabled, all } = body;
    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled (boolean) required" }, { status: 400 });
    }
    // Bulk flip: { all: true, enabled } toggles every model in the catalog.
    if (all === true) {
      const changed = await setAllProviderJsonModelsEnabled(id, enabled);
      return NextResponse.json({ success: true, changed });
    }
    if (!modelId) {
      return NextResponse.json({ error: "modelId required (or all: true for bulk)" }, { status: 400 });
    }
    const changed = await updateProviderJsonModelEnabled(id, modelId, enabled);
    return NextResponse.json({ success: true, changed });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to update provider model JSON" }, { status: error.status || 500 });
  }
}
