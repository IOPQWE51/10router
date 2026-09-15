---
name: zcode-usage-sync
description: Export ZCode, OpenCode, mirasim or Xiaomi MiMo's local model-usage ledger into 10Router via /api/settings/database/import-usage. Use when the user asks to 导出/同步/导入 ZCode/OpenCode/mirasim/小米MiMo 使用量到 10Router, sync zcode/mimo usage, export usage to 10router, or asks how much they used ZCode/mirasim/MiMo and wants it recorded in 10Router stats. OpenCode via --source opencode, mirasim via --source mirasim, Xiaomi MiMo via --source mimo.
---

# Usage Sync → 10Router

Export this machine's ZCode **or OpenCode** **or mirasim** **or Xiaomi MiMo** model-usage ledger into 10Router's usage statistics.

## Preconditions (check before running)

1. **10Router endpoint** — default `http://127.0.0.1:20127`. If the user runs 10Router elsewhere (NAS, LAN), ask or infer from context. For a NAS/remote instance use its address, e.g. `http://192.168.31.101:20127`. *(Online modes only — `--export` needs neither endpoint nor credentials.)*
2. **Source** — `--source zcode` (default), `--source opencode` (opencode.ai desktop app), `--source mirasim` (mirasim desktop insights ledger), or `--source mimo` (Xiaomi MiMo desktop / mimocode). None but zcode is auto-detected — pass the flag explicitly.
3. **Credential (one of)** —
   - Virtual key (recommended): created in 10Router dashboard → API Keys, format `sk-…`. Pass via `--key`.
   - Dashboard password: pass via `--password`.
   - The script also reads env vars `TENROUTER_ENDPOINT` / `TENROUTER_KEY` / `TENROUTER_PASSWORD`.
4. Never ask the user to paste credentials into chat if they already configured them; prefer env/config over interactive prompts.

## Run

**Choose the mode first**: if this machine can reach the 10Router endpoint (same
LAN / localhost / tunnel), sync online. If it **cannot** (different network, no
route to the instance), export offline instead — write a JSON file here, the
user carries it to any machine that can reach 10Router, and imports there.

### Online (direct)

Dry-run first (shows row counts per provider, imports nothing):

```bash
node "$ZCODE_PLUGIN_ROOT/scripts/export-usage.mjs" --endpoint <URL> --key <sk-…> --dry-run
```

Then import:

```bash
node "$ZCODE_PLUGIN_ROOT/scripts/export-usage.mjs" --endpoint <URL> --key <sk-…>
```

### OpenCode (opencode.ai desktop)

OpenCode stores usage in `~/.local/share/opencode/opencode.db` (Linux/macOS)
or `%LOCALAPPDATA%\opencode\opencode.db` (Windows). Use `--source opencode`:

```bash
# Offline export
node "$ZCODE_PLUGIN_ROOT/scripts/export-usage.mjs" --source opencode --export opencode-usage.json

# Online dry-run
node "$ZCODE_PLUGIN_ROOT/scripts/export-usage.mjs" --source opencode --endpoint <URL> --key <sk-…> --dry-run

# Online import
node "$ZCODE_PLUGIN_ROOT/scripts/export-usage.mjs" --source opencode --endpoint <URL> --key <sk-…>
```

### mirasim desktop

mirasim stores per-call usage in `~/.mirasim/insights/usage-YYYY-MM.ndjson` with full
token metering (input/output/cacheRead/cacheWrite/reasoning). Use `--source mirasim`:

```bash
# Offline export
node "$ZCODE_PLUGIN_ROOT/scripts/export-usage.mjs" --source mirasim --export mirasim-usage.json

# Online dry-run
node "$ZCODE_PLUGIN_ROOT/scripts/export-usage.mjs" --source mirasim --endpoint <URL> --key <sk-…> --dry-run

# Online import
node "$ZCODE_PLUGIN_ROOT/scripts/export-usage.mjs" --source mirasim --endpoint <URL> --key <sk-…>
```

Rows land under provider `mirasim-<protocol>` (mirasim-anthropic / mirasim-openai-responses /
mirasim-openai-chat), cost 0 (plan-based relay). Failed calls without token consumption are
skipped automatically; agent/leg/upstreamHost/effort/repo/workspace details ride in `meta`.

### Xiaomi MiMo desktop (mimocode)

Xiaomi MiMo desktop stores per-message usage in `~/.local/share/mimocode/mimocode.db`
(`message` table, JSON `data` column: assistant messages carry
input/output/reasoning/cache.read/cache.write plus modelID/providerID/agent/mode).
Use `--source mimo` (alias `--source mimocode`):

```bash
# Offline export
node "$ZCODE_PLUGIN_ROOT/scripts/export-usage.mjs" --source mimo --export mimo-usage.json

# Online dry-run
node "$ZCODE_PLUGIN_ROOT/scripts/export-usage.mjs" --source mimo --endpoint <URL> --key <sk-…> --dry-run

# Online import
node "$ZCODE_PLUGIN_ROOT/scripts/export-usage.mjs" --source mimo --endpoint <URL> --key <sk-…>
```

Rows land under provider `mimo-<providerID>` (mimo-xiaomi / mimo-mimo), cost 0 (plan-based);
0-token (empty/aborted) turns are skipped automatically; message/session/agent/mode details
ride in `meta`.

### Offline (export JSON, import elsewhere)

On the ZCode machine (no network, no credentials needed):

```bash
node "$ZCODE_PLUGIN_ROOT/scripts/export-usage.mjs" --export zcode-usage.json
```

The user carries `zcode-usage.json` to a machine that can reach 10Router, then:

```bash
node "$ZCODE_PLUGIN_ROOT/scripts/export-usage.mjs" --import zcode-usage.json --endpoint <URL> --key <sk-…>
```

The file is also loadable directly from the 10Router dashboard (Settings →
database backup section → JSON usage import).

Notes:
- The script is **idempotent**: 10Router dedups by row signature, so re-running never duplicates rows.
- **zcode source exports OFFICIAL channels only** (`builtin:*` — bigmodel / zai / …). Non-builtin
  providers are user-added custom providers; in this setup they all point at local gateways whose
  traffic is already counted by 10Router itself or another sync source, so exporting them would
  double-count. The skip is structural (immune to provider delete+re-add changing the id) and
  prints per-provider counts. `--include-custom` restores the old behavior when needed.
- Each row becomes provider `zcode-<name>` in 10Router, cost 0 (subscription plans), with agent/session metadata under `meta`.
- `--limit N` exports only the newest N rows; `--quiet` suppresses progress output.

## After running

Report the result line (`imported X, skipped Y`) and remind the user the numbers appear on the 10Router dashboard (Usage section) under the `zcode-*` / `opencode-*` / `mirasim-*` / `mimo-*` providers.

## Troubleshooting

- `HTTP 401 Invalid password` → key revoked or wrong password; create a new virtual key in the dashboard.
- `HTTP 401 Unauthorized` (error text "Unauthorized") → request was blocked by the global guard before reaching the route; means neither key nor password header reached it — check the script's auth flags.
- `connection refused` → wrong endpoint or 10Router not running.
- `no ZCode db.sqlite found` → ZCode has never recorded usage on this machine.

## Repairing a 10Router usage database (wrongly imported rows)

If previously-imported rows are wrong (e.g. gateway traffic that was double-counted),
remove them with the bundled tools — **never DELETE by hand**: `usageDaily` day buckets
are maintained incrementally and nothing rebuilds them from `usageHistory`, so a raw
delete leaves the dashboard reporting phantom numbers. A hand-written rebuild is worse:
buckets are keyed by the **server's LOCAL date** (not the UTC date part) and carry **five**
aggregation dimensions (byProvider/byModel/byAccount/byApiKey/byEndpoint) — missing either
detail silently corrupts the numbers.

```bash
# read-only health check (safe anytime): integrity + usageDaily↔usageHistory fidelity + counter
node "$ZCODE_PLUGIN_ROOT/scripts/verify-usage-db.mjs" /path/to/data.sqlite

# dry report, optionally backing up the rows about to be removed
node "$ZCODE_PLUGIN_ROOT/scripts/clean-usage-db.mjs" /path/to/data.sqlite --provider zcode-xxxx --export removed.json

# perform the surgery (self-verifies; exits 1 and tells you to roll back if it fails)
node "$ZCODE_PLUGIN_ROOT/scripts/clean-usage-db.mjs" /path/to/data.sqlite --provider zcode-xxxx --apply

# re-check
node "$ZCODE_PLUGIN_ROOT/scripts/verify-usage-db.mjs" /path/to/data.sqlite
```

**Stop the 10Router service first** (or operate on a copy) — the app holds the database open
and concurrent writers corrupt it. `--where "<sql predicate>"` is available for filters other
than a single provider. Node 22 needs `--experimental-sqlite`; Node 24+ does not.
