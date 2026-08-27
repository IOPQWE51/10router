# v1.0.1 (2026-08-27)

## Bug Fixes

- **修复 /v1/models 返回孤儿自定义模型**：从旧 9router 数据库导入后，`kv` 表里残留了大量引用已删除自定义节点（providerNodes）的 customModels，导致 `/v1/models` 对每个客户端（如 dsh、CLI 工具）返回成百上千个无效模型。
  - `/v1/models` 现在会过滤掉 `providerAlias` 指向不存在节点、或节点连接已停用的孤儿模型（保留内置 provider 与现存激活节点下的模型）。
  - 删除自定义节点时，同步清理其下的 customModels，避免再次产生孤儿。
- **自定义节点前缀唯一性检测**：创建/编辑自定义供应商节点时，若 prefix 与内置 provider 的 id/alias 冲突、或与其他自定义节点的 prefix 重复，将拒绝并返回明确错误（前端同步显示提示），避免模型路由歧义。
- **修复 CodeBuddy 执行器误删 Agent system prompt**：原逻辑把超过 2000 字符或命中宽松 agent 正则的 system prompt 整段替换为中性文本，导致自家 Agent（Hermes/10Router）每次开新会话失忆。现加入自家 Agent 白名单（原样放行）、去掉长度一刀切，仅替换真正的外部 agent 签名以通过上游内容过滤。
- **新增「从 GitHub JSON 获取模型」通用能力**：provider 可在注册表声明 `modelsJsonUrl`，详情页出现"Fetch Models"按钮，拉取该 JSON 并合并新模型到 customModels（不依赖官方模型 API、无需发版）。配套在设置页（Language 卡片）新增全局开关控制该功能。首个接入：CodeBuddy CN / Intl（`providers/codebuddy-cn.json`、`providers/codebuddy-intl.json`）。

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
