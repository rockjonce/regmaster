# PLAN 2026-09-02 — 主辦後台 AI 助理：版面 / 載入 / 截斷 / 範圍還原 / 對話記憶 / mobile

狀態：**規劃中，尚未動任何程式碼**。等 user 審閱同意後才進入實作。
還原點（實作前打）：`git tag restore-20260902-pre-admin-ai`

涉及檔案：
- 前端：`public/admin/ai.html`（唯一改動頁）、`public/shared/i18n-admin-ai.js`（新增 key）
- 後端：`functions/index.js` 的 `askAdminAI`（單一函式，指名重佈）

---

## 0. 第 3 點的根因驗證結果

| 手段 | 結果 |
|---|---|
| `firebase functions:log --only askAdminAI`（唯讀） | 只有 instance 啟動與 callable 驗證訊息；**程式沒有 log `finishReason`**，log 無法證實 MAX_TOKENS。08-30 07:08:30 / 07:09:10 兩次呼叫對應附圖三。 |
| 唯讀查 `aiMessages` 存檔尾端（scratchpad `read_aimsgs.js`） | **被權限分類器擋下**（用到 `serviceAccountKey.json`），未繞過。user 可自行執行或授權。 |
| 靜態推論 | 截斷的文字**已存進歷史**（重開對話仍是斷的）→ 是伺服器端就斷了，不是顯示問題。伺服器端只有兩個切點：`appendMessage` 的 10000 字上限（附圖三遠小於此）與 Gemini 自己停止。`askAdminAI` 沒設 `thinkingConfig`，而同檔 [index.js:2705](functions/index.js:2705) 已記錄 2.5 Flash 的 thinking 會吃 `maxOutputTokens`。結論：**MAX_TOKENS 是唯一合理解釋**。 |

無論驗證與否，修法相同（見 §3），且修法本身會**加上 finishReason / usage 的 log**，之後就能直接從 log 看。

---

## 1. 版面鎖高（輸入框永遠在視窗底）

### 根因
- [ai.html:16](public/admin/ai.html:16) `.body-3 { min-height:calc(100vh - 60px) }` → 隨內容長高
- [admin-layout.css:9](public/shared/admin-layout.css:9) `.admin { min-height:100vh }`、`main` 無高度上限 → 整頁捲動
- 三欄是 grid item，預設 `min-height:auto`，`.conv-list` / `.messages` 的 `overflow-y:auto` 永遠不啟動

### 改法（只改 ai.html 的 `<style>`）
```css
/* 把 main 變成鎖定視窗高度的直向 flex，所有捲動都發生在三欄內部 */
.admin > main { height:100vh; display:flex; flex-direction:column; overflow:hidden; min-width:0; }
.body-3 { flex:1 1 auto; min-height:0; height:auto; display:grid; grid-template-columns:300px 1fr 320px; }
.left-c, .center-c, .right-c { min-height:0; }   /* grid item 必須明確歸零才會內捲 */
.center-c { overflow:hidden; }
```
- 不用猜 `.head` 高度（原本的 60px 是估的）：flex 自己扣掉 head。
- 高度寫 `height:100vh; height:100dvh;`（後者覆蓋前者，不支援的瀏覽器退回 100vh）：iOS Safari 的 100vh 含網址列，鍵盤彈出時輸入框會被蓋住，`dvh` 才是可視高度。
- `.head` 的 `position:sticky` 在 overflow:hidden 的 flex 容器內等同一般流，無副作用。
- `.messages { flex:1; overflow-y:auto }`、`.input-area` 不動 → 輸入框自然貼底。
- Mobile（≤768px）與 §7 一起處理：三欄只剩 `.center-c` 在版面流內，左右欄變抽屜。

### 風險
低。只影響 ai.html。要在預覽頻道實測：桌機 1280 / 1024、平板 768、手機 390，確認 (a) 沒有第二條捲軸 (b) 左欄長清單自己捲 (c) 訊息多時自動捲到底仍有效（`box.scrollTop = box.scrollHeight`）。

---

## 2. 點歷史對話的載入狀態

### 根因
[ai.html:288-299](public/admin/ai.html:288) `selectConv` 無 loading、無 failure handler、無防連點；高亮在回應後才切。
另外發現：**每次 AI 回完 `loadConvs()` 重繪清單後高亮就消失**（[ai.html:470](public/admin/ai.html:470) → `renderConvs` 沒有重套 `.on`）。

### 改法
```js
var LOADING_ID = null;
function selectConv(id) {
  if (LOADING_ID === id) return;                         // 防連點
  LOADING_ID = id;
  markSelected(id);                                       // 立刻高亮
  setComposerEnabled(false);                              // 載入中鎖住輸入
  renderLoadingState();                                   // #messages 畫「載入對話中⋯」＋ .typing 三點
  google.script.run
    .withSuccessHandler(function (res) {
      if (LOADING_ID !== id) return;                     // 使用者已點別的，丟棄舊回應
      LOADING_ID = null;
      if (!res || !res.success) { uiAlert(res && res.message || L('adAiLoadFail')); renderMessages(); setComposerEnabled(true); return; }
      SELECTED = res.conversation; MESSAGES = res.messages || [];
      applyScopeFromConv(SELECTED);                       // §4
      renderMessages(); setComposerEnabled(true);
    })
    .withFailureHandler(function () { if (LOADING_ID !== id) return; LOADING_ID = null; uiAlert(L('adAiLoadFail')); renderMessages(); setComposerEnabled(true); })
    .getConversation(id);
}
```
- `renderConvs()` 末尾：`c.id === (SELECTED && SELECTED.id)` 就加 `.on`（修高亮消失）。
- 新 i18n：`adAiLoadingConv`（載入對話中⋯ / Loading conversation…）、`adAiLoadFail`。

### 風險
低。競態用 `LOADING_ID` 比對處理。

---

## 3. 回答截斷（後端）

### 根因
[index.js:6161](functions/index.js:6161) `maxOutputTokens:4096` 且**無 `thinkingConfig`**；[index.js:6164-6167](functions/index.js:6164) 不看 `finishReason`。

### 改法
```js
generationConfig: { maxOutputTokens: 8192, temperature: 0.3, thinkingConfig: { thinkingBudget: 1024 } }
...
const cand = json.candidates && json.candidates[0];
const finish = cand && cand.finishReason;
const usage = json.usageMetadata || {};
console.log("[askAdminAI]", JSON.stringify({ finish, out: usage.candidatesTokenCount, think: usage.thoughtsTokenCount, prompt: usage.promptTokenCount, histLen: hist.length }));
return { answer, truncated: finish === "MAX_TOKENS" };
```
- 前端收到 `truncated:true` 在泡泡尾端補一行 `L('adAiTruncated')`（「回答過長已截斷，請縮小問題範圍或分段詢問」）。
- `thinkingBudget:1024` 而非 0：保留推估題的推理品質；1024 + 回答 ≤ 8192 綽綽有餘。

### 提示語字數條件（user 問的「不能太低」）
在 `ctx` 回覆規則加第 5 條：
> 5. 回答以 **600 字為目標、最多 1,000 字**；數據分析／推估類問題最多 **1,500 字**。超過時先給結論與關鍵數字，再給精簡步驟。**不要複述使用者已提供或系統已注入的原始資料**（活動名稱、日期、統計數字只在推論需要時引用）。

理由：中文在 Gemini 約 1–1.5 token/字，1,500 字 ≈ 2,500 token，離 8192−1024 還很遠；附圖三那則約 650 字就被截，證明元凶是 thinking 不是字數，所以字數上限可以給得寬。附圖三前半段把「活動名稱／開放日／截止日／報名總數」照抄一遍，是「不要複述」那句要治的。

### 風險
中。改後端要重佈 `askAdminAI`（指名單支）。回傳多一個 `truncated` 欄位，舊前端忽略即可，向下相容。需在預覽頻道用附圖二／三的兩題實測。

---

## 4. 點歷史對話還原當時的查詢範圍

### 根因
對話有存 `compId`（[index.js:9797](functions/index.js:9797)）但 `selectConv` 不用；`runAI` 看全域 `SCOPE`/`SELECTED_COMP`（[ai.html:462](public/admin/ai.html:462)）。`listConversations('')` 不過濾（[index.js:9786](functions/index.js:9786)），所以主辦後台範圍看得到活動對話。

### 改法
```js
function applyScopeFromConv(conv) {
  var want = conv.compId ? 'comp' : 'admin';
  var sel = document.getElementById('compSelect');
  if (want === 'comp' && !sel.querySelector('option[value="' + conv.compId + '"]')) {
    // 活動已刪除：加一個 disabled 選項顯示，並提示
    var o = document.createElement('option'); o.value = conv.compId; o.disabled = true; o.textContent = L('adAiCompDeleted'); sel.appendChild(o);
  }
  SCOPE = want; SELECTED_COMP = conv.compId || '';
  document.querySelectorAll('#scopePicker button').forEach(function (b) { b.classList.toggle('on', b.dataset.scope === want); });
  sel.style.display = want === 'comp' ? '' : 'none'; sel.value = SELECTED_COMP;
  renderKbPanel(); renderScopeChip();               // §7 的範圍小標
}
```
- `runAI` 改用 `SELECTED.compId`（新對話建立時也把 `compId` 寫進 `SELECTED`，[ai.html:444](public/admin/ai.html:444)）。
- 清單上的「活動」pill 改顯示活動名稱（從 `#compSelect` 的 option 查，找不到才顯示「活動」）。

### 政策（user 2026-09-02 定案）：手動切範圍 = 重啟一個對話，切之前要確認
範圍是對話的屬性，不允許同一對話跨範圍續聊。使用者在**已選中某對話**的狀態下按 scope 按鈕或換活動下拉時：

```
scope 按鈕 click / #compSelect change
  ├─ BUSY（AI 回覆中）或 SELECTED._creating → uiAlert(L('adAiScopeBusy'))，不切，控制項還原
  ├─ 沒有選中對話（SELECTED == null）→ 直接切（現行行為）
  └─ 有選中對話 → uiConfirm(L('adAiScopeSwitchMsg'), { title:L('adAiScopeSwitchTitle'), okText:L('adAiScopeSwitchOk') })
        ├─ 確定 → SELECTED = null; MESSAGES = []; 套用新範圍（SCOPE / SELECTED_COMP / 按鈕 / 下拉 / 知識庫面板 / 範圍小標）
        │         renderMessages() → 空白「新對話」狀態（含四張建議卡）；loadConvs() 重載清單、無高亮
        │         ＊不立即 createConversation：沿用現行「第一則訊息送出時才建立」（[ai.html:438-448](public/admin/ai.html:438)），
        │           避免使用者只是看看就留下一堆空對話。
        └─ 取消 → 控制項還原到該對話原本的範圍：scope 按鈕 `.on` 切回、#compSelect.value 切回 SELECTED.compId、
                  知識庫面板維持原本；SELECTED / MESSAGES 完全不動
```
- 實作上 scope 按鈕與下拉的 handler 都先「記住目前值 → 呼叫 `requestScopeChange(next)` → 取消時把 UI 還原成記住的值」，不能先改 UI 再問。
- 文案（zh / en）：
  - `adAiScopeSwitchTitle`：切換查詢範圍 / Switch scope
  - `adAiScopeSwitchMsg`：切換範圍會離開目前對話並開始新對話（原對話仍保留在歷史清單）。要繼續嗎？ / Switching scope will leave this conversation and start a new one (the current one stays in history). Continue?
  - `adAiScopeSwitchOk`：開始新對話 / Start new conversation
  - `adAiScopeBusy`：AI 回覆中，請稍候再切換範圍 / Please wait for the AI reply before switching scope

### 風險
低。`loadConvs` 觸發的重繪要保留高亮（§2 已修）。確認視窗用現成 `uiConfirm`（[ui-dialog.js:100](public/shared/ui-dialog.js:100)，`position:fixed` 不受 §1 的 `overflow:hidden` 影響）。

---

## 5. 其他七項

### 5-1 訊息時間顯示 UTC（差 8 小時）— 修
[ai.html:323](public/admin/ai.html:323) `slice(11,19)` → 
```js
function fmtTs(iso) { var d = new Date(iso); return isNaN(d) ? String(iso||'').slice(11,19) : d.toLocaleTimeString('zh-TW', { hour12:false, timeZone:'Asia/Taipei' }); }
```
不動資料。

### 5-2 對話記憶（前端送歷史，後端組多輪）— 修
**前端** `runAI`：
```js
var hist = MESSAGES.filter(function (m) { return !m._typing && !m._transient; }).slice(0, -1)  // 去掉剛 push 的這題
  .slice(-10).map(function (m) { return { role: m.role, content: String(m.content).slice(0, 2000) }; });
// 總量上限 8000 字，超過從最舊的開始丟
askAdminAI(text, compId, hist)
```
**後端** `askAdminAI`：
```js
const hist = Array.isArray(data.history) ? data.history.slice(-10) : [];
const turns = [];
for (const h of hist) {
  const role = h.role === 'ai' ? 'model' : (h.role === 'user' ? 'user' : null); if (!role) continue;
  const text = String(h.content || '').slice(0, 2000); if (!text) continue;
  if (turns.length && turns[turns.length-1].role === role) turns[turns.length-1].parts[0].text += "\n\n" + text;   // Gemini 要求 user/model 交替
  else turns.push({ role, parts: [{ text }] });
}
while (turns.length && turns[0].role !== 'user') turns.shift();   // 必須以 user 開頭
turns.push({ role: 'user', parts: [{ text: question }] });
body: { systemInstruction: { parts: [{ text: ctx }] }, contents: turns, generationConfig: {...} }
```
- `ctx`（手冊 RAG＋功能總覽＋活動設定＋即時統計）搬到 `systemInstruction`，每輪都重新注入 → 「現在已經到 30 位了」仍拿到最新數字。
- `history` 為選填，舊前端不送就是現行行為 → 向下相容，可先佈後端。
- 安全：歷史是 client 送的，但只影響該使用者自己的回答，且有 10 則 / 2000 字 / 8000 字上限。

### 5-3 編號清單全是「1.」— 修
[ai.html:212-213](public/admin/ai.html:212) 抓號碼 `^\s*(\d+)[.、)]\s+(.+)$` → `<ol start="N">`。
加分（可選）：編號項底下縮排的 `  - ` 子彈點巢狀進該 `<li>` 而不是切斷 `<ol>`。

### 5-4 `---` 分隔線 — 修
在 fence 判斷之後、標題之前加：`^\s*([-*_])\1{2,}\s*$` → `<hr class="md-hr">`；CSS `.msg.ai .bubble hr.md-hr { border:0; border-top:1px solid var(--line); margin:10px 0; }`。

### 5-5 錯誤訊息不落盤 — 修（前後端各一小塊）
- 後端失敗路徑 [index.js:6091](functions/index.js:6091) `AI 未設定`、[6166](functions/index.js:6166) `AI 無法回答`、[6170](functions/index.js:6170) `AI 暫時無法使用` 目前都塞在 `answer` 回來，前端分不出來 → 改回傳 `{ error: "..." }`（前端 [ai.html:467](public/admin/ai.html:467) 已經會讀 `aiRes.error`）。
- 前端：有 `error` 就畫泡泡並標 `_transient:true`，**不呼叫 `appendMessage`**；`_transient` 也不進 §5-2 的歷史。

### 5-6 回覆中鎖送出 ＋ 回覆落錯對話 — 修
- `BUSY` 旗標：送出→true；`input` 事件 `sendBtn.disabled = BUSY || !value`；Enter 在 BUSY 時忽略；`runAI` 完成／失敗→false。
- **順手修一個現有 bug**：`runAI` 回呼直接 push 到全域 `MESSAGES`，若使用者等待中切到別的對話，回覆會畫在錯的對話畫面上（雖然 `appendMessage(convId)` 存對了）。改成回呼先比對 `SELECTED && SELECTED.id === convId`，不符就只落盤不畫。
- 等待中點別的對話：允許（配合上一條就安全），但 `newConvBtn` 在 BUSY 時停用。

### 5-7 Mobile 抽屜 — 本次一起修
沿用 admin-layout.css 的 `.side` 抽屜手法（[admin-layout.css:135-147](public/shared/admin-layout.css:135)），但在 ai.html 自己的樣式裡做、用自己的 body class，不碰共用檔：
- `≤768px`：`.body-3 { grid-template-columns:1fr }`；`.left-c`、`.right-c` 改 `position:fixed` 側滑（左欄從左、右欄從右），`transform:translateX(±100%)`，`body.ai-left-open` / `body.ai-right-open` 展開；共用一個 `.ai-backdrop`（z-index 105，低於主側欄的 120）。
- `.chat-h` 加兩顆只在 mobile 顯示的按鈕：「歷史」「範圍」；加一個**範圍小標（scope chip）**顯示「主辦後台」或活動名——桌機也顯示，讓 §4 的還原有肉眼可見的回饋。
- 點歷史對話、＋新對話 → 自動關左抽屜；點 backdrop / Esc → 關。
- `.chat-h p`（副標）在 mobile 隱藏省高度。
- 新 i18n：`adAiHistoryBtn`、`adAiScopeBtn`、`adAiScopeAdminChip`。

---

## 6. 實作與佈署順序

| 步驟 | 內容 | 佈署 |
|---|---|---|
| 0 | `git tag restore-20260902-pre-admin-ai` | — |
| 1 | 後端 `askAdminAI`：§3 thinking/finishReason/log ＋ §5-2 history ＋ §5-5 error 回傳。全部向下相容（新欄位選填、`truncated`/`error` 舊前端忽略）。**四審新增 `getCompKbStatus`**：活動不存在改 throw not-found（原回 `{}`），舊前端的失敗回呼會畫樂觀預設（與現況「畫尚未設定」同屬顯示層，無資料影響）。 | `firebase deploy --only functions:askAdminAI,functions:getCompKbStatus`（先佈；佈完**立刻**接 Hosting，見 §8-10 空窗注意） |
| 2 | 前端 ai.html ＋ i18n：§1 §2 §4 §5-1 §5-3 §5-4 §5-5 §5-6 §5-7 | Hosting **預覽頻道**，user 實測 |
| 3 | 預覽通過 → Hosting 正式 | `firebase deploy --only hosting` |

理由：後端無法預覽（functions 一佈即全站），所以把後端做成「舊前端打進來＝舊行為」，先佈也安全；前端走預覽頻道給 user 看過再上。

## 7. 驗收清單（預覽頻道）

1. 桌機：左欄 30+ 對話時輸入框仍在視窗底；三欄各自捲；無整頁捲軸。
2. 點對話：立即高亮＋「載入對話中」動畫；快速連點 A→B 最後顯示 B；AI 回完後高亮不消失。
3. 附圖二「按現在報名趨勢推估最後隊伍數」與附圖三同題：回答完整、有結尾；log 有 `finish:"STOP"`；刻意問「請詳細列出 30 項建議」→ 出現截斷提示。
4. 在「主辦後台」點開一個活動對話 → 範圍自動切「特定活動」、下拉選到該活動、知識庫面板換、範圍小標顯示活動名；續問活動數據答得對。
5. 已選中對話時手動切範圍／換活動 → 先跳確認視窗；「開始新對話」→ 回空白新對話狀態、清單無高亮、原對話仍在清單；「取消」→ 按鈕與下拉還原到原對話的範圍、知識庫面板不變、對話內容不變。AI 回覆中切範圍 → 提示稍候、不切。
6. 訊息時間 = 台北時間（與左側列表一致）。
7. 追問「上面第 2 點展開說明」→ AI 知道第 2 點是什麼。
8. `1. 2. 3.` 編號正確；`---` 顯示為分隔線。
9. 斷網送出 → 錯誤泡泡；重新整理後歷史裡沒有那則錯誤。
10. 等待回覆時無法再送；等待中切到別的對話，回覆不會畫到那個對話。
11. 手機 390：歷史／範圍抽屜開關正常、選對話後抽屜自動關、輸入框貼底、鍵盤彈出不遮輸入框。
12. 中／EN 切換：新加的文案都有翻譯。

## 8. Production 風險評估（2026-09-02 第二次審視）

### 8-1 影響面盤點

| 面向 | 本次是否觸及 | 說明 |
|---|---|---|
| Firestore 資料 / schema | **否** | `aiConversations`、`aiMessages` 讀寫方式不變，無 migration，無新欄位 |
| Security rules / 索引 | 否 | — |
| 後端函式 | **2 支**：`askAdminAI`（[index.js:6087 起](functions/index.js:6087)）＋ `getCompKbStatus`（四審新增，活動不存在改 throw not-found） | 指名重佈兩支。報名者端 AI（其他 `generateContent` 呼叫點 2700 / 5866 / 6415 / 6526 / 6922 / 6985）**一律不碰** |
| 前端頁面 | **1 頁**：`public/admin/ai.html` ＋ 其專屬字典 `i18n-admin-ai.js` | 其他 15 個後台頁不受影響；共用檔 `admin-layout.css` / `admin-nav.js` / `ui-dialog.js` **不改** |
| 共用檔 `firebase-bridge.js` | **1 行**：`askAdminAI:["question","compId"]` → 加第三個位置參數 `"history"`（[firebase-bridge.js:202](public/shared/firebase-bridge.js:202)） | 實作時才發現必要：前端經 `_argMap` 把位置參數轉成具名 payload，不加就送不出 history。只影響 `askAdminAI` 這一個 key；舊呼叫端（含未部署的 legacy 頁）只傳兩個參數 → 第三個是 `undefined`，JSON 序列化時被丟掉，payload 與改前完全相同 |
| 金流 / 報名 / 通知 | 否 | — |
| 外部 API | Gemini 請求結構改變（見 8-2） | 金鑰輪替、配額處理邏輯不動 |

### 8-2 後端 `askAdminAI` 佈署後「立即」對所有使用者生效的行為變化
functions 無預覽環境，一佈即全站。以下是舊前端（佈後端、還沒佈前端的空窗）也會感受到的差異：

| 變化 | 對舊前端的影響 | 風險等級 | 緩解 |
|---|---|---|---|
| `thinkingConfig.thinkingBudget:1024`、`maxOutputTokens:8192` | 長回答不再被截；推理型問題品質可能略變 | 🟡 中 | log `thoughtsTokenCount`，若常態貼近 1024 就調高重佈（單支、幾分鐘） |
| `ctx` 改放 `systemInstruction`，問題放 `contents` | 舊前端不送 history → `contents` 只有一則 user turn；注入脈絡相同（少了「管理員問題：」標籤） | 🟢 低 | 這是 Gemini 官方建議的擺法；預覽階段用附圖題比對前後回答 |
| **提示語改寫**：新增規則 5（600／1000／1500 字上限）、6（不複述注入資料）、7（延續對話脈絡） | **所有使用者的答案立刻變短、不再複述活動資料**——這是舊前端在空窗期最先感受到的變化。值班者若覺得答案太短，要調的是規則 5 的字數，不是 thinkingBudget | 🟡 中 | 文字寫在 `askAdminAI` 的 `ctx` 區塊，改字數不需動其他地方；二審已把「分隔線 ---」從規則 1 拿掉（舊前端沒有 hr 分支會以字面顯示並落盤） |
| 失敗路徑回傳 `{error}` 而非 `{answer}` | 舊前端 [ai.html:467](public/admin/ai.html:467) 本來就會讀 `aiRes.error` 顯示；行為等價 | 🟢 低 | — |
| 新增回傳 `truncated` | 舊前端忽略 | 🟢 低 | — |
| 新增 `console.log` 用量 | 只有 token 數與 finishReason，無 PII、無問題內容 | 🟢 低 | — |
| `history` 參數 | 選填；未送 = 現行單輪 | 🟢 低 | 後端做 10 則 / 2000 字 / 8000 字三重上限＋role 白名單，惡意大 payload 也被截 |

**佈署失敗情境**：`firebase deploy --only functions:askAdminAI,functions:getCompKbStatus` 失敗時舊版本繼續服務。**但兩支是分開更新的**：遇到 429（記憶：quota 後顯示 Skipped = 舊碼）可能只成功一支——例如新 `askAdminAI` ＋ 舊 `getCompKbStatus`，此時 system 角色的孤兒活動守門只剩 `askAdminAI` 的 NOT_FOUND 一路。佈完必須逐支核對 Console 的 updateTime，不能只看批次結束碼；被 Skipped 的那支指名重佈。

### 8-3 前端 Hosting 佈署風險
- Hosting deploy 是**整個 `public/` 目錄**，不是單檔。佈署前必做：`git status public/` 只能有本次的 `ai.html` 與 `i18n-admin-ai.js`；教學影片（gitignore、僅在 Hosting）2026-08-11 已核實本機＝線上，維持不動。
- 預覽頻道與正式共用同一組 functions → 預覽階段實測的就是佈好的新後端，沒有「預覽過了、正式不同」的落差。
- 記憶提醒：嵌入式 Browser 窗格不合成畫面／不跑動畫幀 → 載入動畫、抽屜滑入、iOS 鍵盤行為**必須由 user 在真實瀏覽器與手機上看預覽頻道**，我的自動驗證只能證明 DOM 與樣式值正確。

### 8-4 成本
- 每次呼叫多送：`systemInstruction`（原本就有，只是換位置，不增）＋ history 最多 8,000 字 ≈ 10k token。以 Gemini 2.5 Flash 輸入單價估算，每輪最多多幾分之一分美元；AI 助理是付費方案功能（`requireCompFeature("ai")`），呼叫量本身受限。
- `maxOutputTokens` 4096→8192 只是上限，實際輸出受提示語字數規則約束，不會常態用滿。

### 8-5 回滾
| 層 | 方法 | 時間 |
|---|---|---|
| 後端 | `git checkout restore-20260902-pre-admin-ai -- functions/index.js` → `firebase deploy --only functions:askAdminAI,functions:getCompKbStatus`（兩支都要回） | 約 3–5 分 |
| 前端 | Firebase Console → Hosting → 上一個 release「Rollback」（一鍵），或從 tag 重佈 | 1 分內 |
| 資料 | 無需回滾（本次不改資料） | — |

### 8-6 殘餘風險（做完緩解後仍存在）
1. `thinkingBudget` 數值是經驗值，若某類問題仍截斷，需要一次調參重佈。
2. `.admin > main { overflow:hidden }` 只在 ai.html 生效，但若日後共用 `admin-layout.css` 改了 `main` 的 display，這頁要跟著看一眼（會在 ai.html 註解標明）。
3. history 由 client 提供，使用者理論上可竄改自己對話的「上文」——只影響自己得到的回答，且有大小上限，不構成對他人的風險。
4. `lang-changed` 事件會呼叫 `renderMessages()` / `renderConvs()`，實作時要確保它不會清掉 LOADING / BUSY 狀態或載入中的骨架畫面。

### 8-7 一句話結論
本次不動資料、不動金流、不動共用檔；後端只有一支函式且對舊前端向下相容；前端只有一頁且走預覽頻道；兩層都有分鐘級回滾。**整體對 production 的風險：低到中，可控。**

## 8-8 外審結果與修正（2026-09-02 Opus 5 ultracode，44 agents，報告 `REVIEW_2026-09-02_admin-ai-external.md`）

外審結論「PASS with fixes」：25 條原始發現 → 22 條通過對抗驗證（去重後 16 條獨立問題）→ 3 條駁回。全部 16 條已修：

| 編號 | 嚴重度 | 問題 | 修法 |
|---|---|---|---|
| H1 | 🔴 | 新對話建立失敗：SELECTED 清空後 renderMessages 走空白分支，錯誤與原文全消失 | `creationFailed(text)`：原文塞回輸入框、清樂觀訊息、`uiAlert` |
| H2 | 🔴 | 769–859px 中欄塌成 0px 且捲不到（三欄 + 側欄需 ~900px；`overflow:hidden` 讓 min-content 歸零） | 分兩段斷點：≤1100px 右欄變抽屜、左欄 240；≤900px 左欄也變抽屜；`minmax(0,1fr)` |
| H3 | 🔴 | `.chat-h` 桌機無 nowrap，標題一字一行、header 撐到 458px 把輸入框頂出視窗 | `h4/p` 單行截斷；`.scope-chip` 可縮（min-width 60） |
| M-iOS | 🟠 | 共用 `.admin{min-height:100vh}` 比 main 的 100dvh 高 → iOS 多一條可捲空白 | 本頁覆寫 `.admin{min-height:0;height:100dvh}` |
| M1 | 🟠 | `listCompetitions` 未回／失敗時活動被誤標「已刪除」且不可復原 | `COMPS_STATE`：只有 `'ok'` 才貼標；載入成功先移除同 value 占位再重對齊下拉 |
| M2 | 🟠 | 首屏靜態建議卡 `data-sg` 寫死中文 | 拿掉 `data-sg`（退回 textContent）＋ init 呼叫 `renderMessages()` |
| M3 | 🟠 | `applyI18n()` 洗掉 `#kbTitle` 的活動版標題（已知陷阱） | boot 時 `removeAttribute('data-i18n')` |
| M4 | 🟠 | 選「特定活動」未挑活動就送出 → 靜默建成主辦後台對話 | sendBtn（僅新對話）與 newConvBtn 守門 `uiAlert(adAiKbPickComp)`，在清空輸入前 |
| M5 | 🟠 | 後端 question 靜默截 6000 字，前端卻落盤全文 | 上限改 10000（與 appendMessage 對齊）並**明確拒絕**（`errorCode:TOO_LONG`）；前端送出前也擋 |
| L1 | 🟡 | 截斷警語被落盤、下一輪當 model turn 回送 | 旗標 `_truncated` 留記憶體，`renderMessages` 另繪 `.trunc-note`；落盤原始 answer |
| L2 | 🟡 | 配額／金鑰錯誤不輪換 key | `RESOURCE_EXHAUSTED / PERMISSION_DENIED / UNAUTHENTICATED` 才 `rotateGeminiKey()` |
| L3 | 🟡 | `{error}` 寫死中文 | 後端加 `errorCode`＋`detail`，前端 `ERR_KEYS` 映到 `adAiErr*`（zh/en） |
| L4 | 🟡 | 建立新對話中切語言，按鈕標籤被舊字串蓋回 | `done()` 改取 `L('adAiNewConv')` |
| L5 | 🟡 | 長不可斷字串讓 `.messages` 出現橫向捲軸（既有） | `.msg > div:not(.av-m){min-width:0}` ＋ `.bubble{overflow-wrap:anywhere}` |
| L6 | 🟡 | 深色主題 `.scope-chip.comp` 對比 2.5:1 | 文字色改 `color-mix(#8B5CF6 65%, var(--ink))` |
| L7 | 🟡 | 確認文案「原對話仍保留在歷史清單」與 comp 過濾行為不符 | 文案改「不會被刪除，切回原範圍即可找到」 |
| L8 | 🟡 | §8-2 漏列 question 截斷／空問題拒絕 | 見下方補列 |

駁回 3 條（不處理）：`deleteConversation` 不看 `res.success`（權限分支不可達、非本次引入）；截斷警語「回送 Gemini」加重版（併入 L1）；60s 逾時 vs 8192 tokens（因果推論不成立）。

### §8-2 補列（先佈後端、舊前端仍在線時也會生效）
| 變化 | 對舊前端的影響 | 風險 | 緩解 |
|---|---|---|---|
| question > 10,000 字 → `{error, errorCode:TOO_LONG}` | 舊前端無長度限制，超長問題從此被明確拒絕（改版前無上限直送） | 🟢 低（10,000 字 = appendMessage 既有上限；且舊前端會把 error 字串當回答顯示） | 不再靜默截斷；字串為中文 |
| 空問題 → `{error, errorCode:EMPTY}` | 舊前端送出鈕在空字串時本來就 disabled | 🟢 低 | — |
| 配額／金鑰錯誤輪換 key | 對使用者不可見；下一次呼叫改用下一把 key | 🟢 低 | 只針對三種 status |

### §7 驗收補充（外審建議，共 8 項）
13. 版面斷點：加測 **769 / 820 / 900 / 1000 / 1100px**，`.center-c` 寬度 > 0、輸入框可見、右欄／左欄依斷點變抽屜。
14. 短視窗 1024×600：`.chat-h` 高度 ≤ ~70px，送出鈕完整在視窗內。
15. 建立失敗路徑：DevTools 斷網 → 無選中對話送出 → `uiAlert` 且原文回到輸入框。
16. `listCompetitions` 失敗：阻擋該請求 → 點活動對話 → 不得顯示「（此活動已刪除）」。
17. 英文首屏：切 EN → 重整 → 點第一張建議卡 → 送出內容與回答皆英文。
18. 語言切換洗字：範圍在特定活動 → 切 EN → 知識庫標題維持 "Knowledge Base · This Event"。
19. 深色模式：開活動對話 → scope chip 清晰可讀。
20. 長問題：貼 10,001 字 → 送出前被擋並顯示字數；後端直接呼叫也回 `TOO_LONG`。

## 8-9 第二輪外審（wf_389c721c-1a9，31 agents：16 位修正驗證者＋2 位回歸掃描＋反駁＋彙整）

結論「PASS with fixes，不可照現狀佈署」：17 條修正中 11 條確認修好、4 條修一半（H1／M-iOS／L2／L3）、H2 與 M-iOS 各引入 1 個回歸、1 條文件不全（L8）；新發現 6 條（1 高 1 中 4 低）。**以下全部已修：**

| 來源 | 問題 | 修法 |
|---|---|---|
| 新 ① 🔴 | 孤兒對話（活動已被 `deleteCompetition` 刪除、`aiConversations` 不連帶清）：死 compId 通過所有新守門 → 建出永遠無解的對話、KB 面板畫樂觀預設、每次重試都把問題落盤、後端 `compAuthCallable` 必 throw not-found | `COMP_DELETED` 旗標（`setScopeUI` 判定）；sendBtn／newConvBtn 一律擋下（`adAiCompGone`）；KB 面板改顯示「活動已刪除」且不呼叫後端；`getCompKbStatus` 失敗改顯示「載入失敗」而非樂觀預設 |
| 新 ② 🟡 | 抽屜 body class 跨斷點殘留（平板直轉橫）：黑幕留著、抽屜已回版面、按鈕已隱藏 | `matchMedia('(max-width:900px)' / '(max-width:1100px)')` change → `closeDrawers()` |
| H1 殘留 | 建立中被點走（`_creating` 被洗掉）→ `creationFailed` 空操作、原文永久遺失 | `selectConv` 在 `_creating` 期間擋下（`adAiBusy`）；`creationFailed` 不論狀態一律救回原文（輸入框有新內容則接在後面）＋ `uiAlert` |
| M-iOS 回歸 | 只覆寫 `.admin`，共用 `.side{height:100vh}` 仍撐出可捲空白；≤768 抽屜寫死 100vh 讓底部「登出」落在 dvh 外點不到 | 本頁補 `.side{height:100dvh}`；`≤768px .side{height:auto}`（由 top:0/bottom:0 決定高度） |
| L2 殘留 | 金鑰被撤銷時 Google 回 400 `INVALID_ARGUMENT`，訊號在 `details[].reason === "API_KEY_INVALID"` → 永不輪換、永不自癒 | 另判 `reasons` 含 `API_KEY_INVALID` 或 message 含「API key not valid」 |
| L3 殘留 A／新 ③ | 錯誤泡泡存的是已本地化字串，切語言後凍在原語言 | 訊息上存 `_err:{error,errorCode,detail}`，`renderMessages` 繪製時才 `localizeErr` |
| L3 殘留 B | callable 在 handler 前就 throw（not-found／方案守門／internal）沒有 errorCode，英文介面看到中文 | 失敗回呼用 Firebase `error.code` 對應（`FB_CODES`）：not-found／unauthenticated／permission-denied／deadline-exceeded／internal；方案守門的原訊息保留為 detail |
| 新 ④ | 建立中切語言，`applyI18n` 把「建立中⋯」洗回「＋ 新對話」 | `newConvBtn` boot 時 `removeAttribute('data-i18n')`，lang-changed handler 自己更新（`!CREATING` 時） |
| 新 ⑤ | `maxOutputTokens` 8192 讓 answer 可能超過 `appendMessage` 的 10000 字，落盤被靜默切掉 | 前端 `answer.length > 10000` 也標 `_truncated` 提示 |
| 新 ⑥／L8 殘留 | §8-2 漏列「提示語改寫」且「模型看到的資訊完全相同」敘述不實；`---` 邀請對舊前端是字面顯示＋落盤 | §8-2 補列並改寫；規則 1 拿掉「分隔線 ---」 |
| H3 殘留 | `.chat-title{flex:1}` basis=0，1101–1152px 標題 0 寬 | 改 `flex:1 1 auto` |
| M1 殘留 R1 | 占位選項文字不隨語言換 | lang-changed handler 重寫 disabled 選項文字；`listCompetitions` 裡的幽靈清除死碼已移除 |

駁回 5 條（不處理）：AI 抽屜壓在主側欄黑幕下（UI 不可達）；延遲 `setScopeUI` 多打一次 `getCompKbStatus`（無可見失敗）；外層 catch 無條件輪換（未改動且不衝突）；EXCEPTION 路徑外洩金鑰（觸發條件不會 throw）；legacy 頁把 `{error}` 畫成空泡泡（事實但非缺陷、legacy 未部署）。

明列不處理的殘留（超出本次範圍，記錄供日後）：M1-R2 開頁後新建的活動要重整才會出現在下拉；M1-R3 被縮限權限的活動會被標成已刪除；M4 `createConversation` 後端無伺服端 compId 檢查（純前端守門）；M5 `geminiEmbed` 的 8000 字切片只影響向量檢索；`rotateGeminiKey` 無 CAS（併發配額失敗可能轉回原點）；L7 comp→host 其實不需切回也看得到（文案偏保守）。

## 8-10 第三輪外審（wf_958a8f50-977，22 agents）

結論「PASS with fixes」：12 條二審修正 9 條完全成立無回歸；3 條殘留與 3 條新發現全部收斂到小修。**以下全部已修：**

| 來源 | 問題 | 修法 |
|---|---|---|
| 新 A 🟠 | `newConvBtn` 拔掉 `data-i18n` 後 boot 沒補字，英文介面首載按鈕永遠是 HTML 裡的中文 | boot 補 `newConvBtn.textContent = L('adAiNewConv')`；lang-changed 用 `L(CREATING ? 'adAiCreating' : 'adAiNewConv')` |
| 新 B 🟠 | lang-changed 裡占位選項改字排在 `renderConvs`/`renderScopeChip` 之後，chip 與 pill 永遠慢一個語言 | 迴圈搬到 handler 最前面 |
| R2-① 殘留 | 孤兒守門單靠 `COMPS_STATE==='ok'`；`listCompetitions` 失敗（不重試）時整套失效 | 加第二訊號：`getCompKbStatus`／`askAdminAI` 失敗回呼收到 `functions/not-found` → `markCompDeleted(compId)`（標 ghost option、COMP_DELETED、重繪）；KB 成功回呼加 `!COMP_DELETED` 防蓋掉提示 |
| 新 C 🟢 | 活動清單未回／失敗時 chip 謊稱「未選擇活動」 | chip 三態：已刪除／載入中（`adAiScopeChipLoading`）／失敗時顯示 compId |
| R2-L3 殘留 | `selectConv` 的 `fail(res.message)` 把後端中文丟到英文介面 | 一律 `L('adAiLoadFail')` |
| R2-H1 殘留 | `CREATING` 未進送出門檻，先打字再按＋新對話再 Enter 只會冒「AI 回覆中」 | sendBtn 加 `CREATING` 守門（`adAiBusy`） |
| 註解 ×2 | ai.html dvh 註解誤說追鍵盤；index.js 註解「與改版前相同」與規則 5/6/7 矛盾 | 已改寫 |

駁回 4 條（不處理）：`paintCompKb` 未轉義 `regCount`（值不可控）；§6 漏列 bridge（Hosting 一佈即含）；§8-1 行號（核對正確）；外層 catch 無條件輪換（§8-9 已接受）。

### 佈署空窗注意（三審新增）
functions 先上之後，**線上仍開著舊分頁的主辦方**會收到新的 `{error}` 字串，舊碼會把它當回答 `appendMessage` 落盤（污染歷史）。→ **離峰時段、functions 佈完立刻佈 Hosting**，把空窗壓到分鐘級。

### 預覽驗收（三審挑出的 8 項關鍵，補在 §7 之後）
21. 英文首載：`?lang=en`（或已持久化 EN）直接開頁，左欄按鈕必須是 "＋ New chat"。
22. 語言來回：開孤兒對話（活動已刪除），zh→EN→zh，下拉／chip／左側 pill 三處文字同語言。
23. 多輪對話：連問三題、第三題用代詞（「那它呢」），模型有上下文且不複述前文。
24. 超長回答：泡泡底下出現截斷提示；重整後不再出現（設計如此）。
25. iPhone／iPad 直橫轉向：抽屜開著轉向 → 抽屜關、遮罩消失；≤768 主側欄抽屜能捲到「登出」。
26. 1050→1200px 慢慢拖：標題列單行、標題不消失、無橫向捲軸。
27. 建立中防呆：先打字 → 按「＋ 新對話」→ 立刻 Enter／點歷史 → 只出現提示、輸入框內容還在。
28. 錯誤本地化：EN 下斷網送出 → 英文錯誤泡泡；切回中文 → 同一顆泡泡變中文。

## 8-11 第四輪外審（wf_263a343e-1c8，12 agents）

結論「PASS with fixes」：7 條三審修正 5 條完整通過；**獨立新發現通過反駁者：0**。兩條收斂項與低嚴重度小修全部已修：

| 來源 | 問題 | 修法 |
|---|---|---|
| A 🟠 | `compAuthCallable` 只對 competition 角色檢查活動存在；**system 角色**開孤兒對話時 `getCompKbStatus` 回 `{}`（前端畫「尚未設定知識庫」假訊息）、`askAdminAI` 靜默略過活動脈絡照答並落盤 | 後端 `getCompKbStatus` 活動不存在改 throw not-found；`askAdminAI` 在 handler 內回 `{error, errorCode:"NOT_FOUND"}`；前端成功回呼看到 `NOT_FOUND` 也呼叫 `markCompDeleted` |
| B 🟠 | `selectConv` 只擋 `SELECTED._creating`，「＋ 新對話」建立中（`CREATING`）點歷史對話會無提示穿過、之後被硬拉回新對話 → 驗收 27 必 FAIL | `selectConv` 加 `CREATING` 守門 |
| C-1 🟢 | 建立中的提示用「AI 回覆中」文案自相矛盾 | 新鍵 `adAiCreatingWait`，sendBtn／selectConv／submitSuggestion 三處使用 |
| C-2 🟢 | 建議卡在忙碌中會覆寫輸入框又送不出去 | `submitSuggestion` 忙碌時提示、不覆寫 |
| C-3 🟢 | `paintCompKb` 未用的第二參數與 `currentCompName`（讀 DOM 取名，正是 R3-B 修掉的模式） | 移除 |
| C-4 🟢 | 活動名為空時 option 文字空 → 存活活動被顯示成「已刪除」 | option 文字 `c.name \|\| c.compId` |
| C-6 🟢 | 註解行號過時 | 已改 |

駁回 3 條（`mdToHtml` 既有行為：表格裸管線、縮排子編號壓平、圍欄語言標籤）——與上線版逐位元組相同，非本次引入，列入 §9 日後改善。

### 部署空窗補述（四審）
全站沒有 service worker、也沒有強制 reload：**已開著的舊分頁在使用者重整前會一直用舊碼**，收到新的 `{error}` 就當回答 `appendMessage` 落盤。所以「functions 佈完立刻佈 Hosting」只能縮短新開分頁的空窗；對既開分頁無效。緩解：離峰佈署；佈完後若看到 `aiMessages` 出現「AI 暫時無法使用／請輸入問題」之類的 AI 訊息，屬空窗期舊分頁所寫，可手動清理。

### §9 新增（日後改善，非本次）
- `mdToHtml`：表格、縮排巢狀編號、圍欄語言標籤（既有行為）。

## 8-12 第五輪外審（wf_1fb1c500-18c，9 agents）

結論「PASS with fixes」：7 條四審修正 4 條完整通過、0 回歸、**新發現 0**；3 條小殘留已修：

| 來源 | 問題 | 修法 |
|---|---|---|
| R4-C1 殘留 | `requestScopeChange` 在建立中仍用「AI 回覆中」文案 | 三元式改 `adAiCreatingWait` |
| R4-C2 殘留 | `submitSuggestion` 未含 COMP_DELETED／未選活動守門，草稿被覆寫後才被拒送 | 兩條守門前置；有草稿時送出後放回輸入框 |
| 化妝級 | `selectConv` 建立中守門排在「已是目前對話」短路之前，重點目前對話會多跳提示 | 對調順序 |
| R4-DOC 殘留 | §8-1「1 支」、§8-2「不會出現半套狀態」、§8-5 回滾只寫一支 | 三處已同步為兩支，並補「逐支核對 updateTime」 |

明列接受的殘留（不處理）：
- **「先漏一次再封鎖」**：孤兒對話第一次送出時 `appendMessage(user)` 在 `askAdminAI` 之前就寫入（既有結構），守門在第一次往返後才鎖上；代價是一則無回覆的 user 訊息，不影響資料正確性。
- `functions/not-found` 也可能由傳輸層 404（函式不存在／區域不符）合成而誤標活存活動：穩態不可達，重整即復原；已記錄為風險。
- 佈署依賴：R4-A 兩支函式都要真的上線（見 §8-2 半套狀態說明）。

## 8-13 第六輪外審（wf_8b2b0325-3d2，5 agents）

結論「PASS with fixes，可以佈署」：3 條五審修正 2 條完整通過、1 條為純文案（提示文字與畫面指示器不一致）、新發現 0（同一行的既有措辭問題）。已修：

| 來源 | 問題 | 修法 |
|---|---|---|
| R5-C1 殘留 | 三處忙碌提示用內部旗標判文案：`SELECTED._creating` 期間畫面是「思考中⋯」卻跳「新對話建立中」；`LOADING_ID` 期間畫面是「載入對話中⋯」卻跳「AI 回覆中」 | 統一 `busyKey()`：`CREATING → adAiCreatingWait`、`BUSY → adAiBusy`、否則 `adAiLoadingConv`（依畫面實際指示器） |
| 驗證者順手發現（**既有**，改版前即如此） | 新對話第一則訊息：`renderMessages()` 在 `SELECTED` 仍為 null 時執行 → 走空白分支，樂觀泡泡與「思考中」畫不出來，AI 回覆前看起來像沒反應 | sendBtn 先放佔位 `SELECTED={id:null,_creating:true,compId}` 再 render |

## 8-14 第七輪外審（wf_94b67884-4f6，4 agents）＋ 外審收斂結論

結論「PASS with fixes（可部署）」：2 條六審修正 1 條完整通過、1 條僅剩純文案級殘留；**無回歸、新發現 0**。

| 來源 | 問題 | 處置 |
|---|---|---|
| R6-busyKey 殘留 | AI 回覆中（BUSY）切到別的對話：載入骨架蓋掉 typing 泡泡，此時點範圍鈕提示「AI 回覆中」但畫面是「載入對話中⋯」（情境 A）；載入完成後 BUSY 仍為 true 而畫面無任何忙碌指示（情境 B） | 情境 A：`busyKey()` 改為 LOADING 優先於 BUSY（一行）。情境 B：**接受**——「AI 回覆中」在語意上仍為真（回覆在另一段對話進行中），且 §5-6 的產品決定是「回覆中允許切對話」，加 BUSY 護欄會推翻該決定。列為後續 polish。 |

### 七輪總覽
| 輪 | agents | 判定 | 新發現 |
|---|---|---|---|
| 1 | 44 | PASS with fixes | 16 條（3 高 6 中 7 低） |
| 2 | 31 | PASS with fixes，不可照現狀佈署 | 6 條（1 高） |
| 3 | 22 | PASS with fixes | 3 條（2 中 1 低） |
| 4 | 12 | PASS with fixes | 0（2 條收斂項） |
| 5 | 9 | PASS with fixes | 0（3 條一行級） |
| 6 | 5 | PASS with fixes，可以佈署 | 0（純文案） |
| 7 | 4 | PASS with fixes，可部署 | 0（純文案，已接受） |

連續四輪新發現為 0、最後兩輪明確判「可部署」，外審在此收斂。所有修正皆通過自審（語法／單元測試／i18n 完整性）。

## 9. 不在本次範圍
- `listConversations` 主辦後台範圍列出所有對話（含活動對話）：維持現狀，用 pill 顯示活動名就夠辨識。
- 對話記憶改由後端從 `aiMessages` 讀取（更嚴謹，但要處理 `appendMessage` 與 `askAdminAI` 平行的競態）：留待下一輪。
- Gemini 串流輸出（逐字顯示）：架構改動大，另案。
