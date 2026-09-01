# Mirasim 内嵌 dsh 工具调用 id/name 丢失导致 11133

> 排查日期：2026-09-01 · 结论：**mirasim 内嵌 dsh 的 bug，10Router 不做适配**

## 症状

在 **mirasim** 里用内嵌的 **dsh**（DeepSeek Harness）调用 DeepSeek 系模型（`cbcn/deepseek-v4-pro` / `ds/deepseek-v4-pro`），多轮工具调用后报错：

- **codebuddy**：`400 code 11133`（"request parameters were rejected by the model provider"）
- **官方 DeepSeek**：`400 "An assistant message with 'tool_calls' must be followed by tool messages responding to each 'tool_call_id'"`
- **dsh 前端**：`Error: unknown tool ""`

## 排查过程

### 环境对比（决定性）

| 环境 | 结果 |
|------|------|
| NAS 直连 dsh（独立安装） | ✅ 正常 |
| mirasim + dsh | ❌ 11133 |
| mirasim + codex | ✅ 正常 |
| Claude Code → 10router | ✅ 正常 |
| mirasim + dsh + 官方 DeepSeek | ❌ 400（tool_calls 无 tool 响应） |

- NAS 直连 dsh 正常 → **10Router + codebuddy + 官方 ds 都没问题**
- mirasim + codex 正常 → mirasim 本身序列化没大问题
- Claude Code 正常 → 10Router translator 正确构造 tool_calls
- **只有 mirasim 内嵌 dsh** 异常

### 抓包证据（10Router `DEBUG_RAW_REQ` 诊断）

mirasim+dsh 的 pro 请求（27 个 tool_calls）：

| tool_calls id 来源 | 数量 | 说明 |
|------|------|------|
| `chatcmpl-tool-...` | 19 | **codebuddy 之前返回的非标准 id 格式** |
| `call_00/call_01` | 2 | dsh 自己生成的 |
| **空字符串 `""`** | **6** | **dsh 复用时丢失的 id** |

且 `function.name` 也为空（`hasEmptyName=true`）。

对照组 hy4 请求：tc=tr 完全匹配、无空 id、无空 name → **hy4 正常**。

## 根因

1. **codebuddy 返回非标准 tool_calls id**（`chatcmpl-tool-...`，非 OpenAI 标准的 `call_...`）
2. **mirasim 内嵌 dsh 把 codebuddy 返回的 tool_calls 存进会话历史**，多轮后复用
3. **dsh 无法正确处理 codebuddy 的 `chatcmpl-tool-` id**，复用时部分 id 丢失成空 `""`、name 也丢成空
4. codebuddy / 官方 ds 收到空 id + 空 name 的 tool_calls → 拒绝

## 结论

**这是 mirasim 内嵌 dsh 处理非标准 tool_calls id 的 bug**，不是 10Router、codebuddy 或官方 DeepSeek 的问题：

- 10Router 只是原样转发（openai→openai），dsh 已丢失的 id/name 无法还原
- codebuddy / 官方 ds 正常拒绝无效请求

## 处理

**10Router 不做适配**——适配一个第三方的 bug 会引入对非标准格式的依赖，得不偿失。建议：

1. **短期**：mirasim 里用 codex，或 NAS 直连 dsh / Claude Code（都正常）
2. **反馈**：向 mirasim 团队反馈其内嵌 dsh 对 codebuddy 非标准 tool_calls id 的处理 bug

## 相关

- 10Router 已在流式 passthrough 中**删除空 `function.name`**（commit `48e39b44`），帮助能正确解析的客户端避免 `unknown tool ""`——但这解决的是响应侧透传，对 mirasim+dsh 请求侧已丢失的 id/name 无效。
- 排查用的诊断代码（`DEBUG_RAW_REQ` / `DEBUG_CB_REQ`）已从 10Router 移除。
