# Changelog

User-facing highlights per release. See [CHANGELOG.md](https://github.com/techysy/10router/blob/main/CHANGELOG.md) for the full developer log.

## v1.0.4 (2026-09-01)

### ✨ New
- **3 new providers**: **TokenBom** (decentralized token marketplace — idle API keys earn credits, credits call many models; 79-model online catalog), **GoRouter** (free gateway, no recharge entry), **TaBiAI** (free gateway, no recharge entry)
- **Usage history import**: import usage data from 9Router backups (SQLite files) — merged into stats without touching config
- **Notification overhaul**: global toasts moved to top-center; browser-native alert() dialogs replaced with friendly notifications
- **Community welfare providers**: GoRouter / TaBiAI are hidden by default with a "community" badge; toggle them on in **Settings → Providers → Show community welfare providers**

### 🐛 Fixes
- **Provider ordering fixed**: connected providers first, disabled sink to bottom — no longer scrambled by priority
- **JSON catalog models invisible after enabling**: stale disable records are now cleared ("enabled but not listed" resolved)
- **B.AI / CodeBuddy CN model catalogs completed**: missing models that caused "not found" when switching are added
- **Friendly maintenance hints on connection tests**: endpoint down / Cloudflare-blocked shows a maintenance note instead of a misleading "Invalid API key"
- **Account filter reminder**: quota-pack account filter persists; an amber reminder bar shows when a non-default filter is active
- **CodeBuddy CN DeepSeek 11150**: DeepSeek-series calls no longer fail with 400 on the reasoning-effort param (auto/off); coding agents (dsh, etc.) work normally
- **CodeBuddy empty tool name (11133 / unknown tool)**: empty `function.name` in streaming tool calls is normalized, so standard clients no longer mis-detect the tool name
- **Topology still shows hidden community providers**: the usage topology now honors the "Show community providers" toggle — community welfare sites (GoRouter/TaBiAI) are hidden when it's off
- **Skills page i18n + Chinese links**: Skills page text is now localized; in Chinese (zh-CN) the links point to the Chinese skill files

## v1.0.3 (2026-08-30)

### ✨ New
- **4 new providers**: **LongCat** (Meituan), **SenseNova** (SenseTime, free beta), **Dots** (Xiaohongshu Dots Studio, free beta), **B.AI** (aggregator — one key for GPT / Claude / Gemini / DeepSeek / GLM / Kimi / Qwen and more)
- **Model JSON catalogs for custom providers**: custom nodes can pull an online model list, toggle models on/off individually, and manage them in bulk
- **fpk update check goes straight to Releases**: fnOS installs jump directly to the matching release download

### 🔒 Security
- **Progressive login rate-limit**: 5 failed password attempts → 30s / 2m / 10m / 30m lockout
- **Reject placeholder JWT keys**: copying the public `.env.example` key is ignored; a random key is generated instead
- **Fix npm package leaking build-machine secrets**: no more keys / machine IDs / data snapshots in the build artifact

### ⚠️ Notes
- npm package renamed to **`@techysy/10router`** (the old `10router` is an unrelated fork). If you installed `10router-cli`, switch to the new package; data directory unchanged.

## v1.0.2 (2026-08-29)

### 🐛 Fixes
- **Update check no longer points at a third-party package** (affected 1.0.1): version check, update command, and sidebar install command all target the correct package
- **postinstall no longer aborts install**: npm install no longer fails from the warm-up script on WSL paths

### ⚙️ Engineering
- **Test CI added**: tests + regression gate run automatically on push / PR

> ⚠️ **1.0.1 users should upgrade**: its built-in "check for updates" points to an unrelated third-party package.

## v1.0.1 (unreleased; delivered with v1.0.2)

> 1.0.1 was never published as a release (only the npm `10router-cli@1.0.1` briefly existed). The following reached Docker / fpk / standalone users with **v1.0.2**.

### 🔒 Security
- **4 MITM security fixes**: upstream TLS cert validation restored, root CA private key locked to 0600, no longer blindly killing the process on port 443, auto-cleanup of leftover hosts entries (MITM is off by default)

### ✨ New
- **Disabled providers sink to the bottom** via a settings toggle
- **Collapsible desktop sidebar**
- **OpenCode Go quota usage**
- **Gitee mirror fallback for model catalogs** (faster in CN)

### 🐛 Fixes
- **/v1/models no longer returns orphan custom models**
- **Custom node prefix uniqueness check**
- **Fix CodeBuddy executor dropping the Agent system prompt**

### ⚙️ Engineering
- **New npm distribution channel**: `npm i -g 10router-cli`
- **Generic "fetch models from GitHub JSON" capability** (Fetch Models)

## v1.0.0 (2026-08-26)

### ⚠️ Notes
1. **Data directory renamed**: `~/.9router/` → `~/.10router/` (Windows: `%APPDATA%\10router`), auto-migrated on first start
2. **SAML entityID changed**: default issuer is now `urn:10router:sp`; re-register in your IdP
3. **MITM CA renamed**: re-trust the new CA

### ✨ New
- **Rebrand**: 9Router → 10Router
- **i18n multi-region currency**: en / pt-BR / pt-PT / es / de
- **Multi-platform distribution**: Docker (amd64 / arm64), fnOS fpk (x86 / arm × url / iframe), Standalone
