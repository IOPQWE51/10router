# 🐳 Docker

Run 10Router in a container. Published image: [`ghcr.io/techysy/10router`](https://github.com/techysy/10router/pkgs/container/10router) — multi-platform `linux/amd64` + `linux/arm64`.

---

# 👤 For Users

## Quick start

```bash
docker run -d \
  -p 20128:20128 \
  -v "$HOME/.10router:/app/data" \
  -e DATA_DIR=/app/data \
  --name 10router \
  ghcr.io/techysy/10router:latest
```

App listens on port `20128`. Open: http://localhost:20128

> 📦 Upgrading from 9Router? If `~/.9router/` exists and `~/.10router/` is empty, 10Router copies your old data over automatically on first start (the old directory is kept).

## Manage container

```bash
docker logs -f 10router       # view logs
docker stop 10router          # stop
docker start 10router         # start again
docker rm -f 10router         # remove
```

## Data persistence

```bash
-v "$HOME/.10router:/app/data" \
-e DATA_DIR=/app/data
```

Without `DATA_DIR`, the app falls back to `~/.10router/` (macOS/Linux) or `%APPDATA%\10router\` (Windows). In the container, `DATA_DIR=/app/data` makes the bind mount work.

Data layout under `$DATA_DIR/`:

```text
$DATA_DIR/
├── db/
│   ├── data.sqlite       # main SQLite database
│   └── backups/          # auto backups
└── ...                   # certs, logs, runtime configs
```

Host path: `$HOME/.10router/db/data.sqlite`
Container path: `/app/data/db/data.sqlite`

## Optional env vars

```bash
docker run -d \
  -p 20128:20128 \
  -v "$HOME/.10router:/app/data" \
  -e DATA_DIR=/app/data \
  -e PORT=20128 \
  -e HOSTNAME=0.0.0.0 \
  -e DEBUG=true \
  --name 10router \
  ghcr.io/techysy/10router:latest
```

## Optional Headroom sidecar

The 10Router image does not bundle Python or Headroom. To use Headroom in Docker, run it as a separate service and point 10Router at that proxy:

```yaml
services:
  10router:
    image: ghcr.io/techysy/10router:latest
    ports:
      - "20128:20128"
    volumes:
      - "$HOME/.10router:/app/data"
    environment:
      DATA_DIR: /app/data
      HEADROOM_URL: http://headroom:8787
    depends_on:
      - headroom

  headroom:
    image: ghcr.io/chopratejas/headroom:latest
    ports:
      - "8787:8787"
```

In the dashboard, open `Endpoint` → `Token Saver` → `Headroom`, confirm the URL is `http://headroom:8787`, recheck status, then enable Headroom.

If Headroom runs on the Docker host instead of as a sidecar, use `http://host.docker.internal:8787` on macOS/Windows. On Linux, add `--add-host=host.docker.internal:host-gateway` or the equivalent compose `extra_hosts` entry.

## Update to latest

```bash
docker pull ghcr.io/techysy/10router:latest
docker rm -f 10router
# re-run the quick start command
```

---

# 🛠 For Developers

## Build image locally (test)

```bash
docker build -t 10router .

docker run --rm -p 20128:20128 \
  -v "$HOME/.10router:/app/data" \
  -e DATA_DIR=/app/data \
  10router
```

## Publish (automatic via CI)

Push a git tag `v*` → GitHub Actions builds multi-platform (amd64+arm64) and pushes to:
- `ghcr.io/techysy/10router:v{version}` + `:latest`

```bash
git tag v1.x.x && git push origin v1.x.x
```

Workflow: `.github/workflows/docker-publish.yml`
