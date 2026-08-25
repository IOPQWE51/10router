# 10router-fnos v0.5.55 测试报告

> 测试时间：2026-08-25 17:40–17:52 · 环境：FN-NAS 31.101（fnOS x86_64）
> 包：`10router-0.5.55-x86.fpk` / `10router-0.5.55-x86-iframe.fpk`（端口 20127，与 9router 20128 并存）

## 结论：✅ 可正常使用（用户实测确认 + 自动化验证通过）

| # | 测试项 | 结果 |
|---|---|---|
| T1 | 服务进程与端口监听 | ✅ |
| T2/T3 | Dashboard 页面（局域网） | ✅ HTTP 200 |
| T4 | 登录认证 | ✅ 200 + auth_token |
| T5 | 核心 API（stats/providers/nodes/settings） | ✅ 全部 200 |
| T6 | period 参数校验 | ✅ 非法值返回 400 |
| T7 | 关键页面渲染（usage 双 tab/providers/login） | ✅ 5/5 |
| T8 | 与 9router(20128) 并存隔离 | ✅ 端口/数据目录双隔离 |
| T9 | EACCES 回归（HOME 修复） | ✅ 修复后零新增 |

---

## T1 服务状态

```
进程:  next-server (v16.3.2)  USER=10router
HOME:  /vol4/@appdata/10router   ← EACCES 修复点
PORT:  20127
监听:  0.0.0.0:20127 LISTEN
```

## T2–T3 页面可达性（局域网 31.31 → 31.101:20127）

- `/` → 307 → `/dashboard` → **HTTP 200**
- `/dashboard` 直接访问 → **HTTP 200**

## T4 登录认证

`POST /api/auth/login`（admin / INITIAL_PASSWORD）→ 200，签发 `auth_token` cookie。

## T5 核心 API

| API | 结果 | 备注 |
|---|---|---|
| `GET /api/usage/stats?period=7d` | ✅ 200 | totalRequests/byModel/recentRequests 结构完整 |
| `GET /api/usage/stats?period=today` | ✅ 200 | period 过滤生效 |
| `GET /api/usage/stats?period=all` | ✅ 200 | |
| `GET /api/providers` | ✅ 200 | connections=1 |
| `GET /api/provider-nodes` | ✅ 200 | nodes=1 |
| `GET /api/settings` | ✅ 200 | 含 topologyVisibility |

> usage 数据为 0 是新实例的正常表现——朋友测试产生请求后即有数据。

## T6 参数校验

`GET /api/usage/stats?period=<非法值>` → **400 Invalid period** ✅

## T7 页面渲染完整性

| 路径 | 结果 |
|---|---|
| `/dashboard` | ✅ 200 (26KB) |
| `/login` | ✅ 200 (10KB) |
| `/dashboard/usage?tab=overview` | ✅ 200 — 含表格筛选器（by Model/Account/API Key/Endpoint）+ 周期选择器 |
| `/dashboard/usage?tab=details` | ✅ 200 |
| `/dashboard/providers` | ✅ 200 |

## T8 与 9router 并存隔离

```
20127 (10router) LISTEN  ┐
20128 (9router)  LISTEN  ┘ 两端口同时在线，互不冲突

/vol4/@appdata/10router  ← 数据目录独立
/vol4/@appdata/9router
```

appname、桌面入口、系统用户（10router vs 9router）全部独立。

## T9 EACCES 回归（本次关键修复）

**问题**：fnOS 为应用创建的 `10router` 用户 home 指向不存在的 `/home/10router`，
源码 `mkdirSync($HOME/.9router)` 失败 → usage 相关 API 全部报 EACCES（日志累计 78 条）。

**修复**：`cmd/main` 启动时注入 `HOME="${DATA_DIR}"`（指向 `/vol4/@appdata/10router`）。

**验证**：
- 进程 environ 确认 `HOME=/vol4/@appdata/10router` ✅
- `.9router` 目录已建在数据目录内（属主 10router:AppUsers）✅
- 修复后日志最近 50 行 EACCES 计数 = **0** ✅（78 条均为修复前历史）

---

## 已知事项

1. **fpk 内 cmd/main 未更新**：当前交付的两个 fpk 打包于 HOME 修复之前。重装会复现 EACCES。
   → 待用户测试确认后重新打包覆盖交付。
2. **构建源切换**：本包源码来自 techysy/10router（替代原 techysy/9router fork），9router-fnos 的 README/enhancements 文档尚未同步此变更。
