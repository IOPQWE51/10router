<div align="center">

<img width="3818" height="1901" alt="image" src="https://github.com/user-attachments/assets/790507c7-68be-4111-a907-32ca6303f141" />


  # 10Router

  [![GitHub stars](https://img.shields.io/github/stars/techysy/10router?style=flat&logo=github)](https://github.com/techysy/10router/stargazers)
  [![GitHub last commit](https://img.shields.io/github/last-commit/techysy/10router)](https://github.com/techysy/10router/commits)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
  [![10Router](https://img.shields.io/badge/10Router-v1.0.0-orange.svg)](https://github.com/techysy/10router)
  [![Docker](https://img.shields.io/badge/Docker-ghcr.io%2Ftechysy%2F10router-blue?logo=docker)](https://github.com/techysy/10router/pkgs/container/10router)

  基于 [decolua/9router](https://github.com/decolua/9router) v0.5.55 的本地优化快照

  **单一 commit 历史，无上游提交污染，便于 cherry-pick 同步上游新功能。**

</div>

---

## 简介

10Router 是 [9Router](https://github.com/decolua/9router) 的精简优化版本。在上游 v0.5.55 基础上合并了若干本地验证过的修复，排除未完成的实验性功能，保持干净的 git 历史便于持续同步上游。

```
┌─────────────┐
│  Your CLI   │  Claude Code · Codex · Cursor · Cline · OpenCode ...
│   Tool      │
└──────┬──────┘
       │ http://localhost:20128/v1
       ↓
┌─────────────────────────────────────────┐
│            10Router (Smart Router)       │
│  • RTK Token Saver (cut tool_result)    │
│  • Format translation (OpenAI ↔ Claude) │
│  • Quota tracking                       │
│  • Auto fallback & token refresh        │
│  • Regional currency display            │
└──────────┬──────────────────────────────┘
           ↓
┌──────────────────────────────────────────┐
│     40+ Providers · 100+ Models          │
│  Free ──→ Cheap ──→ Subscription         │
└──────────────────────────────────────────┘
```

## 与上游的差异

| 修复 | 文件 | 说明 |
|------|------|------|
| **无连接不暴露内置模型** | `api/v1/models/route.js` | DB 正常但无连接时，不 dump 全量 ~680 built-in catalog，避免淹没客户端 |
| **Claude 轮询加速** | `usage/components/ProviderLimits/utils.js` | quota 轮询间隔 10min → 3min，配额变化感知更快 |
| **移除 groupByProviderStable** | `usage/components/ProviderLimits/utils.js` | 恢复自然排序，不强制按 provider 聚合 |
| **MiMo Free topology 默认可见** | `mimo-free.js` | usage topology 上默认展示（可 toggle 隐藏），不再只有一个大 OpenCode 图标 |
| **多币种本地化显示** | `shared/utils/currency.js` | CNY ¥ / TWD NT$ / JPY ¥ / KRW ₩ / VND ₫，Profile 页可切换 |
| **配额按 connection 隔离** | `usage/components/ProviderLimits/utils.js` | 多账号场景下每个 connection 独立计算配额，互不干扰 |
| **arm64 Docker 支持** | `docker-publish.yml` | 镜像同时构建 linux/amd64 + linux/arm64，支持树莓派等 ARM 设备 |

### 已在 fork分支 的改动（不再重复）

- 货币本地化（¥/NT$/₩/₫）— fork分支 v0.5.50+
- 配额包按 connection 独立 — fork分支 v0.5.50+
- 拓扑 toggle — fork分支 v0.5.50+
- Cloudflare 修复 — fork分支 v0.5.50+

## 快速开始

### Docker 部署

```bash
docker pull ghcr.io/techysy/10router:latest
docker run -d \
  --name 10router \
  -p 20128:20128 \
  -v ~/.9router:/app/data \
  ghcr.io/techysy/10router:latest
```

支持 `linux/amd64` 和 `linux/arm64`。

### fnOS fpk 安装

从 [Releases](https://github.com/techysy/10router/releases) 下载对应架构的 `.fpk` 文件：

| 文件 | 说明 |
|------|------|
| `10router-1.0.0-x86.fpk` | x86 URL 版 |
| `10router-1.0.0-iframe-x86.fpk` | x86 IFRAME 版 |
| `10router-1.0.0-arm.fpk` | ARM URL 版 |
| `10router-1.0.0-iframe-arm.fpk` | ARM IFRAME 版 |

安装：App Center → 手动安装 → 选择 fpk。

### Standalone Server

```bash
tar xzf 10router-server.tar.gz -C /opt/10router
cd /opt/10router
node custom-server.js --port 20128
```

### 源码开发

```bash
git clone https://github.com/techysy/10router.git
cd 10router
cp .env.example .env
npm install
PORT=20128 npm run dev        # 开发模式
```

生产部署：

```bash
npm run build
PORT=20128 HOSTNAME=0.0.0.0 npm run start
```

- Dashboard: `http://localhost:20128/dashboard`
- API endpoint: `http://localhost:20128/v1`
- 初始密码: `123456`（登录后请修改）

## 同步上游

本项目 git 历史已重写（仅保留 techysy/ShiYanG Yu 的提交），同步上游时请用 cherry-pick 避免把上游历史带回来：

```bash
# 添加上游 remote
git remote add upstream https://github.com/decolua/9router.git
git fetch upstream

# cherry-pick 需要的提交
git cherry-pick <commit-hash>

# 或下载上游最新 tarball 覆盖文件后手动解决冲突
curl -L https://github.com/decolua/9router/archive/refs/heads/master.tar.gz \
  | tar xz --strip-components=1
git add -A && git commit -m "chore: sync upstream v0.5.xx"
```

## 项目结构

```
10router/
├── src/                    # Next.js app + Dashboard
│   ├── app/                # 路由 + API
│   ├── lib/                # DB / Auth / Usage
│   └── shared/             # 组件 / 工具函数
├── open-sse/               # 路由/翻译引擎（可独立使用）
│   ├── executors/          # 每个 provider 的执行器
│   ├── translator/         # 格式翻译（OpenAI ↔ Claude）
│   ├── providers/          # Provider 注册 + 配置
│   └── rtk/                # Token Saver 压缩引擎
├── cli/                    # CLI launcher（npm: 10router）
├── tests/                  # 测试（vitest）
├── docs/                   # 架构文档
└── .github/workflows/      # CI（Docker GHCR 构建）
```

## 相关链接

- [上游项目 9Router](https://github.com/decolua/9router)
- [9Router 文档](https://9router.com)
- [9Router fnOS 应用包](https://github.com/techysy/9router-fnos)

## 贡献者

- [techysy](https://github.com/techysy) — 主要维护者
- [shiyangyuda](https://github.com/shiyangyuda) — 代码优化
- [monkey2jack](https://github.com/monkey2jack) — arm64 Docker 支持

## License

MIT — 与 [decolua/9router](https://github.com/decolua/9router) 一致
