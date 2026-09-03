# RegMaster 後台 AI 助理改版 — 外部審查報告

日期：2026-09-02 ｜ 範圍：`public/admin/ai.html`、`public/shared/i18n-admin-ai.js`、`public/shared/firebase-bridge.js`（1 行）、`functions/index.js`（askAdminAI 區塊）

---

## 1. 總結

**PASS with fixes** — 後端改動安全且大致等價，但前端有 3 個高／中等缺陷會讓使用者在真實情境下「打的字消失」「聊天欄變 0 寬度不能用」「英文介面送出中文問題」，建議修完這 3 條再佈 Hosting；functions 可以照計畫先佈（唯一非等價點見 §4）。

---

## 2. 確認的問題（依嚴重度排序）

### 🔴 H1 — 新對話建立失敗時，訊息與錯誤泡泡全部消失、零回饋
`public/admin/ai.html:636`（`creationFailed()`）

`creationFailed()` 先 `SELECTED = null`（639），再 push 錯誤泡泡並呼叫 `renderMessages()`（641-642）；但 `renderMessages()` 第一個分支是 `if (!SELECTED || MESSAGES.length === 0)`（433），SELECTED 已是 null → 直接畫空白起始畫面，剛 push 的錯誤泡泡與使用者那則訊息全被覆蓋。輸入框在 612 行已清空，整條路徑也沒有 `uiAlert`。

**失敗情境**：左欄無選中對話 → 打一段長問題 → 送出 → 網路中斷或 `createConversation` 回 `{success:false}` → 畫面瞬間跳回「有什麼可以幫你的？」，訊息與錯誤都不見，使用者打的字救不回來。
**附帶效應**：MESSAGES 仍留著看不見的兩則；下次再送時 `SELECTED` 變 `_creating`（truthy）→ 上一輪失敗的內容憑空冒出，且 `buildHistory()` 會把它當新對話上文送給 Gemini。
**這使 PLAN §7-9（斷網送出 → 錯誤泡泡）在最常見路徑上不成立**（既有對話走 `onAiReply` 才正確）。

**建議修法**：`creationFailed()` 內不要把 SELECTED 清成 null 就直接走 `renderMessages()`；改為保留本地佔位（或直接畫泡泡不經空狀態分支），並補 `uiAlert(L('adAiCreateFail'))`，同時把原文塞回輸入框：`inp.value = text; inp.dispatchEvent(new Event('input'));`（`text` 由 sendBtn 傳入）。

---

### 🔴 H2 — 769–859px 視窗寬度：聊天欄塌成 0px 且完全無法觸及
`public/admin/ai.html:21-24`

抽屜式版面從 ≤768px 才開始，但桌面三欄需要 300+320+側欄 240 = 860px。§1 新加的 `.center-c{overflow:hidden}` 讓該 grid item 的自動最小尺寸從 min-content 變成 0，於是 769–859px 之間 `1fr` 解析為 **0px**；同時 `.admin > main{overflow:hidden}` 讓頁面不再產生水平捲軸，被裁掉的內容根本捲不到。

**實測（改動後檔案，820×700）**：`.center-c` width = 0；`.right-c` x=540/right=860（視窗僅 820）；`scrollWidth - clientWidth = 0`。同尺寸在 `_backup_20260902_admin-ai/ai.html`：`.center-c` = 299px，且有 354px 水平捲動 —— **改版前只是擠，改版後是完全不能用**。

**失敗情境**：主辦方在 1600px 螢幕上把視窗拉成一半（約 800px），或 800×1280 Android 平板直向 → 只看到歷史清單與被切一半的查詢範圍面板，沒有聊天區、沒有輸入框、沒有捲軸。（`body.side-collapsed` 會遮掩此 bug，但側欄預設是展開的。）

**建議修法**：新增中間斷點，讓三欄不在 ~900px 以下成立，例如把抽屜 media query 由 768px 提高到 1100px（同時顯示 `.chat-h .mb-btn`）；最低限度給中欄地板：`grid-template-columns:minmax(0,300px) minmax(320px,1fr) minmax(0,320px)` 並在 `max-width:900px` 讓 `.right-c` 離開流。驗收須加測 769 / 820 / 900px，不能只測 1280/1024/768。

---

### 🔴 H3 — `.chat-h` 桌面無 nowrap：標題塌成 0 寬、header 撐到 458px，把輸入框頂出視窗
`public/admin/ai.html:49`

`.chat-title{flex:1;min-width:0}` 可縮到 0，而 `.av-h` 與新的 `.scope-chip` 都 `flex-shrink:0`；`h4/p` 的 nowrap/ellipsis 只寫在 ≤768px（150 行）。中欄一窄，標題就變成一行一個中文字。

**實測（改動後，1024×800）**：`.chat-title` w=0 h=429；`.chat-h` h=458（欄高 733）；`.messages` 只剩 182px；`.scope-chip` 右緣 823 vs `.center-c` 右緣 704 → 被 `overflow:hidden` 裁掉，**§4 範圍指示在最需要時反而看不見**。
**1024×600**：`.input-area` bottom=666、`.send-btn` y=603..639 —— 全在 600px 視窗之下，被 `main{overflow:hidden}` 裁掉且 `scrollHeight - clientHeight = 0`，**送出鈕捲不到**。1280×800 時 header 也已是 116px（預期約 65px）。原始檔同寬度 `.chat-h` 僅 82px。

**建議修法**：把 clamp 提到桌面：`.chat-h h4, .chat-h p { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }`（單這一條就能把 header 壓回 ~65px）；並讓 chip 可讓步：`.scope-chip{flex-shrink:1;min-width:60px}`。修完重測 1024×800 與 1024×600 的 `.chat-h` 高度與 `.input-area` bottom。

---

### 🟠 M1 — 活動清單未載入／失敗時，正常活動被誤標「（此活動已刪除）」且無法復原
`public/admin/ai.html:521`（三個維度的審查者各自獨立命中同一條）

`setScopeUI()` 以 `hasCompOption()` 判定活動存在，但 `#compSelect` 由 `listCompetitions`（333）非同步填入，且 `withFailureHandler` 是空函式（340）——「還沒回來」與「真的被刪」被當成同一件事。誤判後：插入 disabled 假 option → `listCompetitions` 回來再插一個同 value 真 option → `compNameOf()` 由索引 0 往後找，永遠命中假的 → scope chip 與左欄該活動所有 pill 永久顯示「（此活動已刪除）」，且被選中的 disabled option 讓使用者無法用下拉切回，只能重整。**listCompetitions 失敗（429／網路抖動）時是必然發生，非競態。**

**失敗情境**：重整頁面 → `listConversations` 先回、`listCompetitions` 慢或失敗 → 1–2 秒內點左欄活動對話 → 主辦方被告知活動已刪除（實際沒有）。違反 PLAN §7-4。
**注意**：`SELECTED_COMP` 值本身正確，askAdminAI 範圍不受影響，屬顯示／可用性缺陷。

**建議修法**：加 `COMPS_LOADED` 旗標（success/failure 皆設 true），僅在 true 時才 append「已刪除」placeholder；success 時先移除同 value 的 ghost option 再 append 真 option，並重跑 `setScopeUI/renderScopeChip/renderConvs`；failureHandler 不要留空。

---

### 🟠 M2 — 英文介面首屏建議卡送出的是寫死的中文問題
`public/admin/ai.html:205-208`

四張靜態卡的文字走 `data-i18n` 會翻譯，但送出用的 `data-sg` 永遠是中文；delegation handler 優先讀 `data-sg`（679）。init（698-701）只呼叫 `renderKbPanel/renderScopeChip/loadConvs/updateControls`，**沒有呼叫 `renderMessages()`**，所以在使用者做任何動作前，畫面上就是這組寫死中文的靜態卡（440 行動態卡才有正確語系）。且 `AppState.init()` 的 `lang-changed` 在 241 行發出，早於本頁 705 行註冊 handler。

**失敗情境**：切成 English 後重整 → 卡片顯示英文 → 點下去送出「如何提升報名轉換率？」→ 後端 prompt 規則 3（依問題語言回答）讓 AI 用中文回答，中文題目還被存成對話標題（`text.slice(0,50)`，631）與歷史。**PLAN §7-12 在首屏漏掉。**

**建議修法**：init 尾端呼叫一次 `renderMessages()`（此時 SELECTED=null、MESSAGES=[]，會畫出正確語系的動態空狀態，並可順手移除 HTML 裡重複的靜態 empty-chat）；或直接拿掉靜態卡的 `data-sg`，讓 handler 落回 `textContent`。

---

### 🟠 M3 — `applyI18n()` 洗掉 JS 設定的知識庫標題（專案已知陷阱重演）
`public/admin/ai.html:711`

`#kbTitle`（228 行）帶 `data-i18n="adAiKbTitle"`，但 `renderKbPanel()` 在活動範圍時會覆寫成 `L('adAiKbTitleComp')`（486）。`lang-changed` handler 先跑 renderer、最後才呼叫 `window.applyI18n()`，而 `applyI18n` 對每個 `[data-i18n]` 無條件 `el.textContent = L(k)`（i18n.js:516-517），把活動版標題洗回通用版。這正是 PLAN §8-6 第 4 項標記、且 MEMORY 已記載過的 hub 陷阱。

**失敗情境**：範圍切到「特定活動」→ 標題顯示「知識庫 · 此活動」→ 切 EN → 先變 "Knowledge Base · This Event"，隨即被改回 "Knowledge Base"；此後標題宣稱全域知識庫，但 AI 實際仍限縮在單一活動。

**建議修法**：boot 時 `document.getElementById('kbTitle').removeAttribute('data-i18n')`，讓 `renderKbPanel` 獨佔該節點（與先前 hub 修法一致）；或把 `applyI18n()` 移到 handler 最前面。

---

### 🟠 M4 — 選了「特定活動」卻沒挑活動就送出：靜默建成主辦後台對話
`public/admin/ai.html:620`（`newConvBtn` 同 573）

`SCOPE==='comp'` 但 `SELECTED_COMP===''` 是可達狀態（按了範圍鈕但沒挑活動；或下拉選回 placeholder `value=""`）。兩處都用 `SCOPE === 'comp' ? SELECTED_COMP : ''` → 算出 `''` → 建出 compId 空的主辦後台對話，askAdminAI 也以跨活動脈絡作答。UI 只是「提示要選」（490），沒有守門。§4 的範圍還原放大症狀：日後點回這則對話，`applyScopeFromConv` 依 `conv.compId ? 'comp' : 'admin'`（537）判成 admin，範圍鈕／下拉／KB 面板／chip 全部跳回「主辦後台」。

**建議修法**：送出前守門（且須在清空 `inp.value` 之前）：`if (SCOPE === 'comp' && !SELECTED_COMP) { uiAlert(L('adAiKbPickComp')); return; }`，或讓 `updateControls()` 在該狀態 disable sendBtn/newConvBtn。

---

### 🟠 M5 — question 靜默截斷 6000 字，但完整原文照樣落盤
`functions/index.js:6127`

改版前 question 原封不動送進 Gemini（backup index.js:6089/6160，無上限），新版加了 `.slice(0, 6000)` 且無任何回饋。三個後果：(a) `#msgInput`（ai.html:214）無長度限制也無計數器；(b) 前端以**未截斷原文**呼叫 `appendMessage`（ai.html:648），而 appendMessage 允許 10000 字（index.js:9888）→ 對話紀錄永久顯示一個模型從未看過的問題，且下一輪被當歷史重播；(c) `vectorSearch(question, 5)`（6135）也跑在截斷後的文字上。

**失敗情境**：主辦方貼 7,500–8,000 字簡章問「有沒有矛盾」→ Gemini 只看到前 6000 字，對沒收到的段落回「沒問題」→ 紀錄顯示完整原文，落差不可見、不可重現。

**建議修法**：不要靜默截斷。(a) 明確拒絕：`if (String(data.question||"").length > 6000) return { error: "問題過長（上限 6000 字），請縮短後再送出" };`（新的 `{error}` 路徑會顯示成不落盤的暫時泡泡）；或 (b) 把上限提高到與 appendMessage 對齊的 10000 並加計數器。
**依專案 MEMORY：切勿用 `maxlength`**（貼上會被靜默截斷），用計數器＋送出時守門，與 `contentText` 同套做法。

---

### 🟡 L1 — 截斷警語被寫進落盤內容，並被當成模型輸出回送 Gemini
`public/admin/ai.html:661`

`content += '\n\n⚠️ ' + L('adAiTruncated')` 發生在 667 行 `appendMessage(convId,'ai',content)` **之前**，所以警語成為模型「自己說的話」；下一輪 `buildHistory()`（599-606）讀出後，後端把 `role:'ai'` 映成 `role:'model'`（index.js:6108），Gemini 會看到一則自稱被截斷的 model turn。且警語凍結在送出當下的語言，不隨 zh/en 切換。PLAN §3 只說「附加到泡泡」，未說要落盤。

**建議修法**：`appendMessage` 送未修改的 `answer`；旗標留在記憶體物件（`_truncated:true`），由 `renderMessages()` 在繪製時另起一行輸出 `L('adAiTruncated')`，即可隨語言切換。

---

### 🟡 L2 — Gemini 配額／API 錯誤不會輪換金鑰，壞掉的 key 會被重試到天荒地老
`functions/index.js:6222`

`rotateGeminiKey()` 只在 `catch`（6226-6228）才會被呼叫，也就是只有 fetch 自己 throw 或 body 非 JSON 時。最常見的 key 失效——HTTP 429 `RESOURCE_EXHAUSTED`、400 `API_KEY_INVALID`——回的是格式正確的 JSON，`res.json()` 成功、`cand` 為 null → 走 6222 的 `json.error` 分支回 `{error:"AI 暫時無法使用（RESOURCE_EXHAUSTED）"}`，而 `config/gemini.keyIdx` 仍指向死掉的 key，之後每次都重挑同一把（index.js:1852-1861）。

**非本次回歸**（舊碼同樣不輪換，只是回 `{answer:"AI 無法回答"}`），但**這次正是這段錯誤分支的改寫，且新碼是第一版真正拿得到 `json.error` 物件、有能力處理的版本**。

**建議修法**：僅針對 key 相關狀態輪換：`const st = String(json.error.status||""); if (st==="RESOURCE_EXHAUSTED"||st==="PERMISSION_DENIED"||st==="UNAUTHENTICATED") await rotateGeminiKey();`。**不要無條件輪換** —— 400 INVALID_ARGUMENT（請求本身壞掉）會把指標從好的 key 上走掉。

---

### 🟡 L3 — 新的 `{error}` 回傳寫死 zh-TW，英文介面會看到中文錯誤泡泡
`functions/index.js:6223`

失敗路徑回傳中文字面值（「請輸入問題」「AI 未設定」「AI 無法回答（SAFETY）」「AI 暫時無法使用（…）」），前端直接原字串渲染（ai.html:657-660），只有完全沒有 error 字串時才落回 `L('adAiNoReply')`。本次改動把頁面上其他所有字串都搬進 i18n，唯獨錯誤泡泡沒有；同時把 Gemini enum（SAFETY / RECITATION / MAX_TOKENS）原樣丟給使用者。

**建議修法**：回傳機器可讀碼，如 `{ error: msg, errorCode: 'NO_KEY'|'NO_ANSWER'|'API_ERROR', finish }`，前端映到新的 `adAiErr*` 鍵（zh+en），`aiRes.error` 只當最後備援。

---

### 🟡 L4 — 建立新對話期間切語言，按鈕標籤被還原成舊語言
`public/admin/ai.html:570-572`

handler 用 `var orig = newConvBtn.textContent` 快取點擊當下的文字，`done()` 再寫回；但該鈕帶 `data-i18n="adAiNewConv"`（187），中途切語言會被 applyI18n 改成新語系，回來後又被舊字串覆蓋，卡住直到下次切語言。
**建議修法**：`done()` 改成 `newConvBtn.textContent = L('adAiNewConv')`。

---

### 🟡 L5 — 長不可斷字串讓 `.messages` 產生自己的水平捲軸
`public/admin/ai.html:61` + `renderMessages()` 457 行的無名 `<div>` 包裝

`.msg` 是 flex，泡泡外層 `<div>` 沒有 `min-width:0`，自動最小寬度依內容計算，因此 `pre.md-pre{overflow-x:auto}` 永遠不會生效——長 URL／base64／id 清單會撐大泡泡而非在 `<pre>` 內捲動。**實測 1280×800**：`.messages` clientWidth 405 / scrollWidth 886，泡泡寬 810px 延伸到 x=1426。此問題改版前即存在（backup 標記相同），但直接落在 §7-1「無整頁捲軸／三欄各自捲」的驗收面上，且頁面本身不再捲動後更顯眼。
**建議修法**：`.msg > div { min-width:0; flex:1; }`，另可加 `.msg.ai .bubble { overflow-wrap:anywhere }`。

---

### 🟡 L6 — 深色模式下 `.scope-chip.comp` 對比僅約 2.5:1，新的範圍指示看不見
`public/admin/ai.html:54`

`.scope-chip.comp` 寫死淺色主題紫 `color:#6d3fd8`，背景是 `color-mix(in srgb,#8B5CF6 12%,var(--surface))`，深色時 `--surface` 為 `#0B1432`。瀏覽器實測配對為背景 `color(srgb 0.1034 0.1123 0.2883)` / 文字 `rgb(109,63,216)`，11.5px 字約 **2.5:1**，遠低於 AA 4.5:1。深色可達：`AppState.init()`（ai.html:241）會套用持久化的 `data-theme`（app-state.js:137），公開頁皆有主題切換鈕，markup 上的 `data-theme="light"` 在 init 時被覆寫。
**建議修法**：`color:color-mix(in srgb,#8B5CF6 65%,var(--ink))`，或加 `[data-theme="dark"] .scope-chip.comp{color:#C4B5FD}`。（鄰近的 `.conv .pill-c` 約 3.7:1，屬既有問題。）

---

### 🟡 L7 — 切換範圍確認文案與實際行為不符
`public/shared/i18n-admin-ai.js:83`（zh）／`:163`（en）

文案說「原對話仍保留在歷史清單」，但 `loadConvs()` 在 comp 範圍會呼叫 `listConversations(SELECTED_COMP)`，後端以 `where('compId','==',compId)` 過濾（index.js:9840 附近），左欄只剩該活動的對話，原本那則主辦後台對話從畫面消失。PLAN §9 明列 listConversations 過濾不改，所以這是文案問題不是後端缺陷——但正是這句話想消除的疑慮反而被放大。
**建議修法**：改為「原對話不會刪除，切回原範圍即可找到」，zh 83 行與 en 163 行同步。

---

### 🟡 L8 — PLAN §8-2 行為變化表漏列後端新增的截斷與空問題拒絕
`functions/index.js:6127`、`6129`

§8-2 只列了 thinkingConfig／systemInstruction／{error}／truncated／console.log／history 六項，未列 `.slice(0,6000)` 與 `if(!question) return {error:"請輸入問題"}`。這兩項在「先佈後端、舊前端仍在線」的空窗期就會生效。
**建議修法**：補進表格，並在截斷時於 `console.log` 帶 `qTruncated:true` 以便事後判讀（或直接採 M5 的修法）。

---

## 3. 被駁回的問題

- **`deleteConversation` 不看 `res.success`，後端拒絕仍顯示刪除成功** — 機制屬實（bridge Proxy 只要 callable 不 reject 就走 successHandler），但「權限不足」分支不可達：id 唯一來源是 `renderConvs` 產生的 `b.dataset`，本來就只列得到自己的對話；且此行為非本次改動引入。
- **截斷警語落盤（以「回送 Gemini 為模型輸出」為主軸的那一版）** — 機械事實正確，但該版本描述的加重情境不可達；此議題以較保守的 **L1** 版本保留，勿重複計數。
- **`askAdminAI` 維持 60s 逾時而 `maxOutputTokens` 加倍到 8192 → 長答案容易撞死線** — 程式碼事實正確（`compAuthCallable` 無 fnOpts，繼承預設 60s），但因果推論反向：`thinkingConfig` 與 token 上限的關係不會如宣稱般把回應時間推過死線，具體失敗情境無法由本次 diff 推出。兩位覆核者一致駁回。

---

## 4. 部署風險再評估

### 4-1 先佈 `functions:askAdminAI`、舊前端仍在線的空窗

| 項目 | 是否等價 | 說明 |
|---|---|---|
| history 參數 | ✅ 等價 | 舊前端不送第 3 個位置參數，`_buildAdminAiTurns` 拿到 undefined，退化為單輪 |
| systemInstruction / 多輪 contents | ✅ 等價 | 單輪時內容與舊版一致 |
| thinkingConfig | ✅ 等價 | 與 index.js:2700 既有用法一致 |
| `{error}` 回傳 | ⚠️ 需注意 | 舊前端沒有 error 分支，會如何呈現取決於舊碼；錯誤字串為中文（L3） |
| truncated 旗標 | ✅ 等價 | 舊前端忽略未知欄位 |
| **question `.slice(0,6000)`** | ❌ **非等價** | §8-2 未列。舊前端無任何長度提示，超過 6000 字的問題自本次部署起被靜默截斷（M5／L8）。**這是空窗期唯一的實質行為改變，且 functions 無預覽頻道，一佈即生效** |
| **空問題 `{error:"請輸入問題"}`** | ❌ 輕微非等價 | 舊行為是照送空字串；影響小，但同樣未列表 |

**結論**：若在佈後端前先採 M5 的修法（明確拒絕或提高上限），空窗期即為完全等價；否則請把 6000 字上限視為一項有意識接受的行為變更並記錄。

### 4-2 Hosting 整包佈署

- Hosting 一佈即全站（依專案 MEMORY，預覽頻道只涵蓋 Hosting、functions 一佈即全站），H2／H3 的版面缺陷會同時對所有後台使用者生效，且 H2 在 769–859px 是**完全不可用**而非降級——這比改版前（可水平捲動）更糟。**建議這兩條修完再佈 Hosting。**
- `firebase-bridge.js` 的 1 行 argMap 改動是新增可選第 3 位置參數，對其他呼叫端無影響。
- `i18n-admin-ai.js` 為新增鍵，不動既有鍵。

---

## 5. 建議的驗收補充

在 PLAN §7 的 12 項之外，補以下 7 項：

1. **版面斷點**：加測 **769px / 820px / 900px**（現行只測 1280/1024/768），確認 `.center-c` 寬度 > 0 且輸入框可見。
2. **短視窗**：1024×**600** 下確認 `.chat-h` 高度 ≤ ~70px、`.input-area` 與送出鈕完整落在視窗內。
3. **建立失敗路徑**：DevTools 斷網 → 在「無選中對話」狀態送出 → 應看到錯誤泡泡或 alert，且原文可救回（H1）。
4. **listCompetitions 失敗**：DevTools 阻擋該請求 → 點活動對話 → 不得顯示「（此活動已刪除）」（M1）。
5. **英文首屏**：切 EN → **重整** → 點第一張建議卡 → 送出內容與 AI 回答皆須為英文（M2）。
6. **語言切換洗字**：範圍切到特定活動 → 切 EN → 知識庫標題須維持 "Knowledge Base · This Event"（M3）。
7. **深色模式**：切深色 → 開活動對話 → scope chip 文字須清晰可讀（L6）。
8. **長問題**：貼 7,000 字送出 → 使用者須看得到「被截斷」或「過長被拒」的明確訊號（M5）。