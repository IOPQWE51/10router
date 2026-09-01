# SQLite 驱动链与 better-sqlite3 定位

> 相关文件：`src/lib/db/driver.js`、`src/lib/db/adapters/*`、`package.json`
> 反复踩坑点：CHANGELOG v1.0.2 曾两次描述不一致，本文档为最终准确版本。

## 驱动选择链

`driver.js` 按运行时顺序尝试，取第一个成功者：

| 优先级 | 驱动 | 运行时 | 说明 |
|--------|------|--------|------|
| 1 | `bun:sqlite` | Bun | 仅 Bun，内置，无安装 |
| 2 | `better-sqlite3` | Node | 原生模块，**构建期必需** |
| 3 | `node:sqlite` | Node ≥ 22.5 | **内置**，无安装，实际部署几乎都用它 |
| 4 | `sql.js` | 任何 | 纯 JS（wasm），万能兜底 |

- **Bun**：`bun:sqlite → sql.js`（跳过 better/node，两者 Bun 下不可用）
- **Node**：`better-sqlite3 → node:sqlite(≥22.5) → sql.js`

启动日志会打印实际选中的驱动：`[DB] Driver: node:sqlite | file: ...`

## 核心坑：better-sqlite3「构建期必需、运行时几乎不用」

这是最容易困惑、也最常被误改的点：

**为什么运行时几乎不用它**：
- npm ≥ 11 默认拦截 install 脚本，`better-sqlite3` 作为 `optionalDependency` 会被整包跳过
- 即便装上，Next 的 output tracing 只拷贝其 `lib/*.js`，**从不带 `.node` 原生二进制**
- 因此 Docker / fnOS fpk / standalone 三种产物**实际都落在 `node:sqlite`**

**为什么构建期又必须保留它**（删了会 `next build` 报 `Module not found`）：
- `src/lib/db/adapters/betterSqliteAdapter.js` 是**静态 import** `better-sqlite3`
- `src/app/api/oauth/cursor/auto-import/route.js` 也 `require` 它
- webpack 必须在构建时能解析该模块

**结论**：`better-sqlite3` 在 `package.json` 中**必须保留**（构建期必需），但**不要指望它运行时被加载**（依赖链已保证优雅回退到 node:sqlite）。曾尝试移除导致 `next build` 中断，已恢复并注明"请勿删除"。

## 数据兼容性

所有适配器共用同一份 `PRAGMA_SQL` 并都执行 WAL checkpoint，数据完全兼容：

- 同为 SQLite 3.53.x
- 现存 `data.sqlite` 直接用任意驱动打开
- 切换驱动**无需用户操作、无数据迁移**

## npm CLI 用户的特殊路径

npm 安装的用户由 `cli/hooks/sqliteRuntime.js` 把 better-sqlite3 装到 `~/.10router/runtime`（自带版本号，与根 `package.json` 无关）——**这条链路是唯一真正用上 better-sqlite3 的场景**。

## 新增驱动时注意

- `driver.js` 的 `tryXxx()` 必须**动态 import** 适配器（否则在 driver 不可用的运行时静态 import 会崩）
- 每个 `try` 都要 try/catch 回退，任一失败不得中断
- 新增写入点时记得打 `usageKey`（见 [usageKey 契约](./usage-usageKey-contract.md)）
