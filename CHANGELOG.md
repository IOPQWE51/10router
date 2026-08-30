# v1.0.3 (2026-08-29)

## 🔒 发布前安全修复（正式版发布前置）

- **修复 npm 包携带构建机敏感文件**：CLI 构建把 `HOME`/`APPDATA` 指到 `cli/.build-home`，Next 构建期初始化生成的 `jwt-secret`、`machine-id` 和一份 `data.sqlite` 快照被 output tracing 带进 standalone、再随 `files: ["app"]` 进入 npm tarball（实测确认）。现改为：构建期 HOME 挪到系统临时目录（脱离 tracing root），构建结束前新增第 9 步全量扫描 `jwt-secret` / `machine-id` / `data.sqlite*` / `.build-home`，命中即拒绝出包；被污染的本地 `cli/app` 已清理。
- **修复照抄 `.env.example` 导致会话可伪造**：示例里的 `JWT_SECRET=change-me-...` 是仓库公开字符串，照抄的用户其 dashboard 登录态可被任意伪造。现在 `.env.example` 注释掉 `JWT_SECRET`/`INITIAL_PASSWORD`（留空即自动生成 0600 随机密钥），且运行时检测到已知占位值会忽略它并回退到生成的密钥。
- **仪表盘登录接入渐进锁定**：`loginLimiter`（5 次失败锁 30s→2m→10m→30m）此前只接了 SAML 回调，密码登录 `/api/auth/login` 完全无限流。现已接入，与 SAML 共用同一套 IP 判定（信任 `x-9r-real-ip` 需 custom-server 的 peer token 背书）。
- **登录密码校验统一**：登录路由改为复用 `verifyDashboardPassword`——`INITIAL_PASSWORD` 环境变量此前在登录路由被忽略（文档写了但实际不生效），现与敏感操作二次验证口径一致；同时移除登录路由里一份带硬编码兜底密钥的死代码。
- **修复用量统计同毫秒丢计数**：`saveRequestUsage` 的去重只按内容匹配（时间戳精确到毫秒 + provider/model/connection/key + token 数），两个真实不同请求若同毫秒落账且 token 数相同，第二条会被当重复吞掉——历史行、日聚合、终身计数三者同步少一。现调用方（chat 流式/非流式/SSE转JSON、embeddings 共 5 处）每上游尝试写入 `usageKey`，去重只按 key 命中；无 key 的旧调用方保持原行为。新增 `tests/unit/usage-dedup.test.js` 回归测试（3 用例）。
- **仓库描述更正**：GitHub/GHCR 描述从 "9Router fork: ..." 更新为 10Router 自述（此前 Docker 包页展示的是上游名号）。
- **核实存疑两项**：docker-publish.yml 的 "重复 `--tag :latest`" 为误报（第二处 latest 是 `runs-on: ubuntu-latest`，写法本就正确）；`public/providers/longcat.png` 图标确认来自上游合并 `fd7a881c`，来源已明。

## ✨ 功能与体验（正式版收录）

- **左上角品牌区更正为 "10Router Proxy"**：跟随上游改名时丢了 "Proxy" 后缀（上游为 "9Router Proxy"）。仅调整侧边栏字标一处；登录页、PWA manifest、浏览器标题等其余位置保持原文案。
- **fnOS fpk 检查更新改为指向对应版本的 Releases**：fpk 启动脚本注入 `INSTALL_CHANNEL=fpk`，`/api/version` 据此返回 `releaseUrl`（`github.com/techysy/10router/releases/tag/v<版本>`，比页内锚点更可靠）；侧边栏对 fpk 安装显示 "Get the fpk from Releases"，不再展示对 fpk 无效的 npm 安装命令。顺带修复：fpk 生成的默认 `.env` 不再写入占位 `JWT_SECRET`（公开字符串，服务端现已忽略并告警）。
- **自定义供应商支持模型 JSON 目录（获取列表 + 禁用/激活）**：此前自定义节点添加模型只有"手动添加 / 从 /models 全量导入、只能逐个删除"。现节点编辑新增 "Model JSON URL"（及可选镜像 fallback），支持 `{models:[...]}` 与 OpenAI `/v1/models` 风格 `{data:[...]}` 两种格式；非 GitHub 源自动附带连接 API key 作为 Bearer。导入后与预置供应商同一生命周期：逐个禁用/激活、批量 Active All / Disable All、受全局 JSON 导入开关控制、`/v1/models` 只暴露启用模型。原手动路径在未导入目录或开关关闭时照常可用。
- **新增 4 家开放供应商**（均已配官方图标，模型目录 JSON 走仓库 GitHub+Gitee 双源，可在供应商页"获取列表"拉取更新）。其中两家免费公测（**Dots**、**SenseNova**）归入供应商页的 Free Tier 分区（`category: "freeTier"`，公测结束开始收费时改回 `apikey`）；付费平台 **LongCat**、**B.AI** 归常规 API-key 分区：
  - **LongCat**（美团，付费）：OpenAI 兼容端点 `api.longcat.chat/openai/v1`，Bearer 鉴权；
  - **SenseNova**（商汤 TokenPlan，公测免费）：`token.sensenova.cn/v1`，标准 Bearer，含 DeepSeek V4 Flash / GLM 5.2 托管模型与两款图像模型（走 `/v1/images/generations`，已按 `kind: "image"` 标注）；
  - **Dots**（小红书 Dots Studio，公测免费）：`note3-prev-api.askdiandian.com/v1`（公测端点，GA 后可能变更），鉴权为自定义 `api-key` 请求头（非 Bearer），已通过 registry `transport.auth` 适配；
  - **B.AI**（聚合平台，付费，一个 Key 通吃 GPT/Claude/Gemini/DeepSeek/GLM/Kimi/Qwen 等 11 个家族）：`api.b.ai/v1`，标准 Bearer；模型 ID 与凭证绑定，静态目录留空、以凭证 `GET /v1/models` 实时列表为准。

## ⚠️ npm 包名变更为 `@techysy/10router`

`npm i -g @techysy/10router`，可执行命令仍是 `10router`，其余渠道（Docker / fpk / standalone）不受影响。

**为什么改**：npm 上的 `10router` 属于 `some-du6e/10router` —— 同为 `decolua/9router` 的 fork，且**早于本项目改名两周**发布，属于正当使用，无法争取。此前的权宜之计 `10router-cli` 又与项目名不一致，用户凭记忆敲 `npm i -g 10router` 会装错包。改用 scope 包后，`@techysy` 归本组织独占，任何人无法占用，同时拿回了确切的品牌名。

**已装 `10router-cli` 的用户**：该包停止更新，请改装 `@techysy/10router`。数据目录 `~/.10router/` 不变，无需迁移。

- 仪表盘的版本检查、「立即更新」拉起的 npx 命令、侧边栏安装命令、独立 updater 的兜底包名，均已同步指向新包名。

## 📝 文档

- **CLI README 新增「更新」章节**：分别说明 npm / Docker / fpk / standalone 四个渠道的更新方式，并明确警告 **非 npm 安装不要点击仪表盘的「立即更新」** —— 该按钮执行 `npm i -g` 并经 `npx` 重启，会在全局 npm 目录装出第二份，与原安装并存且互不知晓（更新入口目前无安装来源判断，属已知待办）。
- 新增简体中文版 `cli/README.zh-CN.md`，两版顶部提供语言切换（npm 页面不解析相对链接，故使用绝对 URL）。

# v1.0.2 (2026-08-29)

> npm 上的 `10router-cli@1.0.1` 是首次发布的试水版本。npm 的 `name@version` 组合**永久不可重用**（即使 unpublish 也无法找回该版本号），因此正式版为 1.0.2。**建议 1.0.1 用户升级**：其内置的「检查更新」指向的是一个无关的第三方包。

## Bug Fixes

- ⚠️ **修复更新检查指向第三方包**（1.0.1 受影响）：仪表盘的版本检查、「立即更新」执行的 npx 命令、侧边栏展示的安装命令，以及独立 updater 的兜底包名，在 1.0.1 中仍写的是 `10router`——该名字在 npm 上属于一个与本项目无关的 fork。一旦该 fork 发布更高版本号，1.0.1 的仪表盘就会引导用户去安装他人的包。现已全部指向 `10router-cli`。
- **`--help` 显示错误的命令名**（1.0.1 受影响）：帮助信息打印的是 npm 包名 `10router-cli`，而实际可执行命令是 `10router`。二者在改名前恰好相同，改名后才暴露。
- **postinstall 失败不再中断安装**：该钩子仅预热 `~/.10router/runtime`，且 `cli.js` 每次启动都会重跑同样的自愈逻辑，失败本无代价。但在 WSL 路径上使用 Windows npm 安装时，postinstall 经由 cmd.exe 执行，而 cmd.exe 无法将 UNC 路径作为工作目录、会静默回退到 `C:\Windows`，导致 node 根本找不到脚本文件——脚本内部的 try/catch 此时尚未执行，整个安装随之失败。

## 工程

- **澄清 `better-sqlite3` 的定位**（无行为变更）：它虽然在几乎所有部署里都不会被实际加载（npm ≥11 会跳过未放行安装脚本的 optionalDependency，且 Next tracing 只拷贝其 `lib/*.js` 而不含 `.node`，故 Docker / fpk / standalone 一律落到 `node:sqlite`），但它是**构建期必需**的：`adapters/betterSqliteAdapter.js` 静态 import、`api/oauth/cursor/auto-import/route.js` require，webpack 必须能解析该模块。曾尝试移除该依赖声明，导致 `next build` 报 `Module not found` 而中断，已恢复并在 `package.json` 中注明请勿删除。
- **新增测试 CI**：`.github/workflows/test.yml` 在每次推送 main 与 PR 时运行套件（ubuntu + Node 24），执行注册表基线校验与回归门禁。此前三个 workflow 只做构建，测试从未在 CI 跑过。
- **修复回归门禁脚本**并重建基线；修复一批仅因路径/运行器假设而失败的测试，套件从 1820 通过 / 94 失败变为 1872 通过 / 41 失败。
- 统一 Node 版本为 24（Active LTS，支持至 2028-04），新增 `.nvmrc`。

# v1.0.1 — 未发布（内容随 v1.0.2 交付）

> 本节记录原定于 1.0.1 的改动。**1.0.1 从未作为版本发布**：git 侧只有 `v1.0.1-rc.1` 标签（Release 已删除），Docker、fnOS fpk、standalone 三个渠道也从无 1.0.1 —— 以下内容对这些用户而言是随 **v1.0.2** 首次到达的。
>
> 唯一的例外是 npm：`10router-cli@1.0.1` 确实发布过，包含本节内容，但**不含** v1.0.2 修复的更新检查指向问题。该版本已由 `@techysy/10router` 取代。

## 安全修复（MITM）

以下四项均为上游 9Router 继承代码中的问题。MITM 默认关闭，未启用过的用户不受影响。

- **MITM 转发上游时不校验 TLS 证书**：ALPN 探测、HTTP/2 与 HTTP/1.1 三条转发路径均设置了 `rejectUnauthorized: false`，加之固定使用单一公共 DNS 解析真实 IP，一旦 DNS 应答被投毒或链路上存在中间人，刚刚解密出的上游 OAuth 令牌会被原样转发给攻击者。三处均已恢复校验。
  - 关闭校验本无必要：三处原本就传了 `servername`，Node 按该主机名（而非所连 IP）校验证书，因此按 IP 直连不受影响。同仓库 `open-sse/utils/proxyFetch.js` 的 `createBypassRequest()` 做的是同一件事，且一直保持校验开启。
  - 已实测 `TOOL_HOSTS` 中各上游：githubcopilot、cursor、kiro 及两个 AWS 端点均校验通过并正常协商 h2；故意传入错误 servername 会以 `ERR_TLS_CERT_ALTNAME_INVALID` 拒绝。
- **根证书私钥权限收紧至 0600**：`rootCA.key` 此前以默认权限（0644）写入，本机任何用户可读；持有该私钥即可为任意域名签发受本机信任的证书。现以 0600 写入、`mitm` 目录以 0700 创建，且旧版本遗留的私钥会在下次启动时自动修复权限（Windows 由 ACL 管理，不适用）。
- **不再盲目杀掉占用 443 端口的进程**：MITM 启动时会 SIGKILL 掉任何监听 443 的进程，足以静默杀死本机正在运行的正常 HTTPS 服务，并且绕过了 `manager.js` 已经向用户征得的确认。现在仅回收自身残留实例（依据 `.mitm.pid`，或比对进程命令行），占用者无法识别时中止启动，并给出进程名与处理方式。
- **自动清理异常退出遗留的 hosts 条目**：清理钩子仅挂在 SIGTERM/SIGINT 上，SIGKILL、崩溃或断电后，被劫持的工具域名会持续指向 127.0.0.1 而无人监听，导致 Copilot/Cursor/Kiro 报出难以理解的错误，且此前没有任何机制会恢复。现在应用启动时会清理「当前不应生效」的残留条目（MITM 已关闭，或该工具 DNS 开关为关），正在运行的实例不受影响。
  - 检测为一次只读 hosts 读取，无残留时零开销，不会在每次启动触发 sudo 或 UAC 提示；确有残留但无提权时，会明确打印被搁浅的域名及处理方式，而非静默跳过。

## 功能更新

- **已禁用供应商排到最后**：Profile 设置页新增开关，开启后已禁用的供应商在列表中沉底，避免常用项被挤下去；Providers 页新增对应设置卡片。该排序同时覆盖 API Key 与免费商家分区。
- **CommandCode 接入标准化 JSON 模型目录**：新增 `providers/commandcode.json`（62 个模型，含能力字段），并在注册表接入 Fetch Models。
- **桌面侧边栏可折叠**：侧边栏支持收起，窄屏与专注场景下让出横向空间。
- **配额行批量显示/隐藏**：配额面板新增批量可见性按钮，不必再逐行开关；免费商家在拓扑图中以虚线连接区分。
- **OpenCode Go 配额用量接入**：通过 `opencode.ai/zen/go/v1/usage` 读取用量，并支持 rolling / weekly / monthly 三种窗口的扁平结构解析；模型列表亦可经 Fetch Models 实时拉取。
- **模型 JSON 目录改为 provider 独立存储**：目录不再混入 `customModels`，改为按 provider 保存并带 enabled/disabled 状态；JSON 拉取到的新模型默认禁用，需手动启用。全局开关持久化到数据库（原为 localStorage），关闭时回退到内置静态目录。
- **模型目录 Gitee 镜像回退**：`fallbackModelsJsonUrl` 提供 Gitee 镜像以加速国内拉取；主源改用 GitHub API URL，避免 raw CDN 的缓存延迟。

## Bug Fixes

- **修复 /v1/models 返回孤儿自定义模型**：从旧 9router 数据库导入后，`kv` 表里残留了大量引用已删除自定义节点（providerNodes）的 customModels，导致 `/v1/models` 对每个客户端（如 dsh、CLI 工具）返回成百上千个无效模型。
  - `/v1/models` 现在会过滤掉 `providerAlias` 指向不存在节点、或节点连接已停用的孤儿模型（保留内置 provider 与现存激活节点下的模型）。
  - 删除自定义节点时，同步清理其下的 customModels，避免再次产生孤儿。
- **自定义节点前缀唯一性检测**：创建/编辑自定义供应商节点时，若 prefix 与内置 provider 的 id/alias 冲突、或与其他自定义节点的 prefix 重复，将拒绝并返回明确错误（前端同步显示提示），避免模型路由歧义。
- **修复 CodeBuddy 执行器误删 Agent system prompt**：原逻辑把超过 2000 字符或命中宽松 agent 正则的 system prompt 整段替换为中性文本，导致自家 Agent（Hermes/10Router）每次开新会话失忆。现加入自家 Agent 白名单（原样放行）、去掉长度一刀切，仅替换真正的外部 agent 签名以通过上游内容过滤。
- **新增「从 GitHub JSON 获取模型」通用能力**：provider 可在注册表声明 `modelsJsonUrl`，详情页出现"Fetch Models"按钮，拉取该 JSON 并**替换**该 provider 的 customModels（新增 JSON 中的模型、清理已过时/不在 JSON 中的模型）。配套在设置页新增全局开关控制该功能（默认关闭）。目前已接入：CodeBuddy CN / Intl、OpenCode Go、CommandCode（对应 `providers/*.json`）。目录本身也同步更新：CodeBuddy CN/Intl 补充 vision/reasoning/context 能力字段，并新增 `hy4-preview` 模型。
- **Disable All / Active All 改为操作 JSON 目录的 enabled 标志**：此前这两个批量按钮不作用于通过 JSON 目录导入的模型，点击后界面状态与实际启用情况不一致。现改为对 JSON 目录发起批量 PUT（`all: true`），批量启停与单个模型开关走同一份状态。
- **侧边栏版本号不再硬编码**：`APP_CONFIG.version` 此前写死 `1.0.0`，装上 1.0.1 后侧边栏仍显示 1.0.0。改为读取 `package.json` 中的版本号。
- **配额零余额判定与「已耗尽」语义**：余额为绝对零值时才判为耗尽，避免误判；配额行的隐藏状态在多处视图间同步，筛选条件改为持久化保存，刷新后不再重置。批量按钮补齐 i18n，空状态下也提供操作入口。
- **自定义供应商 prefix 大小写不敏感**：prefix 校验改为大小写不敏感并统一归一化为小写，避免 `Foo` 与 `foo` 被视为两个前缀而产生路由歧义。
- **JSON 目录 provider 的过时静态模型可见**：内置静态目录中已不在 JSON 里的模型，会显示在「已禁用模型」中而不是直接消失，便于确认哪些模型被目录更新淘汰。

## 工程与打包

- **移除 `better-sqlite3` 依赖声明（不影响任何已部署实例）**：该包从未真正生效过 —— npm ≥11 默认拦截 install 脚本，作为 `optionalDependency` 它会被整包跳过；即便装上，Next 的 output tracing 也只拷贝其 `lib/*.js`，从不带 `.node` 原生二进制。实测确认 Docker 镜像、fnOS fpk、standalone 包三者**一直都跑在 `node:sqlite` 上**。
  - 数据完全兼容，无需任何用户操作：两者同为 SQLite 3.53.x，四个适配器共用同一份 `PRAGMA_SQL` 并都执行 WAL checkpoint，现存 `data.sqlite` 直接打开即可。
  - `src/lib/db/driver.js` 仍保留 better-sqlite3 探测与适配器 —— npm CLI 用户由 `cli/hooks/sqliteRuntime.js` 装到 `~/.10router/runtime`（自带版本号，与根 `package.json` 无关），那条链路不受影响。
  - 顺带消除了「实际生效的驱动取决于 npm 版本」这一不确定性。

- 🆕 **新增 npm 分发渠道**：CLI 已发布至 npm，`npm i -g 10router-cli` 即可安装，可执行命令为 `10router`。此前分发仅有 Docker / fnOS fpk / Standalone 三种。
- ⚠️ **修正更新检查指向错误的包**：仪表盘的版本检查、「立即更新」拉起的 npx 命令、侧边栏展示的安装命令，以及独立 updater 的兜底包名，此前全部写的是 `10router` —— 而该名字在 npm 上属于一个无关的 fork（停在 0.6.0）。这意味着一旦该 fork 发布更高版本号，仪表盘就会提示用户去安装他人的包。现已全部指向 `10router-cli`，并让 `/api/version` 复用 `UPDATER_CONFIG.npmPackageName`，消除此前导致该问题的重复常量。
- ⚠️ **CLI npm 包名定为 `10router-cli`**：原定的 `10router` 已被第三方 fork 占用（npm 上停在 0.6.0），v1.0.0 更新日志中「npm 包名更新为 `10router`」一句就此作废。安装命令为 `npm i -g 10router-cli`，可执行命令仍是 `10router`，CLI 版本同步至 1.0.1。
- **CLI README 去除上游残留品牌**：`cli/README.md` 会作为 npm 包详情页展示，但其中的 npm/Docker/GHCR/License/Trendshift 徽章与文档链接仍全部指向上游 `decolua/10router`，会在本包页面上展示他人的版本号、下载量与仓库。现已改为本项目的 `10router-cli` 与 `techysy/10router`，移除 Docker Hub 与 Trendshift 徽章（本项目仅发布 GHCR 镜像），并在致谢中补上对上游 9Router 的署名。
- fnOS 打包 manifest 版本改为从 `package.json` 自动同步（`prebuild:fpk`），并在打包 README 中说明；manifest 对齐 1.0.1。
- 设置页卡片图标容器统一为方形 `size-10`（原为 `p-2` 矩形），并修正 Providers 卡片引用了字体中不存在的图标字形。

# v1.0.0 (2026-08-26)

## ⚠️ Breaking Changes

1. **数据目录改名**：默认数据目录从 `~/.9router/` 变为 `~/.10router/`（Windows: `%APPDATA%\10router`）。启动时若检测到旧目录存在且新目录为空，会自动一次性拷贝迁移（旧目录保留不删除）。显式设置 `DATA_DIR` 的环境不受影响。
2. **SAML entityID 变更**：默认 issuer 从 `urn:9router:sp` 改为 `urn:10router:sp`。已在 IdP 侧注册过 9Router SP 的用户升级后需在 IdP 重新注册新的 entityID，否则 SSO 登录中断。可在设置中手动改回旧值。
3. **MITM CA 更名**：MITM 代理的 CA 证书随数据目录更名重新生成，已在设备端信任旧 CA 的需重新信任新 CA。
4. **grok config marker 改名**：`config.toml` 中 `# 9router-prev-default` 记录不再被识别，升级后"上一个默认模型"记录丢失一次（仅一次，之后正常记录）。

## 品牌重塑
- **Rebrand**: 9Router → 10Router，版本号统一 1.0.0
- 全局替换 UI 文案、标题、landing page、元数据
- 品牌区显示 `10Router` + `v1.0.0`
- npm 包名更新为 `10router`
- 更新日志数据源改为 `github.com/techysy/10router`

## 分发渠道

### Docker 镜像
- GitHub Actions 自动构建 multi-platform (amd64 + arm64)
- 镜像：`ghcr.io/techysy/10router:latest`
- 快速启动：`docker run -d --name 10router -p 20128:20128 -v ~/.10router:/app/data ghcr.io/techysy/10router:latest`

### fnOS fpk 打包
- Matrix 构建 x86 + arm 双架构
- 每架构提供 url + iframe 双版本（共 4 个 fpk）
- 文件名格式：`10router-1.0.0-{arch}.fpk` / `10router-1.0.0-iframe-{arch}.fpk`
- 安装依赖：nodejs_v24

### Standalone Server
- 无 Docker 环境的裸机部署包
- 包含 standalone 构建产物 + custom-server.js + node-forge
- 启动：`node custom-server.js --port 20128`

## CI/CD
- `docker-publish.yml`：tag 触发 → multi-platform Docker 镜像推送 GHCR
- `build-fpk.yml`：matrix 构建 x86/arm → 双版本 fpk → 统一 Release 上传
- `build-server.yml`：standalone tar.gz 构建 → Release 资产
- CI Node 22 → 24，对齐 fnOS `nodejs_v24` 运行时；fnpack 1.2.1 固定 sha256 校验和

## 功能更新

### i18n
- 区域货币显示支持（en/pt-BR/pt-PT/es/de）
- 区分 CNY（全角 ￥）和 JPY（半角 ¥）
- Profile 页面货币切换开关
- 中文翻译更新

### Providers
- 免费商家拓扑开关关闭时增加卡片视觉反馈
- 按连接隔离配额行可见性
- 提供商拓扑画布开关

### Usage
- 使用量页面升级上游结构，恢复表格筛选器与周期过滤
- 修复 ProviderTopology 数据源，使用活跃连接列表替代 byModel
- 恢复 ProviderTopology 渲染到 Usage Overview 页面

### Auth
- 登录 cookie Secure 标志按请求协议动态判断
- 多跳反向代理下按 `x-forwarded-proto` 的第一跳判断协议，避免链路中后续跳把协议改写导致 cookie 标志判断错误

### Bug Fixes
- 免费商家禁用文案 i18n 修复
- /v1/models 接口 noAuth 自定义模型遗漏修复
- 健康但无连接的数据库不 dump 完整内置目录
- 修复使用量页面无数据（SQLite 层统一）
- 重新导出 SQLite-layer request/usage APIs 通过 usageDb shim
- /v1/models 过滤已禁用的孤儿自定义模型

## 工程清理
- 移除上游 9Remote/9English 广告入口
- 移除 NineRemoteButton.js、NineRemotePromoModal.js 组件
- 移除 Sidebar 中 9Remote/9English 导航项
- 移除上游 DockerHub 发布和 GitBook 文档站点
- 清理开发 artifacts（workbuddy memory、npm 残留文件）
- fnOS fpk 打包并入主仓库（fnos-packaging/）
- README 重写为 10Router 版
- 捐赠入口改为本地 donate.json（GitHub Sponsors + 微信 + 支付宝）

## 文档
- 修复 contributor 链接
- 更新章节标题，替换上游引用
- 更新 README 图片
