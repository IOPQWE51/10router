# 10Router - FREE AI Router & Token Saver

**Never stop coding. Save 20-40% tokens with RTK + auto-fallback to FREE & cheap AI models.**

**Connect All AI Code Tools (Claude Code, Cursor, Antigravity, Copilot, Codex, Gemini, OpenCode, Cline, OpenClaw...) to 40+ AI Providers & 100+ Models.**

[![npm](https://img.shields.io/npm/v/10router-cli.svg)](https://www.npmjs.com/package/10router-cli)
[![Downloads](https://img.shields.io/npm/dm/10router-cli.svg)](https://www.npmjs.com/package/10router-cli)
[![GHCR](https://img.shields.io/badge/GHCR-techysy%2F10router-blue?logo=github)](https://github.com/techysy/10router/pkgs/container/10router)
[![License](https://img.shields.io/npm/l/10router-cli.svg)](https://github.com/techysy/10router/blob/main/LICENSE)

**English** | [简体中文](https://github.com/techysy/10router/blob/main/cli/README.zh-CN.md)

[📖 Full Docs](https://github.com/techysy/10router)

---

## 🤔 Why 10Router?

**Stop wasting money, tokens and hitting limits:**

- ❌ Subscription quota expires unused every month
- ❌ Rate limits stop you mid-coding
- ❌ Tool outputs (git diff, grep, ls...) burn tokens fast
- ❌ Expensive APIs ($20-50/month per provider)

**10Router solves this:**

- ✅ **RTK Token Saver** - Auto-compress tool_result, save 20-40% tokens
- ✅ **Maximize subscriptions** - Track quota, use every bit before reset
- ✅ **Auto fallback** - Subscription → Cheap → Free, zero downtime
- ✅ **Multi-account** - Round-robin between accounts per provider
- ✅ **Universal** - Works with any OpenAI/Claude-compatible CLI

---

## ⚡ Quick Start

**1. Install** — pick one:

*npm (recommended for desktop):*

```bash
npm install -g 10router-cli
10router

# Or run directly with npx
npx 10router-cli
```

> ⚠️ The package is **`10router-cli`**, not `10router` — that name belongs to an
> unrelated fork on npm.

*Docker (server/VPS):*

```bash
docker run -d --name 10router -p 20128:20128 \
  -v "$HOME/.10router:/app/data" -e DATA_DIR=/app/data \
  ghcr.io/techysy/10router:latest
```

Published images: [GHCR](https://github.com/techysy/10router/pkgs/container/10router) (multi-platform amd64/arm64).

🎉 Dashboard opens at `http://localhost:20128`

**2. Connect a FREE provider (no signup needed):**

Dashboard → Providers → Connect **Kiro AI** (free Claude unlimited) or **OpenCode Free** (no auth) → Done!

**3. Use in your CLI tool:**

```
Claude Code/Codex/OpenClaw/Cursor/Cline Settings:
  Endpoint: http://localhost:20128/v1
  API Key:  [copy from dashboard]
  Model:    kr/claude-sonnet-4.5
```

That's it! Start coding with FREE AI models.

---

## 🚀 CLI Options

```bash
10router                    # Start with default settings
10router --port 8080        # Custom port
10router --no-browser       # Don't open browser
10router --skip-update      # Skip auto-update check
10router --help             # Show all options
```

**Dashboard**: `http://localhost:20128/dashboard`

---

## 🔄 Updating

How you update depends on how you installed. The dashboard shows an update
banner when a newer version is on npm — but **the "Update now" button only
works for npm installs.**

**npm** — either use the dashboard button, or:

```bash
npm i -g 10router-cli@latest
```

**Docker** — pull the new image and recreate the container. Your data lives in
the mounted volume and is not touched:

```bash
docker pull ghcr.io/techysy/10router:latest
docker rm -f 10router
docker run -d --name 10router -p 20128:20128 \
  -v "$HOME/.10router:/app/data" -e DATA_DIR=/app/data \
  ghcr.io/techysy/10router:latest
```

**fnOS (fpk)** — install the new `.fpk` from
[Releases](https://github.com/techysy/10router/releases) through the fnOS app
centre.

**Standalone** — download the new `10router-server.tar.gz` from
[Releases](https://github.com/techysy/10router/releases), stop the server, and
extract over the install directory.

> ⚠️ **Docker / fpk / standalone users: don't press "Update now".** It runs
> `npm i -g 10router-cli@latest` and relaunches through `npx`, which installs a
> *second* copy into your global npm prefix. The original install keeps running
> the old version, and the two don't know about each other. Use the channel you
> installed from. (There is no install-source check yet — tracked as a known
> gap.)

Data in `~/.10router/` survives every update path; no migration step is needed.

---

## 🛠️ Supported CLI Tools

Claude-Code • OpenClaw • Codex • OpenCode • Cursor • Antigravity • Cline • Continue • Droid • Roo • Copilot • Kilo Code • Gemini CLI • Qwen Code • iFlow • Crush • Crusher • Aider

Any tool supporting OpenAI/Claude-compatible API works.

---

## 💾 Data Location

- **macOS/Linux**: `~/.10router/db/data.sqlite`
- **Windows**: `%APPDATA%/10router/db/data.sqlite`
- **Docker**: `/app/data/db/data.sqlite` (mount `$HOME/.10router` to persist)

---

## 📚 Documentation

Full docs, advanced setup, video tutorials & development guide:

- **GitHub**: https://github.com/techysy/10router
- **Full README**: https://github.com/techysy/10router/blob/main/README.md
- **Changelog**: https://github.com/techysy/10router/blob/main/CHANGELOG.md

---

## 🙏 Acknowledgments

- **[9Router](https://github.com/decolua/9router)** - Upstream project this is an optimized fork of
- **[CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI)** - Original Go implementation

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
