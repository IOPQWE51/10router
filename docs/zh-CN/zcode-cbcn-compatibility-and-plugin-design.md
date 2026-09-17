# ZCode 与 CodeBuddy CN (cbcn) 兼容治理与插件层协同设计方案

> **文件归档**：`docs/zh-CN/zcode-cbcn-compatibility-and-plugin-design.md`  
> **关联主题**：CodeBuddy 11128 渠道级风控、会话体积控制、ZCode 插件扩展（10router-sync）  
> **更新时间**：2026-09-17  

---

## 一、背景与问题真因复盘

### 1. 现象
用户在 ZCode 中进行多轮复杂的 Coding Agent 任务（如持续自动阅读多文件、运行测试、循环调试）后，经常遇到终端报错：
```
Turn execution failed / provider=cbcn model=cbcn/glm-5.3-flash / reason=invalid_request status=400 / Bad Request
```

### 2. 根因剖析（2026-09-17 真实发包硬比对定案）
- **触发维度是“请求体积与消息复杂度”，而非账号状态**：
  - **实测硬数据**：同账号单发 **4.5MB 真实多轮会话（1676 条消息、54 个工具定义、含真实工具运行输出）** $\to$ 848ms 内被腾讯云前置 WAF 秒拒，返回 `11128: "Illegal API invocation from an unapproved channel"`；
  - 同账号 10 分钟后发 **126KB 会话** $\to$ 100% 正常响应 200；
  - 提取底层 `requestDetails.providerRequest` 证实系统 prompt 完全原汁原味，**排除了 10Router 改包或失忆优化的假设**。
- **痛点与连锁反应**：
  1. **旧版连锁雪崩**：10Router 遇到 11128 曾误判为“单账号限流”，连续轮询池内其余账号重试，导致 1 秒内连续打出多发超大报文，放大风控；
  2. **客户端黑盒**：ZCode 在 Claude 协议下只认 `{ type: "error", error: { message } }`，旧版 10Router 缺少外层包装，导致 ZCode 界面仅显示干瘪的 `"Bad Request"`，开发者不知所措；
  3. **感知脱节**：ZCode 内置的自动 `/compact` 是按“大模型 Token 窗口（如 128k/200k）”触发的；然而上游 WAF 在 **HTTP 报文体积（约 3.2MB ~ 4.5MB）** 处就提前拦截了——**即 Token 还没满，HTTP 报文先超标了**。

---

## 二、三层协同治理架构

要彻底解决这一问题，单纯靠 10Router 服务端被动兜底不够，需要构建 **“客户端插件感知 $\to$ 10Router 网关治理 $\to$ 上游智能分流”** 的三层协同体系：

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ZCode 客户端与插件层 (zcode-plugin)                       │
│  - 工具输出大体积监控 (Bash/Read 输出剪裁建议)                   │
│  - 会话形态感知与 Hook 预警 (引导及时 /compact)                │
│  - 快捷状态命令 (查询 10Router 渠道熔断与健康状态)              │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP 请求 (带会话与工具)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. 10Router 网关服务端 (10router 本地/网关层)                │
│  - 前置超大包拦截 (isOversizedForCbcn >3.2MB/1200msgs)      │
│  - 协议标准包装 ({ type: "error" }) 传递精准指导             │
│  - 渠道级阶梯熔断保护 (60s / 10min，不锁账号，止血防连打)     │
│  - 配额联动刷新与失效保护                                    │
└──────────────────────────────┬──────────────────────────────┘
                               │ 正常体积 / 智能路由
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 上游渠道形态分流                                         │
│  - cbcn (CodeBuddy CN): 轻量日常任务、国内低延迟直连          │
│  - cbai (CodeBuddy Intl): 重型长任务 (抗 1891+ MSG 大形态)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、ZCode 插件层（zcode-plugin）的协同设计

我们在 `zcode-plugin` 中已经成功实现了用量同步（`10router-sync`）。基于 ZCode 的插件架构规范，插件层可以在以下三个方面与 10Router 形成强协同：

### 1. `PostToolUse` Hook：巨量工具输出主动防御与瘦身
* **痛点**：导致请求体急剧膨胀至 4MB+ 的最大罪魁祸首往往是单次工具输出过大（例如 `Read` 了一个几万行的编译产物、或者 `Bash` 打出海量日志）。
* **插件协同实现**：
  在 `zcode-plugin/hooks/hooks.json` 中配置 `PostToolUse` 钩子：
  ```json
  {
    "hooks": {
      "PostToolUse": [
        {
          "matcher": "Bash|Read",
          "hooks": [
            {
              "type": "command",
              "command": "node \"${ZCODE_PLUGIN_ROOT}/scripts/check-tool-output.mjs\"",
              "timeout": 5
            }
          ]
        }
      ]
    }
  }
  ```
* **机制**：
  - 当脚本检测到单次工具输出字符数超过设定阈值（如 > 80,000 字符 / 约 80KB）时，通过 stdout 注入 `additionalContext`：
    ```json
    {
      "additionalContext": "⚠️ [10Router 渠道提醒] 本次工具输出内容较大。若当前使用 CodeBuddy CN (cbcn) 渠道，长上下文易触发上游 11128 风控；请尽量精简读取范围，或在任务阶段性完成后输入 /compact 压缩会话。"
    }
    ```
  - **效果**：Agent 接收到该上下文后，会在后续步骤中主动收敛工具读取范围（如带 `offset`/`limit`），避免上下文无休止膨胀。

### 2. `UserPromptSubmit` Hook：会话轮次与体积警戒感知
* **机制**：
  - ZCode 用户每次发送消息时，插件 Hook 检查当前 Session 的历史轮次（或检查当前会话日志体积）；
  - 当会话轮次超过警戒线（如 > 80 轮且未 compact）时，轻量提醒用户：
    *“当前会话轮次较长，若使用 cbcn 建议执行 `/compact` 保持最佳吞吐。”*

### 3. 增强命令：`/10router:status`（渠道与熔断状态透视）
* **现状**：当 10Router 触发了 60 秒的渠道熔断时，用户在客户端侧不知道当前熔断剩余时间。
* **插件扩展**：
  - 在 `zcode-plugin` 中增加一个斜杠命令：`/10router:status`；
  - 插件直接调用本地 10Router 的健康/状态接口（`http://127.0.0.1:20128/api/health` 或 settings），输出精简卡片：
    ```markdown
    10Router 运行状态：
    - CodeBuddy CN (cbcn): ⚡ 正常服务中 (或 🔴 渠道熔断中，剩余 38 秒自动解封)
    - CodeBuddy Intl (cbai): 🟢 正常
    - Xiaomi MiMo: 🟢 桌面会话在线
    ```

---

## 四、10Router 网关层配合实现（本地已落地）

为了承接插件与客户端发来的请求，10Router 服务端已落地以下防御措施：

### 1. 前置拦截，阻止超大包冲击 WAF
在 `open-sse/executors/codebuddy-cn.js` 与 `src/sse/handlers/chat.js` 中：
- 设定安全阈值：`maxBytes = 3.2MB`，`maxMessages = 1200`，`maxTools = 60`；
- 一旦超标，10Router **在出站发给腾讯网关前就地拦截**，直接返回 400，保护整个渠道不进入熔断期。

### 2. 协议兼容的错误体包装
在 `open-sse/utils/error.js` 中将所有错误响应对齐 Claude 顶级错误结构：
```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "[codebuddy-cn/glm-5.3-flash] 请求形态(超长会话/工具过多)触发上游渠道级风控，非账号问题；请压缩会话 (/compact) 或稍后重试"
  }
}
```
ZCode 接收后能够完整呈现指导文本，彻底告别单调的 `"Bad Request"`。

---

## 五、开发者使用最佳实践

1. **轻重分流（Model Routing）**：
   - **日常轻量编码 / 代码补全 / 小需求修改**：优先使用 `cbcn/glm-5.3-flash`（延迟极低、走国内直连网络）；
   - **长程全自动 Agent 任务 / 重构 / 多文件批量分析**：建议在 10Router 建立 Combo 或直接使用 `cbai/glm-5.3-flash`（国际版实测容忍 1891+ MSG 超长会话）。
2. **遇错即治**：
   - 一旦在长会话中看到提示，**不要盲目重复点击 Retry**（相同的大体积请求重试 100% 仍然会被挡）；
   - 正确操作是直接在对话框输入 **`/compact`** 进行会话压缩，压缩后体积降至百 KB 量级，即可立即满血恢复。
