# 10router-sync 更新日志

10router-sync 插件的版本变更记录（仓库级日志见 [`../CHANGELOG.md`](../CHANGELOG.md)）。
版本号写在 [`.zcode-plugin/plugin.json`](./.zcode-plugin/plugin.json) 与
[`marketplace.json`](./marketplace.json)，两者保持一致。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。
本插件尚未发布 1.0.0——0.3.0 之后直接进入 1.1.0（首次支持多数据源）。

## [1.2.0] — 2026-09-15

### 新增

- **小米 MiMo 桌面版用量导出**（`--source mimo`，别名 `--source mimocode`）：读
  `~/.local/share/mimocode/mimocode.db` 的 `message` 表，取每轮 assistant 消息的
  `input`/`output`/`reasoning`/`cache.read`/`cache.write` 五项 token 计量（附
  `modelID`/`providerID`/`agent`/`mode`/`time`），粒度比 OpenCode 的 session 级汇总更细。
  实现沿用既有安全惯例：WAL 活库先快照再读、按 `message.id` 去重、0-token 空转/中断轮次
  跳过、provider 落 `mimo-<providerID>`、cost 记 0、`meta` 带 messageId/sessionId/agent/mode。
  Windows 回退路径 `%APPDATA%\Xiaomi MiMo\mimocode.db`。
- **运维工具三件套**（`scripts/`）：
  - `usage-daily.mjs` — 10Router `usageDaily` 聚合契约的共享实现（本地日期分桶 + 五维聚合），
    与 10Router 仓库 `src/lib/db/repos/usageRepo.js` 保持同步。
  - `verify-usage-db.mjs` — 只读体检：完整性 / 外键 / **usageDaily 与 usageHistory 逐日逐字段
    一致性** / lifetime 计数器。退出码 0=PASS、1=FAIL。
  - `clean-usage-db.mjs` — 按 `--provider <名>` 或 `--where "<谓词>"` 删行并忠实重建受影响日桶
    + 修正计数器；默认 dry-report，`--apply` 才写入；内置事后自检，失败返回 1。
- `--include-custom` 选项（见下方"变更"）。

### 变更

- **ZCode 源改为结构性「仅官方渠道」**：只导出 provider id 以 `builtin:` 开头的行
  （`builtin:bigmodel-*`、`builtin:zai-*` 等）。非 `builtin:` 的 provider 一律是用户自加的
  自定义渠道，其流量都走本地网关（10Router 自身或兄弟中继），已由 10Router 记账或别的同步源
  覆盖，导出即重复。跳过时按 provider 分组打印计数（不静默丢数据）。
  `--include-custom` 可恢复旧的"全部导出"行为。

  改动原因：旧守卫基于「当前配置里 baseURL 指向 10Router 的 provider id」，而 provider 删除
  重建会换 id——实测旧 id `bd97d057-…` 的 3810 行网关流量因此漏网并被导入，与 10Router 自记的
  `bai` 渠道形成双份统计；随后加的启发式补丁（UUID + 网关寻址模型名）又被第三个自定义
  provider（`1fd00800-…`，90 行，模型名不含前缀）绕过。前缀判据结构性覆盖全部三种情况。

### 修复

- 无（本次未发现旧版本的其他缺陷）

### 文档

- README 补「运维工具：用量库校验与清理」章节与小米 MiMo 用法；AGENTS.md 补运维工具说明与
  新的防双重计数规则；SKILL.md 补数据源、工具用法与故障处理；命令描述与 manifest 同步至 v1.2.0。

## [1.1.0] — 2026-09-11

### 新增

- **mirasim 桌面端用量同步**（`--source mirasim`）：读 `~/.mirasim/insights/usage-YYYY-MM.ndjson`
  逐调用账本（`input`/`output`/`cacheRead`/`cacheWrite`/`reasoning`），provider 落
  `mirasim-<协议>`，失败调用（无 token 消耗）自动跳过。E2E 验证导入/重导入
  `imported:20 → skipped:20`。
- 逐调用账本跨月去重（按调用 id）。

### 修复

- **mirasim 导出防双重计数**：`upstreamHost` 指向 10Router 实例的行自动跳过——判断逻辑为
  「loopback/私网地址 + 常见端口（20127/20128/80/443）」或「host 与目标 endpoint 同机」。
  必须在导出侧排除：两侧行签名永不碰撞，服务端去重拦不住，漏掉就会双倍统计。
  配套 12 例 matcher 单测。

### 文档

- 新增 `AGENTS.md`（面向非 ZCode agent 的复用说明），后续校正 Node 版本说法、补退出码表与
  导出文件格式说明。
- 命令描述补中文（i18n）。

## [0.3.0] — 2026-09-08

### 新增

- **OpenCode 桌面端用量导出**（`--source opencode`）：读
  `~/.local/share/opencode/opencode.db` 的 `session` 表（Windows 回退
  `%LOCALAPPDATA%\opencode\opencode.db`），provider 落 `opencode-<providerID>`。

## [0.2.0] — 2026-09-07

### 新增

- **离线导出/导入模式**：`--export <file>` 在本机导出 JSON（无需网络与凭据），
  `--import <file>` 在能连通 10Router 的机器导入；导出的 JSON 也可直接在 10Router 仪表盘导入
  （设置 → 数据库备份 → JSON 用量导入）。适用于 ZCode 与 10Router 不在同一网段的场景。

### 文档

- 仓库根新增 `marketplace.json`，ZCode 用户可在 Discover 页添加 `techysy/10router` 直接安装
  本插件（npm/桌面/源码安装用户通用，无需单独仓库）。

## [0.1.0] — 2026-09-05

首个版本。

### 新增

- **ZCode 本地用量同步**：读 `~/.zcode/cli/db/db.sqlite` 的 `model_usage` 表，转为
  usageHistory 经 `/api/settings/database/import-usage` 导入 10Router。WAL 活库先快照再读
  （绝不原地打开正在写的库）。
- **防双重计数**：自动排除 baseURL 指向 10Router 自身的 provider（那些调用 10Router 已记账）。
- **幂等**：依赖 10Router 服务端的行签名去重，重复执行不产生重复数据。
- **鉴权**：Bearer 虚拟 key（`sk-…`）或仪表盘密码（`x-9r-password`），亦支持环境变量
  `TENROUTER_ENDPOINT` / `TENROUTER_KEY` / `TENROUTER_PASSWORD`。
- 交付形态：skill + slash 命令（`/10router-sync:sync-usage`）+ 插件 manifest。
- 已装本机 ZCode（`plugins.dirs` inline）并端到端验证。

[1.2.0]: #120--2026-09-15
[1.1.0]: #110--2026-09-11
[0.3.0]: #030--2026-09-08
[0.2.0]: #020--2026-09-07
[0.1.0]: #010--2026-09-05
