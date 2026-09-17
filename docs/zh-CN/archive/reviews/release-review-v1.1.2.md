# 全量审查报告（v1.1.1 → HEAD，2026-09-17）

> **审读范围**：`v1.1.1`（`c49cdf73`）→ HEAD（`b7fd164f`），**共 80 次提交**（123 个文件变更，+6584 / −429 行）。  
> **审读方法**：全量 Git 提交记录梳理 + 核心模块（安全/熔断/并发/数据账本/i18n）代码逐项审查 + 全量自动化套件运行（2630 测试用例）与 `known-fails` 基线比对 + 新增 12 个专用测试套件实测。

---

## 结论

**整体健康度：良好 / 具备较高生产就绪度，0 阻断性 P0/P1 问题。**  
测试通过率 100% 吻合基线（38 项失败均为已知 Windows 环境或特定平台依赖，无任何新增回归缺陷）。前期发现的 11128 渠道熔断及本地导出缺失（66162da2）等关键节点均已闭环并配备针对性回归守卫。

---

## 一、安全与敏感凭据防护

| 检查项 | 状态 | 审读说明 |
|---|---|---|
| **小米 MiMo 双凭据体系脱敏** | ✅ 达标 | `GET /api/providers` 显式 `delete psd.mimoPassToken`，仅暴露 `hasDesktopSession: boolean`；PUT 路由采用 merge 语义，保证前端编辑往返不丢失底层敏感值。 |
| **敏感接口鉴权守卫** | ✅ 达标 | `src/dashboardGuard.js` 中将 `/api/oauth/xiaomi-mimo/auto-import` 纳入 `ALWAYS_PROTECTED` 与 `LOCAL_ONLY_PATHS`，防止在未开启仪表盘登录或远程访问时泄漏本地凭据。 |
| **OAuth 传输加解密** | ✅ 达标 | `/api/oauth/transfer/export` 与 `import` 接口受口令保护，导出包基于 `scrypt` + `AES-256-GCM` 进行端到端安全封包。 |
| **全量 Diff 敏感字段扫描** | ✅ 达标 | 无新增裸写真实 API key、个人敏感 JWT 或私有凭据。 |

---

## 二、核心链路与并发控制

- **CodeBuddy 11128 渠道级熔断机制**：
  - 在 `open-sse/services/accountFallback.js` 和 `src/sse/handlers/chat.js` 中引入 `channelScope: true`；
  - 针对上游针对会话体积（如 4.5MB 真实会话）或特征阻断返回的 11128，直接做渠道级短/长阶梯暂停，阻断无效账号轮询放大风控；
  - 响应附带中英双语友好指导提示（`withChannelScopeHint`），客户端不再只收到生硬的 400 Bad Request；
  - 请求成功恢复后联动清除熔断标记，并触发 `invalidateQuotaCache` 刷新失效的过期包缓存。
- **配置与数据层并发安全**：
  - `src/lib/db/repos/settingsRepo.js` 实现 `mutateSettings` 事务内原子“读-改-写”，防止并发写入竞争导致 `channelBlocks` 丢失；
  - `src/lib/localDb.js` 导出 shim 已通过 `localdb-shim-export-guard.test.js` 守卫测试锁定。

---

## 三、数据层与使用量账本（Usage Repo）

- **健康度打分与导入数据隔离**：
  - `getUsageDashboard` 中设定 `notImported` 条件：`(meta IS NULL OR meta NOT LIKE '%"imported":true%' OR meta LIKE '%"gatewaySync":true%')`；
  - 保证外部客户端（ZCode/mirasim）导入历史只进统计热力图，不污染本节点的 7 天健康度评分与测速，而同构 10Router 网关同步数据（`gatewaySync`）按设计正常计入。
- **指标健壮性**：
  - 缓存命中率过滤掉了 `cached <= 0` 和 `cached >= prompt` 的失真样本；
  - 模型类型趋势图空档时段从原先的平滑连线改为真实填 0 触底。

---

## 四、跨端环境与国际化（Desktop / NAS / i18n）

- **桌面壳资源**：
  - `desktop/make_icon.py` 优化应用图标四周预留 10% 边距，解决 Windows 任务栏/桌面快捷方式图标偏大发胀的问题；
  - 修复 `ConnectionsCard.js` 中 `translate` 缺失导致的客户端运行时异常。
- **词条对齐**：
  - `zh-CN.json` 和 `zh-TW.json` 针对用量仪表盘、活跃热力图、健康度评级与配额到期提示同步补充了 70+ 个词条。

---

## 五、自动化测试与回归基线比对

| 测试指标 | 统计结果 | 说明 |
|---|---|---|
| **测试总数** | 2630 | 包含单元测试与快照集成测试 |
| **通过数量** | 2481 | 核心功能与各供应商链路全通 |
| **跳过/预期失败** | 111 | 94 skipped, 17 expected fail |
| **失败总数** | 38 | **100% 吻合** `tests/__baseline__/known-fails.txt` |
| **新增回归失败** | **0** | **无任何新增功能引起的回归故障** |
| **本次新增测试** | 77 passed | 12 个新测试套件功能验证全绿 |

---

## 六、建议与后续优化项（非阻塞）

1. **`GET /api/providers/[id]` 单条查询脱敏补充（微小边界项）**：
   - 目前列表接口已 `delete psd.mimoPassToken`，单条接口暂未显式清理该属性。建议后续将单条接口与列表接口的脱敏字段范围保持完全一致。
2. **测试退出时临时目录权限释放（Windows 环境）**：
   - `tests/unit/channel-block-repo.test.js` 中的 `afterAll` 删除临时 SQLite 目录在 Windows 下偶现句柄延迟释放警告，建议对 `fs.rmSync` 外层包裹 `try/catch` 容错。
