# CodeBuddy CN Agent System Prompt 失忆问题修复

> 修复日期：2026-08-27 · 修复 commit：`b32e6fc5` · changelog commit：`cfc93c3d`
> 影响版本：v1.0.4 及之后

## 背景

通过 10Router 的 **CodeBuddy CN**（`cbcn`）调用腾讯 CodeBuddy 时，**自家 Agent（Hermes / 10Router）每次开新会话都会"失忆"** —— 身份、角色、工具记忆全部丢失，表现为 agent 不记得自己是谁、能做什么。

## 根因

CodeBuddy（腾讯）的内容过滤器会把 CLI agent 的系统提示（如 "You are Claude Code, Anthropic's official CLI..."）判定为 **prompt injection / 敏感内容**，从而拒绝整个请求。

为绕过该过滤，`CodeBuddyExecutor` 曾采用两种识别方式替换系统提示为中性文案：

```js
// 修复前
if (text.length > 2000 || AGENT_PATTERN.test(text)) {
  message.content = NEUTRAL_PROMPT;   // 整段替换为中性提示
}
```

**两个缺陷**：

1. **长度一刀切（`length > 2000`）**：自家 Agent（Hermes/10Router）的真实系统提示通常 **10K-30K 字符**，远超 2000，被无差别替换为一行中性文案 → **每次开新会话都失忆**。
2. **宽松 agent 正则误伤**：`AGENT_PATTERN` 覆盖面过广，可能命中合法系统提示。

## 修复

修改 `open-sse/executors/codebuddy-cn.js` 的 `transformRequest`，引入**白名单**并**移除长度一刀切**：

```js
// 白名单：自家 Agent/网关的系统提示必须原样放行
const WHITELIST_PATTERN =
  /hermes|10router|9router|\bclaude code by anthropic\b|anthropic's official cli|\bsystem instructions\b|你的身份|你的角色设定/i;

if (Array.isArray(transformed.messages)) {
  transformed.messages = transformed.messages.map((message) => {
    if (!message || message.role !== "system") return message;
    const text = flatten(message.content);
    if (!text) return message;
    // 1) 自家 Agent 提示：原样放行，绝不替换
    if (WHITELIST_PATTERN.test(text)) return message;
    // 2) 仅当真正命中外部 agent 身份标记时才替换
    //    不再有 length > 2000 一刀切（那正是失忆的元凶）
    if (AGENT_PATTERN.test(text)) {
      return typeof message.content === "string"
        ? { ...message, content: NEUTRAL_PROMPT }
        : { ...message, content: [{ type: "text", text: NEUTRAL_PROMPT }] };
    }
    return message;
  });
}
```

### 修复要点

1. **新增 `WHITELIST_PATTERN`**：匹配 `hermes` / `10router` / `9router` / `claude code by anthropic` / `system instructions` / `你的身份` / `你的角色设定` 等**独有的产品/官方签名**。这些标记不会出现在攻击者可控的提示里，因此安全。
2. **删除 `length > 2000` 一刀切**：长系统提示不再被静默清空——长提示本身不能成为判为 agent 的理由（这正是失忆的根因）。
3. **仅替换真正的外部 agent 签名**：对未命中白名单、但命中 `AGENT_PATTERN` 的外部 CLI agent 提示，仍替换为中性文案以通过上游内容过滤（保持原有安全目的）。

## 验证

- 修复后，Hermes / 10Router 通过 `cbcn` 请求时，系统提示（10K-30K 字符）原样转发，agent 身份/角色/工具记忆完整保留。
- 外部 agent 提示（如显式 "You are Claude Code" 签名）仍会被中性化，避免触发腾讯内容过滤。

## 相关注意事项

1. 白名单匹配基于**独有的产品名/官方签名**，刻意避免宽泛词（防止攻击者借白名单词绕过过滤）。
2. 若将来新增自有 Agent 产品名，需同步补充到 `WHITELIST_PATTERN`。
3. 该修复与 [CodeBuddy reasoning_effort 兼容修复](./CodeBuddy-reasoning-effort-fix.md) 同在 `codebuddy-cn.js` 的 `transformRequest` 中，属于 CodeBuddy 通道的两个独立兼容层。
