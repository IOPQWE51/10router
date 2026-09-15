# AGENTS.md — 10router-sync

把本机 AI 编码工具的用量账本导出并导入 [10Router](https://github.com/techysy/10router) 的用量统计。

**这只是一个 CLI 脚本**（`scripts/export-usage.mjs`），不依赖任何特定 agent 宿主。本目录下的
`commands/` 和 `skills/` 是给 ZCode 用的可选包装；其他 agent（Claude Code、Codex、Cursor 等）
直接按本文的命令调用脚本即可，行为完全一致。

## 什么时候用

用户要求「同步/导出/导入用量到 10Router」「把 X 的使用量记到 10Router 统计里」，或想知道
某工具的用量并希望它出现在 10Router 仪表盘时。

## 环境要求

- **Node.js ≥ 24（推荐，与仓库 `.nvmrc` 和 CI 一致）**。脚本用内置的 `node:sqlite` /
  `DatabaseSync`，无第三方依赖，无需 npm install。
  Node 22.x 上 `node:sqlite` 属于实验特性，需要额外加 `--experimental-sqlite` 标志才能
  导入，否则报 `ERR_MODULE_NOT_FOUND`——若必须在 22.x 上跑，用
  `node --experimental-sqlite scripts/export-usage.mjs …`。
- 一个可连通的 10Router 实例，或一个虚拟 key（`sk-…`）／仪表盘密码

## 数据源

用 `--source` 指定，**只支持这四个值，且不会自动检测**（默认 `zcode`）：

| `--source` | 读取位置 | 导入后 provider 前缀 |
|---|---|---|
| `zcode`（默认）| `~/.zcode/cli/db/db.sqlite`（`model_usage` 表），另扫旧布局 `~/.zcode/projects/*/db.sqlite` | `zcode-<渠道名>` |
| `opencode` | `~/.local/share/opencode/opencode.db`，Windows 回退 `%LOCALAPPDATA%\opencode\opencode.db` | `opencode-<providerID>` |
| `mirasim` | `~/.mirasim/insights/usage-YYYY-MM.ndjson` | `mirasim-<协议>` |
| `mimo`（别名 `mimocode`）| `~/.local/share/mimocode/mimocode.db`（`message` 表，assistant 消息的 JSON `data`），Windows 回退 `%APPDATA%\Xiaomi MiMo\mimocode.db` | `mimo-<providerID>` |

四个源互相独立，需要各自单独跑一次。ZCode 源会把扫到的多个库合并去重（按行 id 去重），
所以有多份 db 时不必手动挑。

## 固定套路

大多数情况照抄这四步即可（把 `<源>` 换成 `zcode` / `opencode` / `mirasim` / `mimo`，`<URL>` 换成
10Router 地址）：

```bash
# 1. 预览，确认有数据、provider 分组合理
node scripts/export-usage.mjs --source <源> --endpoint <URL> --key sk-… --dry-run

# 2. 正式导入
node scripts/export-usage.mjs --source <源> --endpoint <URL> --key sk-…

# 3. 想看全部来源就换 --source 各跑一次（互相独立）

# 4. 连不上 10Router 时改为两步：先 --export 出 JSON，再在能连的机器 --import
```

若用户已把 key/endpoint 配在环境变量 `TENROUTER_ENDPOINT` / `TENROUTER_KEY` 里，
命令行参数可全省。

## 用法

```bash
# 1) 先预览（只统计不导入）——每次都建议先跑
node scripts/export-usage.mjs --source <源> --endpoint <URL> --key sk-… --dry-run

# 2) 确认后导入
node scripts/export-usage.mjs --source <源> --endpoint <URL> --key sk-…
```

- `--endpoint` 默认 `http://127.0.0.1:20127`；10Router 在 NAS/局域网就填实际地址，如 `http://192.168.31.101:20127`
- 鉴权二选一：`--key sk-…`（虚拟 key，推荐，可在仪表盘单独吊销）或 `--password <仪表盘密码>`
- 环境变量等价写法：`TENROUTER_ENDPOINT` / `TENROUTER_KEY` / `TENROUTER_PASSWORD`
- 其他参数：`--limit N` 只取最新 N 条；`--quiet` 静默

### 离线模式（本机连不上 10Router）

```bash
# ① 在产生用量的机器上导出（不需要网络，也不需要凭据）
node scripts/export-usage.mjs --source <源> --export usage.json

# ② 在能连上 10Router 的机器上导入
node scripts/export-usage.mjs --import usage.json --endpoint <URL> --key sk-…
```

导出的 JSON 也能直接在 10Router 仪表盘导入（设置 → 数据库备份 → JSON 用量导入）。

**导出文件格式**（供跨机器搬运 / 自行生成时参考）：

```json
{ "source": "zcode-plugin", "exportedAt": "<ISO 时间>", "rowCount": 1513, "usageHistory": [ … ] }
```

`--import` 只取 `usageHistory`（或 `usage`）字段，其余字段仅作说明、不校验；
两者都不是数组则报 `error: file is not a usage export` 并以退出码 1 结束。

## 退出码

脚本化调用时可据此判断失败类型，决定是重试还是改参数：

| 退出码 | 含义 | 例子 |
|---|---|---|
| `0` | 成功（含 0 行的空跑，此时只打印 `nothing to export/import`）| |
| `1` | 数据/环境/远端问题：可重试或换目标 | 找不到账本文件、导入文件读不了、HTTP 非 2xx |
| `2` | 参数错误：必须改命令行，重试无用 | `--source` 值非法、`--export` 与 `--import` 同时给、缺少 `--key`/`--password` |

## 关键行为（改动脚本前必读）

- **幂等去重**：10Router 服务端按行签名去重（时间戳 + provider + model + connectionId +
  apiKey + prompt/completion tokens 七字段）。重复运行安全，输出里的
  `imported X, skipped Y` 中 `skipped` 就是撞上已有行的数量。
  注意服务端有**两条写入路径**，签名相同但关注点不同：
  代理实时写入走 `saveRequestUsage()`，其去重契参见
  [用量去重 usageKey 契约](../docs/zh-CN/usage-usageKey-contract.md)（含「同毫秒丢计数」的
  历史坑与 usageKey 修复）；本脚本走 `importUsageRows()` 分支——**该文档的同毫秒问题不适用
  于导入场景**，导入侧关心的是下面那条防双重计数。
- **防双重计数**：这是最容易踩的坑。
  - **ZCode 源：只导出官方渠道**（provider id 以 `builtin:` 开头，如 `builtin:bigmodel-*`、
    `builtin:zai-*`）。非 `builtin:` 的 provider 一律是用户自行添加的自定义渠道，其流量
    在用户体系里都走本地网关（10Router 自身或兄弟中继），已由 10Router 自身记账或别的
    同步源覆盖，再导出就会重复。这是**结构性判据**（不依赖名称/URL/模型名格式），能免疫
    provider 删除重建导致的 id 变化——历史上一版基于「配置里 baseURL 匹配」的守卫就是这么
    漏掉旧 id 的 3810 行网关流量。逃生口：`--include-custom` 可恢复导出非官方渠道。
    跳过时脚本会打印按 provider 分组的计数，绝不静默丢数据。
  - mirasim 源会排除 `upstreamHost` 指向 10Router 实例的行——**必须在导出侧排除**，
    因为两侧行签名不同，服务端去重拦不住，漏掉就会双倍统计。判断逻辑见
    `isSelfHostedUpstream()`：私网/loopback 地址 + 常见端口（20127/20128/80/443），
    或 host 与目标 endpoint 同机。
  - mimo 源目前**没有**自指排除（mimocode 的 provider 体系里未发现可配置 baseURL 指向
    10Router 的路径；本机实测 providerID 只有 `mimo`/`xiaomi` 内置渠道）。若未来 mimocode
    支持自定义 provider baseURL 并指向 10Router，需要补一个同 mirasim 的排除逻辑。
  - 新增数据源时同样要先想清楚「这些调用是否已被 10Router 自己记过」。
- **只读快照，绝不原地打开数据库**：ZCode/OpenCode/MiMo 的 SQLite 是其他进程正在写的 WAL 库，
  脚本会把它（含 `-wal`/`-shm`）复制到临时目录再读（`snapshotDb()`）。改动时不要破坏这一点。
- **cost 一律记 0**：这些渠道是订阅/套餐制，不按量计费；若某源有真实计费数据再另议。
- **失败调用跳过**：mirasim 源与 mimo 源会跳过无 token 计数的失败/空转记录，避免污染统计（日志会
  打印 `skipped N rows without token counts`）。

## 排查

| 现象 | 原因与处理 |
|---|---|
| `HTTP 401 Invalid password` | key 已吊销或密码错；去仪表盘新建虚拟 key |
| `HTTP 401 Unauthorized` | 请求被全局守卫拦下，key/密码头没送到；检查 `--key`/`--password` 是否传了 |
| `connection refused` | endpoint 填错或 10Router 没在运行 |
| `no db.sqlite found` | 该工具在本机从没记录过用量 |

## 运维工具：10Router 用量库校验与清理

导入数据出错（如本插件的网关行重复导入）需要从 10Router 侧删除时，**不要手工 DELETE**：
`usageDaily` 日聚合是增量维护的，没有任何代码会从 `usageHistory` 重建它——裸删会让仪表盘
长期显示幽灵数字，而手写重建极易踩两个坑（**必须按服务器本地日期分桶**，不是 UTC 日期；
**五个维度都要重建**，不只是 byProvider/byModel）。`scripts/` 下三个工具把这套契约固化了：

| 工具 | 用途 |
|---|---|
| `usage-daily.mjs` | 聚合契约的共享实现（`aggregateEntryToDay` 的精确移植 + 本地日期分桶）。与 10Router 仓库 `src/lib/db/repos/usageRepo.js` 保持同步 |
| `verify-usage-db.mjs` | 只读校验：完整性 / 外键 / **usageDaily 与 usageHistory 逐日逐字段一致性** / lifetime 计数器。退出码 0=PASS、1=FAIL |
| `clean-usage-db.mjs` | 按 `--provider <名>` 或 `--where "<谓词>"` 删行并忠实重建受影响日桶 + 修正计数器；默认 dry-report，`--apply` 才写入；内置事后自检，失败返回 1 |

典型流程（**务必先停 10Router 服务**，它会持有数据库并发的写会损坏文件）：

```bash
# 1. 体检（可随时跑，只读）
node scripts/verify-usage-db.mjs /path/to/data.sqlite

# 2. 预览要删什么（不写入）
node scripts/clean-usage-db.mjs /path/to/data.sqlite --provider zcode-xxxx --export removed-rows.json

# 3. 执行（自带事后校验；失败会提示回滚）
node scripts/clean-usage-db.mjs /path/to/data.sqlite --provider zcode-xxxx --apply

# 4. 复检
node scripts/verify-usage-db.mjs /path/to/data.sqlite
```

实测：本机对同一份含 3810 条重复行的库执行 `clean-usage-db.mjs --apply`，与手工修复结果
**逐字节一致**（36917 行 / 56 桶 / 2026-09-12 桶 JSON 完全相同），`verify-usage-db.mjs`
在清理前后均 PASS。Node 22 需加 `--experimental-sqlite`（Node 24+ 不需要）。

## 结果汇报

跑完把 `imported X, skipped Y` 原样报给用户，并说明数据出现在 10Router 仪表盘 Usage 区的
`zcode-*` / `opencode-*` / `mirasim-*` / `mimo-*` 分组下。

## 相关文档

**本插件**

- [README.md](./README.md) — 安装方式（插件市场 / 目录安装）、各数据源示例、虚拟 key 创建
- [commands/sync-usage.md](./commands/sync-usage.md) — ZCode 斜杠命令定义
- [skills/zcode-usage-sync/SKILL.md](./skills/zcode-usage-sync/SKILL.md) — ZCode 技能说明

**10Router 服务端（导入侧）**

- [用量去重 usageKey 契约](../docs/zh-CN/usage-usageKey-contract.md) — 服务端去重规则权威说明，
  含同毫秒丢计数的历史坑；新增数据源前值得一读
- [架构文档](../docs/zh-CN/ARCHITECTURE.md) — 10Router 整体架构与用量统计在其中的位置
- [SQLite 驱动链](../docs/zh-CN/sqlite-driver-chain.md) — 服务端 SQLite 驱动选择；
  本脚本用的是 Node 内置 `node:sqlite`，与该链路无关，但排查数据库问题时可作参照

**数据源侧**

- [mirasim 工具调用丢失排查](../docs/zh-CN/mirasim-dsh-toolcall-loss.md) — mirasim 上游行为记录
- [ZCode 套餐代理可行性](../docs/zh-CN/zcode-plan-proxy-feasibility.md) — ZCode 渠道与
  防双重计数策略的背景

**仓库级**

- [CHANGELOG.md](../CHANGELOG.md) — 搜 `10router-sync` 可看插件各版本变更
- [CLAUDE.md](../CLAUDE.md) — 仓库贡献约定（提交信息规范等）
