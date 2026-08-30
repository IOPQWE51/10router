# 本地 npm 打包与发布指南

> 面向维护者。适用包名 **`@techysy/10router`**（npm 上的 `10router` 属于无关 fork，勿混淆）。

## 前置条件

- **Node 24**（仓库根有 `.nvmrc`，`nvm use` 即可）。
- npm 凭据：`~/.npmrc` 需含 `//registry.npmjs.org/:_authToken=<token>`。
  注意本机默认 registry 常是 `registry.npmjs.org` 之外的镜像（如 npmmirror），
  **镜像源不能发布**，所有 publish 命令必须显式 `--registry https://registry.npmjs.org`。
  验证登录态：

  ```bash
  npm whoami --registry https://registry.npmjs.org   # 应输出 yu_shiyang
  ```

## 构建流程

```bash
cd cli
npm run build          # 完整构建（见下述 9 步）
npm run pack:cli       # 构建 + 出包，tgz 落在仓库根目录
```

`scripts/build-cli.js` 依次执行：

1. 同步 `app/package.json` 版本号（以 `cli/package.json` 为准）；
2. `next build` 产出 standalone（构建期 `HOME` 指向系统临时目录，**脱离 tracing root**，构建机密钥不会被打进产物）；
3. 拷贝 standalone / custom-server / sql.js 兜底 / 静态资源 / public / vendor chunks / MITM 文件 / updater 到 `cli/app`；
4. **Step 9 安全门禁（`assertNoSensitiveArtifacts`）**：全量扫描 `jwt-secret` / `machine-id` / `data.sqlite*` / `.build-home`，命中任一立即拒绝出包。这是防"构建机密随 tarball 泄漏"的最后防线，不要绕过。

## 出包后自检（发布前必做）

```bash
npm pack --dry-run                     # 体积与文件数合理（约 3200+ 文件）
npm pack                               # 真实出包 techysy-10router-<版本>.tgz
tar -tf techysy-10router-*.tgz | grep -E "jwt-secret|machine-id|data.sqlite|\.build-home"
# ↑ 上一条必须无任何输出；有输出 = 门禁被绕过，立即停下排查
```

本机试装验证（不影响正式发布）：

```bash
npm i -g ./techysy-10router-<版本>.tgz
10router --help        # 命令名应为 10router
npm rm -g @techysy/10router
```

## 发布

```bash
npm run publish:cli    # = 构建 + npm publish --registry https://registry.npmjs.org
```

- `publishConfig.access: "public"` 已在 `package.json` 配好（scoped 包必需），无需再传 `--access public`。
- **npm 的 `name@version` 永久不可重用**（unpublish 也找不回），发布前确认 `cli/package.json` 版本号无误。
- 发布后核对：`npm view @techysy/10router version --registry https://registry.npmjs.org`，以及仪表盘「检查更新」能否看到新版本。

## 与其余渠道的联动

npm 只是四个渠道之一，其余三个由 **git tag `v<版本>`** 触发 GitHub Actions 构建：

| 渠道 | 触发 | 产物 |
|---|---|---|
| npm CLI | 手动 `npm run publish:cli`（cli 版本独立管理） | npm tarball |
| Docker | push tag `v*` | `ghcr.io/techysy/10router:<版本>`（amd64+arm64） |
| fnOS fpk | push tag `v*` | Releases 附件 `.fpk` |
| standalone | push tag `v*` | Releases 附件 `10router-server.tar.gz` |

发布清单（按序）：更新 `CHANGELOG.md` → 推 main → `cd cli && npm run publish:cli` → `git tag v<版本> && git push origin v<版本>` → 检查 Actions 三个 workflow 全绿 → Releases 页核对附件。

> ⚠️ tag 触发的三个构建 workflow **不跑测试门禁**，测试必须在推送前本地确认（见仓库根 CLAUDE.md 的验证流程）。
