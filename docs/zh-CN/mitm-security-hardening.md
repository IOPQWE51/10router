# MITM 代理安全加固

> 修复日期：2026-08-29 · 引入版本：v1.0.1（随 v1.0.2 交付）
> 相关文件：`src/mitm/server.js`、`src/mitm/manager.js`、`src/mitm/cert/rootCA.js`

## 概述

10Router 的 MITM（中间人）代理用于劫持工具域名（Copilot/Cursor/Kiro 等）到本机以注入凭据。它默认关闭，未启用的用户不受影响。v1.0.1 针对上游 9Router 继承代码中的**四个安全问题**做了加固。

> ⚠️ MITM 默认关闭。以下安全项只对启用 MITM 的场景有意义。

## 1. 转发上游不校验 TLS 证书（严重）

**问题**：ALPN 探测、HTTP/2、HTTP/1.1 三条转发路径均设 `rejectUnauthorized: false`，且固定用单一公共 DNS 解析真实 IP。一旦 DNS 被投毒或链路存在中间人，刚解密出的上游 OAuth 令牌会被原样转发给攻击者。

**修复**：三处全部恢复证书校验。

**关键点**：恢复校验本无副作用——三处原本就传了 `servername`，Node 按该**主机名**（而非所连 IP）校验证书，因此按 IP 直连不受影响。已实测各上游（githubcopilot、cursor、kiro、AWS）均校验通过并正常协商 h2；故意传错 servername 会以 `ERR_TLS_CERT_ALTNAME_INVALID` 拒绝。

```js
// server.js — 恢复 rejectUnauthorized，凭 servername 校验
{ host: targetIP, port: 443, servername: targetHost, rejectUnauthorized: true }
```

## 2. 根证书私钥权限（0600）

**问题**：`rootCA.key` 以默认权限（0644）写入，本机任何用户可读。持有该私钥即可为**任意域名**签发受本机信任的证书。

**修复**（`cert/rootCA.js`）：
- `MITM_DIR` 目录以 `0700` 创建
- `rootCA.key` 以 `0600` 写入（`writeFileSync` mode + 启动时 `chmodSync` 兜底修复旧版本遗留）
- Windows 由 ACL 管理，不适用

```js
fs.mkdirSync(MITM_DIR, { recursive: true, mode: 0o700 });
fs.writeFileSync(ROOT_CA_KEY_PATH, privateKeyPem, { mode: 0o600 });
```

## 3. 不再盲目杀掉 443 端口进程

**问题**：MITM 启动时 SIGKILL 任何监听 443 的进程，足以静默杀死本机正在运行的正常 HTTPS 服务，且绕过 `manager.js` 已向用户征得的确认。

**修复**（`server.js` / `manager.js`）：
- 仅回收**自身残留实例**（依据 `.mitm.pid`，或比对进程命令行）
- 占用者无法识别时**中止启动**，给出进程名与处理方式
- 提示用户自行停止，或显式在 dashboard 开启 force-kill

```js
// 无法识别占用者时中止而非盲杀
`Refusing to kill it — stop that service yourself, or enable force-kill for port 443 in the dashboard.`
```

## 4. 自动清理异常退出遗留的 hosts 条目

**问题**：清理钩子只挂在 SIGTERM/SIGINT。SIGKILL、崩溃、断电后，被劫持的工具域名持续指向 127.0.0.1 而无人监听，导致工具报出难以理解的错误，且此前无机制恢复。

**修复**（`manager.js`）：
- 应用启动时清理「当前不应生效」的残留 hosts 条目（MITM 已关闭，或该工具 DNS 开关为关）
- 检测为**一次只读 hosts 读取**，无残留时零开销，不触发 sudo/UAC
- 确有残留但无提权时，明确打印被搁浅的域名及处理方式，而非静默跳过

## 相关注意事项

1. 同仓库 `open-sse/utils/proxyFetch.js` 的 `createBypassRequest()` 做同类转发，且一直保持校验开启。
2. 这四项均为**上游 9Router 继承代码**中的问题，10Router 侧在 v1.0.1 一并修复。
3. 根证书私钥 `rootCA.key` 一旦泄露，需**重新生成 CA** 并让设备重新信任，仅改权限不能消除已泄露的影响。
