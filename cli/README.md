# 10Router - FREE AI Router & Token Saver

**Never stop coding. Save 20-40% tokens with RTK + auto-fallback to FREE & cheap AI models.**

**Connect All AI Code Tools (Claude Code, Cursor, Antigravity, Copilot, Codex, Gemini, OpenCode, Cline, OpenClaw...) to 40+ AI Providers & 100+ Models.**

[![npm](https://img.shields.io/npm/v/10router-cli.svg)](https://www.npmjs.com/package/10router-cli)
[![Downloads](https://img.shields.io/npm/dm/10router-cli.svg)](https://www.npmjs.com/package/10router-cli)
[![GHCR](https://img.shields.io/badge/GHCR-techysy%2F10router-blue?logo=github)](https://github.com/techysy/10router/pkgs/container/10router)
[![License](https://img.shields.io/npm/l/10router-cli.svg)](https://github.com/techysy/10router/blob/main/LICENSE)

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

**Option 1 — npm (recommended for desktop):**

```bash
npm install -g 10router-cli
10router

# Or run directly with npx
npx 10router-cli
```

**Option 2 — Docker (server/VPS):**

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
