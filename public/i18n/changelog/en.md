# Changelog

User-facing highlights per release. See [CHANGELOG.md](https://github.com/techysy/10router/blob/main/CHANGELOG.md) for the full developer log.

## v1.0.4 (2026-08-31)

### ✨ New
- **Changelog loads in your UI language**: Change Log now shows Chinese / Traditional / English per the interface language, bundled locally (no latency); untranslated locales fall back to English

### 🐛 Fixes
- **Provider ordering corrected**: connected providers float to the top, all-disabled providers sink, never-configured sink last; OpenCode Free / MiMo Code Free (topology-hidden) sit just below connected and above disabled
- **Disabled connections no longer count as connected**
- **Change Log modal**: external links open in a new tab, modal & header menu are translated, and switching language refreshes immediately
- **Custom models (e.g. bai) no longer hidden by JSON-catalog mode**

### 🔒 Security
- **Outbound proxy restored on boot**: no need to re-save settings after a restart

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
