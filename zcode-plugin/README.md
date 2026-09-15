# 10router-sync (ZCode / OpenCode / mirasim / 小米 MiMo 插件)

把本机 ZCode 的模型调用流水（`~/.zcode/cli/db/db.sqlite` 的 `model_usage` 表）、OpenCode 桌面端的会话用量（`~/.local/share/opencode/opencode.db` 的 `session` 表）、mirasim 桌面端的调用账本（`~/.mirasim/insights/usage-*.ndjson`）或小米 MiMo 桌面版的逐条消息用量（`~/.local/share/mimocode/mimocode.db` 的 `message` 表）导出并导入 10Router 的用量统计，复用 10Router 的 `/api/settings/database/import-usage` 接口。

## 能力

- **幂等**：10Router 按行签名去重，重复运行不会产生重复数据
- **防双重计数**：ZCode 源默认**只导出官方渠道**（`builtin:*`，如 `builtin:bigmodel-*`、`builtin:zai-*`）——自定义/网关类 provider 的流量已由 10Router 自身或其他同步源记账，导出会重复（需要时用 `--include-custom` 恢复导出）；mirasim 源按 `upstreamHost` 排除中转流量
- **溯源**：导入后 provider 显示为 `zcode-<名称>`（如 `zcode-bigmodel-start-plan`）、`opencode-<providerID>`、`mirasim-<协议>`、`mimo-<providerID>`，cost 记 0（订阅制渠道），agent/会话/时长等明细在 meta 里
- **鉴权**：虚拟 key（`sk-…`，推荐）或仪表盘密码，与 10Router v1.0.7+ 的导入鉴权匹配

## 安装

**方式一：ZCode 插件市场（推荐，npm/桌面/源码安装用户通用）**

ZCode → Settings → Plugin Management → Discover 页 → 点 `+` 添加市场，填 GitHub 仓库 `techysy/10router`（市场索引在仓库根 `marketplace.json`）→ 找到 **10router-sync** 点 Get 安装。

**方式二：从目录安装（本地开发）**

Plugins → 从目录安装，选择 `zcode-plugin/` 目录（含 `.zcode-plugin/plugin.json`）。或直接把目录拷贝到 ZCode 插件目录。

## 使用

- 斜杠命令：`/10router-sync:sync-usage`（可带参数，如 NAS 地址）
- 技能：对 ZCode 说「导出 ZCode 使用量到 10Router」即自动触发
- 直接跑脚本：

```bash
# 预览（不导入）
node scripts/export-usage.mjs --endpoint http://127.0.0.1:20127 --key sk-… --dry-run

# 导入（本机可直连 10Router 时）
node scripts/export-usage.mjs --endpoint http://127.0.0.1:20127 --key sk-…
```

数据源由 `--source` 指定：`--source zcode`（默认）读 ZCode，`--source opencode` 读 OpenCode 桌面端，`--source mirasim` 读 mirasim 桌面端，`--source mimo` 读小米 MiMo 桌面版。OpenCode / mirasim / MiMo 不会自动检测——导出其用量须显式指定 `--source`。

### OpenCode 用量同步

```bash
# 导入 OpenCode 用量（本机可直连 10Router 时）
node scripts/export-usage.mjs --source opencode --endpoint http://127.0.0.1:20127 --key sk-…

# 离线：先导出，再在能连通 10Router 的机器导入
node scripts/export-usage.mjs --source opencode --export opencode-usage.json
node scripts/export-usage.mjs --import opencode-usage.json --endpoint http://<host>:<port> --key sk-…
```

### mirasim 用量同步

mirasim 桌面端的调用账本在 `~/.mirasim/insights/usage-YYYY-MM.ndjson`（逐调用记录，含
input/output/cacheRead/cacheWrite/reasoning 五项 token 计量与 agent/model/workspace 明细）。

```bash
# 导入 mirasim 用量（本机可直连 10Router 时）
node scripts/export-usage.mjs --source mirasim --endpoint http://127.0.0.1:20127 --key sk-…

# 离线：先导出，再在能连通 10Router 的机器导入
node scripts/export-usage.mjs --source mirasim --export mirasim-usage.json
node scripts/export-usage.mjs --import mirasim-usage.json --endpoint http://<host>:<port> --key sk-…
```

说明：导入后 provider 显示为 `mirasim-<协议>`（如 `mirasim-anthropic`、`mirasim-openai-responses`、`mirasim-openai-chat`），cost 记 0（mirasim 中转为套餐制）；失败调用（HTTP ≥400 无 token 消耗）自动跳过；agent/leg/upstreamHost/effort/repo/workspace 等溯源明细在 meta 里。

### 小米 MiMo 桌面版用量同步

小米 MiMo 桌面版（mimocode）把每轮 assistant 消息的完整 token 计量记在
`~/.local/share/mimocode/mimocode.db` 的 `message` 表里（input/output/reasoning/
cache.read/cache.write 五项，附带 modelID/providerID/agent/mode/时间戳）。

```bash
# 导入 MiMo 用量（本机可直连 10Router 时）
node scripts/export-usage.mjs --source mimo --endpoint http://127.0.0.1:20127 --key sk-…

# 离线：先导出，再在能连通 10Router 的机器导入
node scripts/export-usage.mjs --source mimo --export mimo-usage.json
node scripts/export-usage.mjs --import mimo-usage.json --endpoint http://<host>:<port> --key sk-…
```

说明：导入后 provider 显示为 `mimo-<providerID>`（如 `mimo-xiaomi`、`mimo-mimo`），cost 记 0（套餐制）；
空转/中断的 0-token 轮次自动跳过；message id/会话/agent/mode 等溯源明细在 meta 里。`--source mimocode` 是 `--source mimo` 的别名。

### 离线模式（ZCode 与 10Router 不在同一网段）

本机无法直连 10Router 时，先导出 JSON（无需网络与凭据），把文件带到任何能连上
10Router 的机器再导入：

```bash
# ① ZCode 机器上导出
node scripts/export-usage.mjs --export zcode-usage.json

# ② 能连通 10Router 的机器上导入
node scripts/export-usage.mjs --import zcode-usage.json --endpoint http://<host>:<port> --key sk-…
```

导出的 JSON 也可以直接在 10Router 仪表盘导入（设置 → 数据库备份 → JSON 用量导入）。
幂等去重按行签名，导出后隔多久导入、重复导入都安全。

环境变量：`TENROUTER_ENDPOINT` / `TENROUTER_KEY` / `TENROUTER_PASSWORD`。

## 运维工具：用量库校验与清理

导错了数据需要从 10Router 侧删除时，**不要手工 DELETE** —— `usageDaily` 日聚合是增量维护的，
没有任何代码会从 `usageHistory` 重建它：裸删会让仪表盘长期显示幽灵数字，手写重建则极易踩
「UTC 日期 vs 服务器本地日期」和「五个聚合维度只重建了两个」这两个坑。

| 工具 | 用途 |
|---|---|
| `scripts/verify-usage-db.mjs` | 只读体检：完整性 / 外键 / **usageDaily 与 usageHistory 逐日逐字段一致性** / lifetime 计数器 |
| `scripts/clean-usage-db.mjs` | 按 `--provider <名>` 或 `--where "<谓词>"` 删行，忠实重建受影响日桶并修正计数器；默认只预览，`--apply` 才写入，自带事后校验 |
| `scripts/usage-daily.mjs` | 上述两者共享的聚合契约实现（与 10Router 的 `usageRepo.js` 保持同步） |

```bash
# 体检（只读，随时可跑）
node scripts/verify-usage-db.mjs /path/to/data.sqlite

# 预览要删什么（不写入；--export 可先备份这些行）
node scripts/clean-usage-db.mjs /path/to/data.sqlite --provider zcode-xxxx --export removed.json

# 执行（自带事后校验，失败会提示回滚）
node scripts/clean-usage-db.mjs /path/to/data.sqlite --provider zcode-xxxx --apply
```

**操作前必须先停 10Router 服务**（或改在副本上操作）——应用持有该数据库，并发写入会损坏文件。
Node 22 需加 `--experimental-sqlite`；Node 24+ 直接跑。

## 脚本一览

| 脚本 | 用途 |
|---|---|
| `scripts/export-usage.mjs` | 主程序：四源导出 → 在线导入 / 离线导出导入 |
| `scripts/verify-usage-db.mjs` | 10Router 用量库只读体检（见上节） |
| `scripts/clean-usage-db.mjs` | 10Router 用量库删行 + 日聚合重建（见上节） |
| `scripts/usage-daily.mjs` | 聚合契约共享实现，被上面两个工具引用 |

## 文档

| 文档 | 内容 |
|---|---|
| [CHANGELOG.md](./CHANGELOG.md) | 本插件各版本变更记录 |
| [AGENTS.md](./AGENTS.md) | 面向非 ZCode agent 的复用说明（脚本契约、退出码、关键行为、排查） |
| [commands/sync-usage.md](./commands/sync-usage.md) | 斜杠命令定义 |
| [skills/zcode-usage-sync/SKILL.md](./skills/zcode-usage-sync/SKILL.md) | ZCode 技能说明 |

## 创建虚拟 key

10Router 仪表盘 → API Keys → 新建（如命名 `zcode-usage-sync`），把生成的 `sk-…` 传给脚本。key 可随时在仪表盘单独吊销，无需暴露仪表盘密码。
