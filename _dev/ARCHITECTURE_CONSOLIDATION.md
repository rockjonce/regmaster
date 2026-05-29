# RegMaster v3 程式碼架構整合建議書

> **狀態**：建議書（尚未執行）
> **撰寫日期**：2026-05-29
> **適用專案**：`regmaster-v3`（獨立於 production `regmaster-pro`）
> **讀者**：專案維護者（你）＋ 未來接手的協作開發者
> **產出方式**：先盤點現況 → 分類問題 → 提出整合後架構 → 分階段、可逆、零風險優先的執行計畫
> **重要前提**：本建議書所有改動只針對 `regmaster-v3`，**絕不觸碰 `regmaster-pro` production**。

---

## 1. 摘要與目標

RegMaster v3 是一套活動報名 SaaS，後端為單一 `functions/index.js`（約 4,750 行、約 95 個 Cloud Functions callable），前端為多頁式 admin 介面（15 個 `public/admin` 頁）＋ 共用模組 `public/shared/*`。

整體架構**底子健康**：權限有三層 wrapper（`callable` / `authCallable` / `compAuthCallable`）、前端已抽出共用側欄與對話框模組。但因為是**快速迭代堆疊**而成，累積了三類「技術債」：

1. **相同邏輯被重寫多份且彼此分歧** —— 最危險的是「授權/方案等級判定」在三個地方各寫一份，且**判斷規則已經不一致**（會對同一張授權碼得出不同結論）。
2. **相同功能的權限守門不一致** —— 同一種能力有「新舊兩個 endpoint」，新的有 tier 守門、舊的沒有，等於付費牆可被繞過。
3. **前端每頁各自複製貼上** —— `escapeHtml` 被複製 15 份、CSS 元件樣式各頁重寫、`<head>` 載入區塊手動同步。

**本建議書的目標**：把「相同功能、相同權限」的程式碼統整成**單一可信來源（single source of truth）**，在不改變對外行為的前提下降低重複、消除分歧，並用「零風險優先、分階段、每階段可獨立部署與回滾」的方式執行，全程不影響 production。

> **「最危險的 bug」≠「最高風險的修正」**：本書認定**最危險的 bug** 是 A-1（授權判定分歧，影響收費正確性）；但**風險最高的「修正動作」**是 P4（formSchema 收斂，會改 schema 寫入語意）。兩者是不同軸：一個講「現況哪裡最容易出錯」，一個講「動它最容易把事情弄壞」。執行順序依「修正風險」排，不是依「bug 危險度」排。

> **方案等級由低到高**：FREE < STARTER < PRO < TEAM（對應 `TIER_RANK` 0/1/2/3）。下文「STARTER+」表示「STARTER 以上（含）」，「PRO+」同理。

**預期成果**：
- 後端 1 份授權判定、1 份寄信、1 份 Gemini 呼叫、1 份容量判定。
- 付費牆（tier gate）在「所有同功能 endpoint」一致生效，無繞道。
- 前端共用 `util.js` / `session.js`，刪掉 ~15 份重複 helper 與多份 CSS override。
- 一份完整的「callable → wrapper → 權限 → tier 守門」對照表，作為日後新增功能的檢查清單。

---

## 2. 現況架構概覽

### 2.1 後端（`functions/index.js`）

單檔，依功能分區（de-facto sections，非強制）：

| 區段 | 約略行數 | 內容 |
|------|---------|------|
| Helpers | 19– | `fmtNow`、`generateId`、`emailWrap`、`auditLog` |
| TOTP 2FA | 171– | base32 / HMAC / `totpVerify` |
| 帳號管理 | 205– | 登入、Google 登入、建立帳號、profile |
| Gemini / 通知 | 473– | key 輪替、`getNotificationsInternal` |
| 操作日誌 | 580– | `getAuditLogs`（已修為 system-only） |
| 競賽 CRUD | 630– | `createCompetition`、`saveCompetitionConfig` |
| 報名 / 隊伍 | 944– | `submitRegistration`、`exportTeamsCSV` |
| 評分 | 1796– | `saveScore`（舊）、`getScores` |
| 授權 / 方案 | 1815– | tier helpers、`createLicense`、`getLicenseStatus`、`activateLicense`、`consumeLicense` |
| AI | 2172– | `askCompetitionAI`、`askAdminAI`、`analyzeRulesWithAI`、`analyzePosterColors` |
| 金流 | 3061– | `createPayuniOrder`、`payuniNotify` |
| 公告 campaigns | 4098– | `createCampaign` / `update` / `delete` / `sendCampaignNow` |
| 評分 V2 / 報到 V2 | 4210– | `submitJudgeScore`、`checkInTeamV2` |
| 表單 schema | 4302– | `getFormSchema`、`saveFormSchema` + legacy derive |
| 儀表板 | 4498– | `getAiInsights`、`getTodoList` |

**權限三層 wrapper（已是良好設計，保留）**：
- `callable(handler)` —— 無驗證（參賽者面向：報名、付款回呼、聯絡表單）。
- `authCallable(roles, handler)` —— session token 驗證 + 角色檢查（`["system"]` 或 `["system","competition"]`）。
- `compAuthCallable(handler)` —— 在 `authCallable(["system","competition"])` 之上，額外驗證「該活動屬於呼叫者」（從 `data.compId` / `data.teamId` 推導 owner）。

### 2.2 前端

- `public/shared/`：`styles.css`（design tokens + 元件）、`admin-layout.css`（admin 殼 + RWD）、`firebase-bridge.js`（callable 傳輸層 + `_argMap`）、`admin-nav.js`（角色化側欄殼）、`ui-dialog.js`（`uiAlert/uiConfirm/uiPrompt/uiToast`）、`app-state.js`（`ME/CFG/LANG/theme`）、`i18n.js`。
- `public/admin/*.html` × 15：各自一份內嵌 `<style>` 與內嵌 `<script>`，透過 bridge 呼叫後端。
- `public/legacy/index.html`（6,630 行）：舊版單頁 SPA，**完全獨立、不引用任何 v3 shared 模組**，保留作為 3 個月過渡期的回滾路徑（`firebase.json` 仍有 `/legacy/**` rewrite）。

### 2.3 已經做對、本次不動的部分

- 三層 auth wrapper 的設計與 `compAuthCallable` 的 owner 驗證。
- `admin-nav.js` 統一側欄殼（已解決先前各頁側欄不一致 / null crash）。
- tier 後端模型（`TIER_RANK` / `getEffectiveTier` / `requireFeature`，本輪剛建立）。
- no-cache headers、emulator 自動偵測（bridge 內）。

---

## 3. 問題分類（含 file:line 證據）

> 所有行號為撰寫時 `functions/index.js` 或對應前端檔的實際位置；重構時以實際 grep 為準。

### A. 正確性風險（最高優先 — 可能造成資料/收費錯誤）

**A-1. 授權/方案判定有三份且規則分歧（嚴重）**
同一段「subscription / count / 永久 / 到期」判定邏輯被重寫三次，且**永久判定條件已不一致**：

| 位置 | 永久（lifetime）判定 |
|------|------|
| `getEffectiveTier`（L1847–1874，本輪新增） | `!l.expiresAt \|\| l.expiresAt === ""` |
| `getLicenseStatus`（L1962–2018） | `!l.expiresAt \|\| l.expiresAt === ""`（註解明寫「移除 'undefined' 字串判定」） |
| `consumeLicense`（L2125–2145，**L2133**） | `!l.expiresAt \|\| String(l.expiresAt).trim() === "undefined" \|\| l.expiresAt === ""` |

**後果**：一張 `expiresAt:"undefined"`（字串）的授權，在 `consumeLicense` 被當「永久有效」、但在 `getEffectiveTier` / `getLicenseStatus` 被當「已過期」。同一帳號的方案徽章、扣次數、功能解鎖會互相矛盾。
**修正方向**：抽 1 個 `resolveLicenses(username) → { tier, subValid, totalRem, hasLifetime, history }`，三處全部改用它。

**A-2. `formSchema` 與 legacy 報名欄位雙寫不同步（schema 債）**
v3 新報名表存在 `config.formSchema`，舊欄位 `customQuestions / studentCustomQuestions / teacherCustomQuestions / studentFields / teacherFields / memberCount / teacherCount` 仍同時存在。寫入/讀取分散：

| 行為 | 位置 | 說明 |
|------|------|------|
| 由 schema 推導 legacy（一致） | `saveFormSchema` L4472–4481（`deriveLegacyFromFormSchema` L4333） | ✅ 兩邊同步 |
| **只寫 legacy、不碰 formSchema（危險）** | `saveCompetitionConfig` L798–806 | ⚠️ 用設定表單改欄位 → `formSchema` 悄悄失同步 |
| 只 seed legacy | `createCompetition` L693–697 | 建立時無 `formSchema` |
| **只讀 legacy** | `exportTeamsCSV` L1599–1605 | 匯出 CSV 不看 `formSchema` |
| 讀 schema、fallback legacy | `getFormSchema` L4428–4432（`buildFormSchemaFromLegacy` L4370） | ✅ |

**後果**：用「表單設計器」改了表單後，再用「設定」分頁存一次，`formSchema` 可能被舊欄位覆蓋/失同步；CSV 匯出看不到新表單欄位。
**修正方向**：定 `formSchema` 為唯一真實來源 → `saveCompetitionConfig` 不再直接寫 CQ 欄位（改走同一 derive，或拒收）、`exportTeamsCSV` 改讀 `formSchema`。

### B. 權限一致性（付費牆繞道 / 防禦縱深）

**B-1. 同功能新舊 endpoint 守門不一致（付費牆可繞）**
- `saveScore`（L1796，`compAuthCallable`）**無 tier 守門**，但其新版 `submitJudgeScore`（L4210）有 `requireFeature(multiJudge)`（L4211）→ 走舊 endpoint 即可免費用「多評審」。
- `analyzeRulesWithAI`（L2575）、`analyzePosterColors`（L2640）呼叫 Gemini 但**無 `requireFeature("ai")`**，而 `askAdminAI`（L2348）、`getAiInsights`（L4508）有 → AI 付費牆有破口。
- `updateCampaign`（L4119）/ `deleteCampaign`（L4138）**無守門**，但 `createCampaign`（L4098）/ `sendCampaignNow`（L4150）有 `requireFeature("campaigns")` → 一致性破口（影響較小）。

**修正方向**：建立「同能力 = 同守門」原則；於上述 endpoint 補 `requireFeature`（或廢除舊版）。詳見附錄對照表。

**B-2. 前端 system-only 頁缺自我 role 守門（防禦縱深）**
`audit.html` 只檢查 session、**不檢查 `me.role`**（grep 無 role/noAccess）。它只靠側欄隱藏，直接打 `/admin/audit.html` 仍會載入畫面。
> 真正的安全邊界在後端（`getAuditLogs` 已修為 system-only），所以這是「畫面外洩」而非資料外洩，但仍應比照 `system.html`（L357–361 有正確 `if (me.role!=='system') 顯示 #noAccess`）補上守門。

**B-3. 公開 AI FAQ 無流量限制（次要）**
`askCompetitionAI`（L2173）為公開 `callable`（參賽者面向 FAQ bot，刻意不需登入），但**無任何流量/頻率限制**，會直接呼叫 Gemini → 可被濫用刷 API 額度。
> 修正方向：加上簡單的 per-IP / per-comp 節流（如每分鐘 N 次），或要求填過報名的 email。優先度低，但列入附錄 B 對照表以免遺漏。

### C. 後端重複邏輯（可整併的 helper）

| 編號 | 重複內容 | 位置（節錄） | 整併建議 |
|------|---------|------------|---------|
| C-1 | 寄信寫入 `mail` collection（手刻 `{to,message:{subject,html,text}}`）約 17 處 | L249,1083,1127,1166,1186,1295,1736,1787,2162,2888,3301,3454,3542,3608,3877,4186 | `queueMail(to, subject, html, text)` |
| C-2 | 授權碼字串產生（重刻 `generateId` 風格迴圈） | `createLicense` L1893–1898 | `generateLicenseCode()` |
| C-3 | 日期格式化（`toISOString().substring(0,10)`、手刻 `getFullYear()+...`） | L2031,2047,2096,3495,3678 | `fmtDate(d)` |
| C-4 | Gemini `generateContent` fetch + `candidates[0].content.parts` 解析 | L2190,2595,2643… | `geminiGenerate(prompt, opts)`（含失敗時 `rotateGeminiKey`） |
| C-5 | 通知 owner 過濾（`markNotificationRead` 內聯，未用 `getNotificationsInternal`） | L552–559 | `assertOwnsNotification(nid, authUser)` |
| C-6 | 容量判定（`maxCapacityLimit`/`capacityLimitUnlocked`） | L660,707,741,759 | `resolveCapacity(compData)` |
| C-7 | campaign owner 手動檢查（繞過 wrapper） | `updateCampaign` L4124–4127、`deleteCampaign` L4141–4143、`sendCampaignNow` L4157–4159 | 擴充 `compAuthCallable` 支援由 `data.campaignId` 推導 owner |

### D. 前端重複（每頁複製貼上）

| 編號 | 重複內容 | 範圍 | 整併建議 |
|------|---------|------|---------|
| D-1 | `escapeHtml`/`esc` 完全相同 | **15 份**（每個 admin 頁）；且 `ui-dialog.js` 內已私有定義一份 | 抽 `shared/util.js` 匯出 `window.escapeHtml`，刪 15 份 |
| D-2 | null-safe DOM setter（`setTxt/setHtml`、`_st/_sh`） | `events/index.html`、`events/edit.html` 等，3 種命名 | `util.js` 提供 `setTxt/setHtml/setHref` |
| D-3 | `parseDate` + `daysLeft` 倒數 | `events/index.html`、`events/hub.html`、`index.html` | `parseDate(s)` / `daysUntil(s)` |
| D-4 | 金額格式（`NT$` + `toLocaleString`） | `payments/hub/license/system` | `fmtMoney(n)` |
| D-5 | session bootstrap（`AppState.init()` + 無 session 就轉 login）逐字複製 | 全部 15 頁 | `requireSession()` 回傳 `me` |
| D-6 | 角色 → 標籤（`me.role==='system'?'系統管理員':'主辦方'`） | `index/settings/hub/events-index`… | `roleLabel(me)` + `requireRole('system')` |
| D-7 | 重複綁定 `#logoutBtn`（`admin-nav.js` 已綁過） | `index/events-index/hub/edit` | 刪各頁多餘監聽 |
| D-8 | CSS 元件 inline 重寫並覆蓋 shared | `.card`(styles.css:263)、`.kpi`(400)、`.tbl`(430) 被各頁 `<style>` 重定義 | 移除 inline override，改用 shared；缺的（`.fld/.lbl`、`.modal`、`.empty`、`.body-3`）上抬到 `admin-layout.css` |

> **註（已驗證的修正）**：`.kpi` 在 `index.html` 用的是不同子類名（`.label-k/.v-k/.delta-k` vs shared 的 `.label/.value/.delta`），所以是「兩套 `.kpi` 慣例並存」的重複，**非有害覆蓋**，correctness 風險低、合併時需視覺比對。

**D-9. `<head>` 載入區塊不一致（一致性風險）**
全部頁的 head 載入序列幾乎相同（firebase-app/functions/init → firebase-bridge → ui-dialog → app-state → admin-nav），但 **`index.html` 整個漏掉 `ui-dialog.js`**（其他頁皆於 L14 載入）→ 儀表板沒有樣式化的 `alert`/`uiToast`/`uiConfirm`。
> 已驗證範圍：缺漏的**只有 `index.html`**。`system.html` 有載入 `ui-dialog.js`（L14），但另外又自刻了一份 `toast()`（D-4/應改用 `uiToast`）。
**修正方向**：把整段 head include 抽成單一片段（或 `regmaster-head.js` loader），保證集合與順序一致。

### E. 結構 / 死碼

- **E-1 死碼（歸入 P0）**：快取已停用，但 `_cache`（L716）、`cGet/cSet/cDel`（L719–721）是空函式卻仍被呼叫（L724,743,815）。→ 刪除 shim 並移除呼叫。
- **E-2 排序（歸入 P1，純搬移）**：同類功能相隔很遠（`saveScore` L1796 ↔ `submitJudgeScore` L4210；`checkInTeam` ↔ `checkInTeamV2` L4279）。tier helpers 定義在第一個呼叫者之後（靠 runtime 才執行所以**不是 bug**，純可讀性）。→ 把 V2/legacy 配對移到一起；屬選做、零行為改動。
- **E-3 回應形狀（不做，列界線）**：主流為「業務錯誤回 `{success:false,message}`、auth/權限 throw `HttpsError`」，少數 getter 回 bare object / `null`（`getCompetitionConfig` L727、`getTeamDetail` L1512）。→ **低優先**，除非前端同步重構，否則統一 envelope 有 MEDIUM 風險（見 §7）。

---

## 4. 整合後的目標架構

### 4.1 後端

新增「純函式 helper 區塊」（檔案上方，所有 callable 之前），把同邏輯收斂為單一來源：

```
functions/
  index.js
    ├── lib/util         fmtNow, fmtDate, generateId, generateLicenseCode
    ├── lib/mail         queueMail(to, subject, html, text)   ← 取代 17 處
    ├── lib/gemini       geminiGenerate(prompt, opts)         ← 取代 fetch+parse 散落
    ├── lib/licenses     resolveLicenses(username)            ← A-1 唯一來源
    ├── lib/capacity     resolveCapacity(compData)            ← C-6
    ├── lib/forms        formSchema 為唯一來源的 read/derive  ← A-2
    └── auth wrappers    callable / authCallable / compAuthCallable（擴充 campaignId owner）
```

> 是否拆成多個檔案（`require('./lib/...')`）vs 同檔分區，取決於你偏好。**建議先在同檔分區**（風險最低、不動 module 載入），未來再視需要拆檔。

`resolveLicenses` 是 A-1（授權判定）與所有 tier 守門的共同地基；`getEffectiveTier` / `getLicenseStatus` / `consumeLicense` 都改成它的薄包裝。**先有這個單一來源，後續的 tier 守門才有可信依據**（這也是執行順序把「授權單一化」排在「補守門」之前的原因，見 §5）。

### 4.2 前端

```
public/shared/
  util.js        ← 新增：escapeHtml, setTxt/setHtml/setHref, parseDate, daysUntil, fmtMoney
  session.js     ← 新增：requireSession() → me（無則轉 login）、roleLabel(me)、requireRole('system')
  styles.css     ← 既有元件（.card/.kpi/.tbl）成為唯一來源
  admin-layout.css ← 上抬 .fld/.lbl/.modal/.empty/.body-3
  (head 片段)    ← 單一 include 順序（補上 index.html 的 ui-dialog.js）
```

各 admin 頁：刪掉內聯的 `escapeHtml`、DOM setter、`parseDate`、session bootstrap、role label、重複 logout 綁定、與 shared 衝突的 CSS。

### 4.3 「同功能 = 同守門」原則（附錄對照表落實）

建立一張權威對照表（附錄 B），任何新增 callable 必須在表上登記 wrapper + 角色 + tier 守門；review 時對照表即檢查清單，杜絕 B-1 類破口再生。

---

## 5. 分階段執行計畫（零風險優先、每階段可獨立部署 / 回滾）

> 原則：**先做不改行為的整併（純抽取），再做修正分歧的行為改動**。每階段獨立 commit、`node --check` + emulator smoke + 部署 v3 + 抽查，再進下一階段。任何階段失敗即停、不續推。

### P0 — 零風險清理（不改任何對外行為）
- E-1 刪死碼 cache shim。
- D-9 補 `index.html` 的 `ui-dialog.js`、抽 head 片段。
- D-7 刪重複 logout 綁定。
- **驗證**：`node --check` 全頁；emulator 開每頁確認無 console error。**可單獨部署**。

### P1 — 純抽取整併（行為不變，只去重）
- 後端：`queueMail`(C-1)、`fmtDate`(C-3)、`generateLicenseCode`(C-2)、`geminiGenerate`(C-4)、`resolveCapacity`(C-6)、`assertOwnsNotification`(C-5)。
- 前端：`shared/util.js`(D-1~D-4)、`shared/session.js`(D-5,D-6)，逐頁替換並刪重複；CSS override 收斂(D-8)。
- **驗證**：每抽一個 helper，grep 確認呼叫點全部替換、舊定義刪除；emulator 跑「登入→建活動→報名→匯出→付款→AI」一輪 smoke。

### P2 — 授權判定單一化（正確性地基，先做）
- A-1：抽 `resolveLicenses(username)`，`getEffectiveTier` / `getLicenseStatus` / `consumeLicense` 三處改薄包裝。**統一規則：採「`!expiresAt || expiresAt===''` 即永久」**，丟棄 `consumeLicense` 殘留的 `"undefined"` 字串特例；若 DB 內真有此髒值，先寫一次性 migration 清成空字串。
- **為何排在 P3 之前**：tier 守門（`requireFeature`）依賴 `getEffectiveTier`。先讓授權判定成為單一可信來源，後面補的守門才不會建立在彼此矛盾的等級結論上。
- **驗證**：對「永久訂閱 / 一般到期 / 已過期 / 次數型 / 多張疊加」各建一筆測試授權，比對 `getLicenseStatus`、`getEffectiveTier`、`consumeLicense` 三者結論一致。

### P3 — 權限一致性修正（行為改動：補守門，建立在 P2 之上）
- B-1：`saveScore` 補 `requireFeature(multiJudge)`（或廢除）；`analyzeRulesWithAI`/`analyzePosterColors` 補 `requireFeature(ai)`；`updateCampaign`/`deleteCampaign` 補 `requireFeature(campaigns)`。
- B-2：`audit.html` 補 `requireRole('system')`。
- B-3（選做）：`askCompetitionAI` 加流量限制。
- **驗證**：用 FREE / PRO / system 三種帳號各打一次被改的 endpoint，確認 FREE 被擋、PRO/system 通過。

### P4 — formSchema 單一來源（schema 債，最高風險、最後做）
- A-2：`saveCompetitionConfig` 停止直接寫 CQ 欄位（改走 derive 或拒收）；`exportTeamsCSV` 改讀 `formSchema`（legacy fallback 保留）。
- **驗證**：用「表單設計器改表單 → 設定分頁存檔 → 再匯出 CSV」確認三者一致、無欄位遺失；對既有活動跑相容性檢查。
- **回滾**：依賴 `_dev/backup/cleanup-dual-write.js` 作為資料層回復路徑。**注意**：此檔目前是 V3 升級計畫中的「待建」項（見 `_dev/V3_UPGRADE_PLAN.md`），**P4 動工前必須先確認它已實作**，否則此階段沒有資料層 rollback，不應開始。

### 階段相依與順序
P0 → P1 → **P2（授權單一化）→ P3（補守門，依賴 P2 的單一來源）** → P4（formSchema）。其中 B-2（`audit.html` role 守門）與授權邏輯無關，若想提早可獨立抽出與 P0/P1 一起做。P4 最後做，因為它改 schema 寫入語意、blast radius 最大，且需先備妥 rollback 腳本。

---

## 6. 跨階段通用紀律（每個階段都適用，不重複各階段 §5 的驗證）

> 各階段「怎麼驗」寫在 §5 每一段的「驗證」列；本節只列「不分階段、整個重構過程都要遵守」的紀律。

1. **部署紀律**：所有部署只對 `regmaster-v3`（`firebase deploy --only … --project=regmaster-v3`）；**永不**對 `regmaster-pro`。
2. **每改必過 `node --check`**：後端 `node --check functions/index.js`；前端內嵌 script 抽出後 `node --check`（本輪已用此法擋下語法錯誤）。
3. **CPU 配額感知部署**：改 `index.js` 會讓 CLI 重佈全部 95 函式，易撞 Cloud Run「per-region CPU」上限。→ 部署失敗的函式**分批重試**（等舊 revision 釋放 CPU，約數分鐘）；本輪已驗證重試即成功。此為操作須知，與架構無關但攸關「改完佈得上去」。
4. **行為不變 / 行為改動分離**：P0–P1 不改對外行為（出問題易定位），P2–P4 才動行為。這是整個計畫的排序原則。
5. **每階段一個 commit**：訊息標明階段與風險級別；本機 commit、**不 push 遠端**（依既有規範）。
6. **grep 收尾**：每抽一個 helper，grep 舊定義/舊呼叫確認**零殘留**，避免「抽了一半、兩份並存」反而更亂。

---

## 7. 不建議改動的部分（明確劃出界線）

- **`public/legacy/index.html`（6,630 行）**：刻意保留的回滾版本，價值在「完全獨立、不依賴 v3 shared」。**不要去整併它**。待 3 個月過渡期結束，另開票移除檔案 + 移除 `firebase.json` 的 `/legacy/**` rewrite。
- **回應形狀統一（E-3）**：除非前端同步重構，否則把 getter 改成 `{success,data}` envelope 會打到既有呼叫點，MEDIUM 風險、低報酬，**暫不做**。
- **後端拆多檔（require 模組化）**：先「同檔分區」即可達成去重目標；拆檔屬可選的後續優化，非本次必要。

---

## 8. 附錄

### 附錄 A — 重複/分歧證據速查（file:line）

- 授權判定三份：`getEffectiveTier` L1847–1874 / `getLicenseStatus` L1962–2018 / `consumeLicense` L2125–2145（分歧點 **L2133**）。
- formSchema 雙寫：寫一致 `saveFormSchema` L4472；只寫 legacy `saveCompetitionConfig` L798；只讀 legacy `exportTeamsCSV` L1599；schema-first 讀 `getFormSchema` L4428。
- tier 守門破口：`saveScore` L1796（無）vs `submitJudgeScore` L4211（有）；`analyzeRulesWithAI` L2575 / `analyzePosterColors` L2640（無）；`updateCampaign` L4119 / `deleteCampaign` L4138（無）。
- 寄信 17 處：L249,1083,1127,1166,1186,1295,1736,1787,2162,2888,3301,3454,3542,3608,3877,4186。
- 死碼 cache：`_cache` L716、`cGet/cSet/cDel` L719–721、呼叫 L724,743,815。
- 前端 `escapeHtml` 15 份（各 admin 頁）；`ui-dialog.js` L17 已私有一份。
- `index.html` 缺 `ui-dialog.js`（其他頁 L14 皆有）。
- shared CSS 唯一來源：`.card` styles.css:263、`.kpi` :400、`.tbl` :430。

### 附錄 B — Callable → wrapper → 權限 → tier 守門 對照表（落實「同功能同守門」）

> 以下為**目標狀態**；標 ⚠️ 者為本建議書要補齊的守門。完整 95 個 callable 於執行 P2 時逐一登記。

| Callable | Wrapper | 角色 | Tier 守門（目標） | 現況 |
|----------|---------|------|------------------|------|
| `getAuditLogs` | authCallable | system | — | ✅ 已修 system-only |
| `markNotificationRead` | authCallable | system,competition | — (owner 檢查) | ✅ 已修 owner |
| `createCompetition` | authCallable | system,competition | 活動數上限 | ✅ |
| `saveCompetitionConfig` | compAuthCallable | (owner) | 容量 + 啟用金流=payment | ✅ |
| `exportTeamsCSV` | compAuthCallable | (owner) | csvExport(STARTER+) | ✅ |
| `askAdminAI` / `getAiInsights` | comp/authCallable | (owner)/both | ai(PRO+) | ✅ |
| `submitJudgeScore` | compAuthCallable | (owner) | multiJudge(PRO+) | ✅ |
| `saveScore` | compAuthCallable | (owner) | multiJudge(PRO+) | ⚠️ 待補（B-1） |
| `analyzeRulesWithAI` | compAuthCallable | (owner) | ai(PRO+) | ⚠️ 待補（B-1） |
| `analyzePosterColors` | compAuthCallable | (owner) | ai(PRO+) | ⚠️ 待補（B-1） |
| `createCampaign` / `sendCampaignNow` | compAuthCallable | (owner) | campaigns(PRO+) | ✅ |
| `updateCampaign` / `deleteCampaign` | compAuthCallable | (owner) | campaigns(PRO+) | ⚠️ 待補（B-1） |
| `askCompetitionAI` | callable | 公開 | （公開 FAQ，建議加流量限制） | ⚠️ 無節流 |

### 附錄 C — 名詞解釋（給新進開發者）

- **callable**：Firebase Cloud Function（`onCall`），前端透過 `firebase-bridge.js` 的 `google.script.run.<name>(...)` 呼叫。
- **tier / 方案等級**：FREE / STARTER / PRO / TEAM；以 `licenses` collection 內 `activatedBy==使用者` 的訂閱推導「最高有效等級」（`getEffectiveTier`）。
- **tier 守門（`requireFeature`）**：在 callable 內檢查呼叫者方案是否達到該功能門檻；system 角色一律放行。
- **formSchema vs legacy 欄位**：v3 表單設計器產生的新 schema（`config.formSchema`）vs 舊版扁平欄位（`customQuestions` 等），目前雙寫、待收斂為單一來源。
- **compAuthCallable**：除了登入與角色，還驗證「這個活動是不是你建立的」。
- **`mail` collection 寄信慣例**：後端不直接寄信，而是寫一筆 `{to, message:{subject,html,text}}` 到 Firestore `mail` collection；由 Firebase「Trigger Email」extension 監聽該 collection、透過 SMTP 實際寄出。這就是 C-1 要收斂成 `queueMail()` 的那 17 處寫入。
- **`google.script.run` shim**：前端沿用了 Google Apps Script 風格的呼叫語法（`google.script.run.withSuccessHandler(cb).<callableName>(args)`），實際由 `firebase-bridge.js` 轉譯成 Firebase callable 呼叫。`_argMap` 負責把位置參數對應成具名參數。這是歷史遺留的相容層，不是 Google 服務。

### 附錄 D — 與本建議書相關的既有產出

- 本輪權限/RWD/tier 修正：commit `3ec5242`。
- 還原點計畫：`_dev/V3_UPGRADE_PLAN.md`、`_dev/backup/`（含 `cleanup-dual-write.js` 計畫，可作 P4 回滾路徑）。
