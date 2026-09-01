# 模型 JSON 目录机制（modelsJsonUrl）

> 引入版本：v1.0.1 · 持续演进至 v1.0.4
> 相关文件：`src/app/api/providers/[id]/json-models/route.js`、`src/lib/db/repos/providerJsonModelsRepo.js`、`src/app/api/v1/models/route.js`

## 概述

部分 provider（B.AI、CodeBuddy CN/Intl、OpenCode Go、CommandCode、TokenBom 等）的模型目录**不适合硬编码**到静态 registry——模型多、且可能随上游更新。这些 provider 在 registry 或自定义节点上声明 `modelsJsonUrl`，通过仪表盘「Fetch Models」按钮**在线拉取**模型清单，再走统一的启用/禁用生命周期。

## 数据源

| 字段 | 含义 |
|------|------|
| `modelsJsonUrl` | 主源（通常 `https://api.github.com/repos/.../contents/...`） |
| `fallbackModelsJsonUrl` | 备用镜像（通常 Gitee），主源不可达时回退 |

两种来源都解析为 `{ models: [...] }`（静态文件）或 `{ data: [...] }`（OpenAI 风格 `/v1/models`）。GitHub Contents API 返回的 `{ content: <base64> }` 会被自动解码。

## 存储

JSON 目录**独立存储**（不复用 `customModels`），按 provider 保存并带 **enabled/disabled 状态**：

- 存于 `providerJsonModels`（`kv` 表 scope），key 为 provider id
- **新拉取的模型默认 disabled**，需手动启用（防止大量无效模型刷屏）
- 与手动 `customModels` 并存，两者在 `/v1/models` 都可见

## 生命周期（API）

`/api/providers/[id]/json-models`：

| 方法 | 作用 |
|------|------|
| `GET` | 拉取目录 + 叠加当前存储的 enabled 状态（预览用） |
| `POST` | 导入目录（替换存储的 JSON 模型列表），保持已启用模型、新模型默认 disabled |
| `PUT { modelId, enabled }` | 单个模型启用/禁用 |
| `PUT { all: true, enabled }` | 批量启用/禁用全部（对应 Disable All / Active All 按钮） |

## 关键坑：disabledModels 残留导致「激活了却不显示」

启用 JSON 目录模型时，若该模型在**旧静态列表时代**曾被写进 `disabledModels`，则 `/v1/models` 的 `isDisabled()` 过滤器仍会把它挡在列表外——出现"激活了但列表里看不到"。

**修复**（v1.0.4，commit `a81d3059`/`fa578085`）：启用模型时同步清除对应 disabledModels 条目，且必须清 **provider id 和 output alias 两个 key**（`/v1/models` 用 `outputAlias` 判定，仪表盘可能用 id 写入）：

```js
// PUT /json-models，enabled=true 时
await enableModels(id, [modelId]);           // 清 provider id
const alias = getProviderAlias(id);
if (alias && alias !== id) await enableModels(alias, [modelId]); // 清 alias
```

批量启用（`all: true`）同样要清两个 key 的空列表条目。

## 全局开关与回退

- 「从 GitHub JSON 获取模型」全局开关（持久化到数据库，默认关闭）：开关关闭时，JSON 目录不参与 `/v1/models`，回退到内置静态目录。
- `/v1/models` 只暴露目录中 **enabled** 的模型；enabled=false 的模型不出现在列表，但**请求转发不受限**。

## 静态目录兜底

内置静态 registry 中已不在 JSON 里的模型，会显示在「已禁用模型」中而非直接消失，便于确认被目录更新淘汰的模型。

## 相关注意事项

1. **Fetch Models 返回空**：B.AI 等聚合平台是 per-credential，`GET /v1/models` 对凭证返回空，需静态列表兜底（registry `models` 数组）。
2. **带鉴权的在线源**：自定义节点可指向需要 Bearer 的 `/v1/models`，会用该 provider 激活连接的 apiKey 请求；公共 GitHub/Gitee 源则不带 key。
3. **模型 ID 前缀**：JSON 目录模型走 `providerAlias/modelId`，与静态模型同规格。
