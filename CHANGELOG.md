# v1.0.0 (2026-08-26)

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
- 快速启动：`docker run -d --name 10router -p 20128:20128 -v ~/.9router:/app/data ghcr.io/techysy/10router:latest`

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
- 移除上游 DockerHub 发布和 GitBook 文档站点
- 清理开发 artifacts（workbuddy memory、npm 残留文件）
- fnOS fpk 打包并入主仓库（fnos-packaging/）
- README 重写为 10Router 版

## 文档
- 修复 contributor 链接
- 更新章节标题，替换上游引用
- 更新 README 图片
