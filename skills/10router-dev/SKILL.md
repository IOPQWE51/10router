---
name: 10router-dev
description: "Develop / troubleshoot 10Router on NAS. Use when debugging why a client or model 'doesn't work' through the gateway, deploying to NAS, or deciding whether to fix or work around a third-party bug. 10Router 开发排障：排查客户端/模型经网关报错、部署 NAS、判断是否适配第三方 bug。"
version: 1.0.0
author: techysy
license: MIT
tags: [10router, troubleshooting, dev, nas, fnos]
triggers:
  - "10router 用不了"
  - "10router 报错"
  - "11133"
  - "unknown tool"
  - "10router 开发"
  - "10router 部署"
---

# 10Router — Dev & Troubleshooting 开发排障

> Gateway: local AI routing proxy. NAS 上是 Next.js standalone 编译产物（`server/.next/`），不是源码。改逻辑必须 build + 部署 + 重启才生效。

## 部署循环（改源码 → 构建 → 部署 → 重启）

```bash
cd ~/projects/10router
npm run build    # 2-4 分钟
S=.next/standalone
cp -r open-sse $S/ 2>/dev/null; cp -r src/mitm $S/src/ 2>/dev/null; cp -r node_modules/node-forge $S/node_modules/ 2>/dev/null
cat $S/.next/BUILD_ID
tar -czf /tmp/10router-standalone.tar.gz -C $S .; scp /tmp/10router-standalone.tar.gz yangyu@192.168.31.101:/tmp/
```

NAS 上（走 fnOS 生命周期，不能手动 kill）：
```bash
SERVER=/vol4/@appcenter/10router/server
sudo mkdir -p /tmp/10router-new; sudo tar -xzf /tmp/*.tar.gz -C /tmp/10router-new
sudo cp -a $SERVER/.env /tmp/10router-new/.env      # 必须保留 .env
sudo cp -a $SERVER /vol4/@appcenter/10router/server.bak_vXXX   # 备份可回滚
sudo find $SERVER -mindepth 1 -delete; sudo cp -a /tmp/10router-new/. $SERVER/
sudo chown -R 10router:10router $SERVER
sudo appcenter-cli stop 10router; sudo appcenter-cli start 10router
```
验证：`sudo cat $SERVER/.next/BUILD_ID` 确认新 ID。**重启会短暂断开当前 Hermes 会话**（本会话经 10router 代理）——重启前告知用户。

## 第三方客户端兼容问题排查方法论（"XX 用不了"）

适用于：用户报**某个第三方客户端**（mirasim/dsh/codex/Claude Code 等）经 10router 调某模型报错，但同一模型其他客户端可能正常。**先定位责任环节（客户端 / 网关 / 上游），再决定是否适配。**

### 第一步：跨环境对比定位责任环节（最重要）

让用户在不同环境 + 客户端测**同一个模型**，做对照矩阵：

| 环境 | 结果 → 结论 |
|------|------------|
| NAS 直连客户端（独立安装，不经 mirasim） | 正常 → **10router + 上游都正常** |
| 经 mirasim 的同一客户端 | 异常 → **嫌疑在 mirasim** |
| 经 mirasim 的另一个客户端（codex） | 正常 → mirasim 本身没大问题 |
| Claude Code → 10router | 正常 → 10router translator 正确 |
| 同一客户端 + 官方 DeepSeek | 报错更清晰 → 拿明确报错定位 |

**多个"正常"锁定 10router 无责；一个"异常"锁定源头。**

### 第二步：看网关日志确认请求到达 + 路由

```bash
sudo grep -nE "cbcn/deepseek|11133|ERROR" /vol4/@appdata/10router/10router.log | tail -20
```
请求行 `POST <模型> → <provider/model> · FMT: <src>→<dst> · N MSG · N TOOL · ACC:<账号>`：
- **FMT 关键**：`openai→openai` = 原样透传（客户端发什么 10router 转发什么）；`claude→openai` = 经 translator 转换（会重建 tool_calls）。
- `N TOOL` 是客户端特征（mirasim+dsh=25，Claude Code=53）。
- 确认请求真的到了（有时用户以为触发了但没到网关，日志空白）。

### 第三步：切换上游拿清晰报错

同一坏请求，不同上游报错详细度不同：
- **codebuddy 11133**（`model_param_invalid`，param 空）= 笼统"请求参数被拒"。
- **官方 DeepSeek** = 明确 `"tool_calls must be followed by tool messages responding to each 'tool_call_id'"` → 直接指向消息结构问题。

技巧：网关+上游笼统报错时，切到**报错更明确的上游**（官方 ds：`ds/` 前缀，ACC=9route）拿决定性线索。

### 第四步：抓包——chat.js 入口 + executor 打点

NAS 跑编译产物，加诊断必须 build+部署+重启。两个打点（都用 env 开关）：
1. **chat.js 入口**（`src/sse/handlers/chat.js`，body 解析后）——抓**客户端原始请求**：
   ```js
   if (process.env.DEBUG_RAW_REQ === "1" && Array.isArray(body?.messages)) {
     const tcIds=[], toolRespIds=[];
     for (const m of body.messages) {
       if (m?.role==="assistant" && Array.isArray(m.tool_calls)) for (const tc of m.tool_calls) tcIds.push(tc?.id);
       if (m?.role==="tool") toolRespIds.push(m?.tool_call_id);
     }
     console.log("[DEBUG-RAW-REQ] model="+body.model+" tcIds="+JSON.stringify(tcIds)+" toolRespIds="+JSON.stringify(toolRespIds));
   }
   ```
2. **executor transformRequest 末尾**（如 `open-sse/executors/codebuddy-cn.js`）——抓**上游前** body。

启用：NAS `server/.env` 加 `DEBUG_RAW_REQ=1`，重启。**注意**：部署脚本里先 `cp .env` 再追加会写到被清空的旧目录——直接对部署后的 `$SERVER/.env` 追加。

### 第五步：分析 tool_calls 对应关系

```bash
sudo grep "DEBUG-RAW-REQ" 10router.log | python3 -c "
import json,re,sys
for line in sys.stdin:
    m=re.search(r'model=(\S+) tcIds=(\[.*?\]) toolRespIds=(\[.*?\]) hasEmptyName=(\S+)',line)
    if not m: continue
    tc=set(json.loads(m.group(2))); tr=set(json.loads(m.group(3)))
    print(m.group(1),'tc=',len(tc),'tr=',len(tr),'缺失=',len(tc-tr),'孤儿=',len(tr-tc),'empty=',m.group(4))
"
```
- `缺失` > 0：tool_calls 无对应 tool 响应 → 客户端丢消息/id 不匹配。
- `empty=true`：`function.name` 空。tcIds 有 `""`：id 也丢。
- **对照组**：正常模型（hy4）tc=tr 完全匹配 → 锁定异常只在该客户端+模型组合。

### 第六步：判断是否适配（用户原则）

**"沉淀为一个技术文档吧，没必要去适配一个 bug。"**
- **第三方客户端 bug** → 不做 workaround（适配会引入对非标准格式的依赖，且无法还原已丢失信息）。沉淀中英双语文档 `docs/{en,zh-CN}/<case>.md`，`docs/README.md` 加入口（docs 目录 gitignored 需 `git add -f`），建议用户向第三方反馈。
- **10router 自己 bug** → 修。
- **上游特性缺陷**（如 codebuddy 流式空 name）→ 若透传会让所有客户端受害，可做通用无害修复（如删空 name），判断是否对所有客户端有益。

## 已确认的 CodeBuddy CN 特性和坑

- **DeepSeek 系**：`reasoning_effort: auto/off` → 11150（只接受 low/medium/high/xhigh/max/none；auto→high, off→删）
- **所有模型**：流式 tool_calls 首 chunk 带 name，后续空 name（10router stream.js 已删空 name）
- **非标准 tool_calls id**：返回 `chatcmpl-tool-...`（非 `call_...`），部分客户端复用历史时丢 id/name → 11133
- **11133**（`model_param_invalid`）是笼统参数被拒；切官方 DeepSeek 拿清晰报错

## 编码约定（用户强偏好）

1. 所有新功能 i18n：UI 文案用 `translate("...")`，英文 key + 中文 value 加进 `public/i18n/literals/zh-CN.json`
2. 新功能组件化 + 全局开关，默认关闭
3. 涉及日期/时间先 `date` 查本地系统时间，不猜
4. Git 提交用 Conventional Commit（Add/Fix/Update/Remove/Docs/Style/Refactor/Test/Chore）
