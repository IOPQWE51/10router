# CodeBuddy CN (codebuddy-cn) 账号批量导入

本文记录 10Router 中 **codebuddy-cn**（腾讯 CodeBuddy CN 网关，`copilot.tencent.com`）OAuth
账号凭据的**批量导入 / 更新**机制：把从账号切换工具 / CLI 导出的 JSON 凭据（access_token +
refresh_token 对）批量注册为可路由连接。含产品入口、后端 API、手动做法与验证。

> 安全提示：本文所有示例均为脱敏占位符。真实 token、手机号、uid 一律不得写入文档 / 日志 /
> 提交信息。

---

## 背景：codebuddy-cn 与 token 来源

- provider id：`codebuddy-cn`（alias `cbcn`），`category: oauth`，网关 baseUrl
  `https://copilot.tencent.com/v2/chat/completions`。
- 官方授权走 **device-code** 流程（`src/lib/oauth/providers/codebuddy-cn.js`），由 10Router 自己
  轮询换取 token。
- 另一种来源是**账号切换工具 / CLI 的凭据导出**：一个 JSON 数组，每项含
  `access_token` / `refresh_token` / `nickname` / `domain` 等（snake_case，含完整 OAuth 对象）。

### token 的签发域（关键判断）

CodeBuddy 的 access/refresh token 是 **Keycloak JWT**，payload 里的 `iss` 即签发域。只有
**CodeBuddy CN 网关同源 realm** 签发的 token 才能被 `copilot.tencent.com` 接受：

| `iss` 前缀 | 可导入 codebuddy-cn？ | 说明 |
|---|---|---|
| `https://www.codebuddy.cn/auth/realms/copilot` | ✅ 是 | 与网关同源，可直接路由 |
| `https://copilot.tencent.com/...` | ✅ 是 | 网关自身域 |
| `https://www.workbuddy.cn/auth/realms/copilot` | ❌ 否 | 不同 Keycloak realm，网关不认 |

导入时按 `iss`（或顶层 `domain`）过滤，非 CodeBuddy CN 域一律跳过。同一个人可能在不同域名下
各有一份授权，务必只导目标网关同源的那份。

### 连接身份与去重键

每个 codebuddy-cn 连接存一个 OAuth token 对，`name` 一般是昵称。账号唯一身份是 token JWT 的
**`sub`（Keycloak uid）**。去重 / 更新时优先按 `sub` 匹配（能识别改名过的连接），其次按
`name` 匹配。同 `sub` 或同 `name` → 更新该连接；否则新建连接。

---

## 方式一：产品入口（实验开关 + 导出 / 导入按钮）

> 作为**插件式实验功能**，默认关闭。先在 Profile 的 Providers 实验区打开开关，codebuddy-cn
> 详情页才会显示 Import / Export 按钮（避免污染常规 UI）。

1. **打开开关**：`/dashboard/profile` → Providers → 打开 **"CodeBuddy CN OAuth import / export"**
   （默认关，持久化到 DB settings，跨设备生效）。
2. 进入 provider 详情页 `/dashboard/providers/codebuddy-cn`，此时 OAuth / API Key 按钮旁会显示
   **Export** 与 **Import** 两个按钮。
3. **Export**：把当前全部 codebuddy-cn 连接导出为三方(wb)格式 JSON，触发浏览器下载
   `codebuddy-cn-accounts-<date>.json`。
4. **Import**：打开弹窗，**选择 JSON 文件**（或粘贴 JSON），点 **Import All**。结果区显示
   imported / updated / skipped / failed 计数，失败项列出原因。

普通点击 OAuth 按钮仍走标准授权，与导入功能互不影响。仅 codebuddy-cn 显示这两个按钮。

### 涉及文件

- 后端导入：`src/app/api/oauth/codebuddy-cn/bulk-import/route.js`
- 后端导出：`src/app/api/oauth/codebuddy-cn/export/route.js`
- 前端弹窗：`src/app/(dashboard)/dashboard/providers/[id]/CodeBuddyImportModal.js`
- 接线：`src/app/(dashboard)/dashboard/providers/[id]/page.js`
  （读 `settings.codeBuddyOAuthImport` → `codeBuddyTransferOn` 控制按钮显隐）
- 实验开关：`src/app/(dashboard)/dashboard/profile/page.js`（key `codeBuddyOAuthImport`）
- i18n：`public/i18n/literals/zh-CN.json` / `zh-TW.json`

---

## 方式二：直接调后端 API

```bash
# 需要 dashboard session 或 CLI token 鉴权
curl -X POST http://<10router>:20127/api/oauth/codebuddy-cn/bulk-import \
  -H "Content-Type: application/json" \
  -d '{"accounts":[{"access_token":"eyJhbGci...","refresh_token":"eyJhbGci...","nickname":"<昵称>"}]}'
# → {"imported":0,"updated":1,"skipped":0,"failed":0,"results":[...]}
```

- Body 兼容：`[{...}]` 数组 / `{...}` 单对象 / `{ accounts:[...] }` 包裹。
- 每项字段（snake_case 与 camelCase 都认）：
  - `access_token` / `accessToken`（必填）
  - `refresh_token` / `refreshToken`（可选）
  - `nickname` → 连接名；`email` → 连接邮箱（可选）
  - `expiresAt`（ms / ISO）/ `expiresIn`（s）——缺省时从 token 自身 `exp` 计算
- 响应**绝不回显 token**。
- 返回：`imported`（新建数）、`updated`（更新数）、`skipped`（非 CodeBuddy 域跳过数）、`failed`、
  `results[]`（逐条 ok/error/skipped 原因）。

**导出**：

```bash
# 需要 dashboard session 或 CLI token 鉴权
curl http://<10router>:20127/api/oauth/codebuddy-cn/export
# → 返回 wb(三方) 格式的 JSON 数组，每项含 access_token/refresh_token/nickname/domain/...
# 注意：导出含真实 token，是敏感文件，妥善保存。
```

---

## 方式三：手动写库（应急/无 UI 环境）

直接改运行中 SQLite（`providerConnections` 表，`data` 为 JSON，含扁平
`accessToken/refreshToken/expiresAt/testStatus` 等字段）。适合已有 codebuddy-cn 连接、只需替换
token 的场景。**改前先整行备份**（可回滚），10Router 实时读库无需重启。

```
改前备份整行 → UPDATE data(accessToken/refreshToken/expiresAt/expiresIn) + name → 验证 hash
```

> 慎用：直接写库绕过业务去重/回滚保护，务必留备份。

---

## 验证

- **字段落库**：读回连接确认 token hash 与源 JSON 一致、`testStatus=active`、`expiresAt` 为将来。
- **token 有效性**：用新 token 直连网关发一次极小 `stream:true` 请求：
  - `HTTP 200` + 正常 SSE 内容 → 有效可用；
  - `HTTP 401/403` → token 无效 / 吊销；
  - `HTTP 400`（如 `Non-stream chat request...`）→ **认证已通过**，只是请求方式需 stream。

---

## 踩坑 / 注意

- **别只看 `localhost`**：dashboardGuard 对 loopback 有特判，验证鉴权边界应从非 loopback 测。
- **过期时间**：优先从 token `exp`（epoch 秒）算 `expiresAt`，最准；`expiresIn`(寿命) 可能被当
  epoch 误算（两者都可能是秒级）。见 route 中判定逻辑（`< 1e8` 视为寿命）。
- **同 sub 更新 vs 新建**：改名过的连接靠 `sub` 仍能命中，别只按 `name`。
- 文档新增技术文件走 `docs/` 需 `git add -f`（被 `.gitignore` 忽略）。
