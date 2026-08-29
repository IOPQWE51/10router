# v1.0.1 (2026-08-27)

## 安全修复（MITM）

以下四项均为上游 9Router 继承代码中的问题。MITM 默认关闭，未启用过的用户不受影响。

- **MITM 转发上游时不校验 TLS 证书**：ALPN 探测、HTTP/2 与 HTTP/1.1 三条转发路径均设置了 `rejectUnauthorized: false`，加之固定使用单一公共 DNS 解析真实 IP，一旦 DNS 应答被投毒或链路上存在中间人，刚刚解密出的上游 OAuth 令牌会被原样转发给攻击者。三处均已恢复校验。
  - 关闭校验本无必要：三处原本就传了 `servername`，Node 按该主机名（而非所连 IP）校验证书，因此按 IP 直连不受影响。同仓库 `open-sse/utils/proxyFetch.js` 的 `createBypassRequest()` 做的是同一件事，且一直保持校验开启。
  - 已实测 `TOOL_HOSTS` 中各上游：githubcopilot、cursor、kiro 及两个 AWS 端点均校验通过并正常协商 h2；故意传入错误 servername 会以 `ERR_TLS_CERT_ALTNAME_INVALID` 拒绝。
- **根证书私钥权限收紧至 0600**：`rootCA.key` 此前以默认权限（0644）写入，本机任何用户可读；持有该私钥即可为任意域名签发受本机信任的证书。现以 0600 写入、`mitm` 目录以 0700 创建，且旧版本遗留的私钥会在下次启动时自动修复权限（Windows 由 ACL 管理，不适用）。
- **不再盲目杀掉占用 443 端口的进程**：MITM 启动时会 SIGKILL 掉任何监听 443 的进程，足以静默杀死本机正在运行的正常 HTTPS 服务，并且绕过了 `manager.js` 已经向用户征得的确认。现在仅回收自身残留实例（依据 `.mitm.pid`，或比对进程命令行），占用者无法识别时中止启动，并给出进程名与处理方式。
- **自动清理异常退出遗留的 hosts 条目**：清理钩子仅挂在 SIGTERM/SIGINT 上，SIGKILL、崩溃或断电后，被劫持的工具域名会持续指向 127.0.0.1 而无人监听，导致 Copilot/Cursor/Kiro 报出难以理解的错误，且此前没有任何机制会恢复。现在应用启动时会清理「当前不应生效」的残留条目（MITM 已关闭，或该工具 DNS 开关为关），正在运行的实例不受影响。
  - 检测为一次只读 hosts 读取，无残留时零开销，不会在每次启动触发 sudo 或 UAC 提示；确有残留但无提权时，会明确打印被搁浅的域名及处理方式，而非静默跳过。

## Bug Fixes

- **修复 /v1/models 返回孤儿自定义模型**：从旧 9router 数据库导入后，`kv` 表里残留了大量引用已删除自定义节点（providerNodes）的 customModels，导致 `/v1/models` 对每个客户端（如 dsh、CLI 工具）返回成百上千个无效模型。
  - `/v1/models` 现在会过滤掉 `providerAlias` 指向不存在节点、或节点连接已停用的孤儿模型（保留内置 provider 与现存激活节点下的模型）。
  - 删除自定义节点时，同步清理其下的 customModels，避免再次产生孤儿。
- **自定义节点前缀唯一性检测**：创建/编辑自定义供应商节点时，若 prefix 与内置 provider 的 id/alias 冲突、或与其他自定义节点的 prefix 重复，将拒绝并返回明确错误（前端同步显示提示），避免模型路由歧义。
- **修复 CodeBuddy 执行器误删 Agent system prompt**：原逻辑把超过 2000 字符或命中宽松 agent 正则的 system prompt 整段替换为中性文本，导致自家 Agent（Hermes/10Router）每次开新会话失忆。现加入自家 Agent 白名单（原样放行）、去掉长度一刀切，仅替换真正的外部 agent 签名以通过上游内容过滤。
- **新增「从 GitHub JSON 获取模型」通用能力**：provider 可在注册表声明 `modelsJsonUrl`，详情页出现"Fetch Models"按钮，拉取该 JSON 并**替换**该 provider 的 customModels（新增 JSON 中的模型、清理已过时/不在 JSON 中的模型）。配套在设置页新增全局开关控制该功能（默认关闭）。首个接入：CodeBuddy CN / Intl（`providers/codebuddy-cn.json`、`providers/codebuddy-intl.json`）。

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

### Bug Fixes
- 免费商家禁用文案 i18n 修复
- /v1/models 接口 noAuth 自定义模型遗漏修复
- 健康但无连接的数据库不 dump 完整内置目录
- 修复使用量页面无数据（SQLite 层统一）
- 重新导出 SQLite-layer request/usage APIs 通过 usageDb shim

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
