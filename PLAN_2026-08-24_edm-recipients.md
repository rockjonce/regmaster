# EDM 收件人強化 — 細部實作計畫書（v3）

- 日期：2026-08-24
- 狀態：**待核准，尚未修改任何程式碼**
- 專案：`regmaster-pro`（production）
- v3 變更：依你的四項決策全面改寫架構——**改以 teamId 為選取單位、整隊發送、加身分篩選、移除年齡篩選**。v2 的成員級設計已作廢，理由保留於 §9 供對照。
- 所有數字皆為 2026-08-24 對 production Firestore 與本機原始碼實測。

---

## 0. 你的決策與採用結果

| # | 決策 | 採用 |
|---|---|---|
| 1 | 以 teamId 篩選，一選中就整隊發 | 採用。名單只存 `recipientIds`（字串陣列）|
| 2 | 要「指定身分」 | 採用。另存 `recipientRoles`，寄送時即時解析 |
| 3 | `to:` 用全隊信箱 | 採用。一隊一封，沿用 `sendNotificationToAll` 既有做法 |
| 4 | 移除年齡篩選 | 採用。**風險與改動量都明顯下降**，量化見 §3 |

篩選器最終為五項：**梯次 / 組別 / 報名狀態 / 付款狀態 / 身分**。

---

## 1. 架構決策的依據（實測）

### 1.1 teamId 是穩定鍵，memberId 不是

| | `teamId` | member 文件 ID |
|---|---|---|
| 產生方式 | `compId + generateId("T")`（3081），同時是 teams 文件 ID | Firestore 自動 ID（3151 `.doc()` 不帶參數）|
| 報名者自助編輯 | **就地更新**（`updateRegistration:4361` `doc.ref.update()`）→ **不變** | **全刪重建**（4370-4381）→ **全部改變** |
| 何時會消失 | 主辦方按刪除隊伍（`deleteTeam:4975` 硬刪 team 文件）| 上述任一次編輯 |
| 破壞頻率 | 罕見，且主辦方的意圖本來就是「移出名單」 | 頻繁，且報名者無感 |

單人報名時兩者仍是完全不同的字串（實查 CAXHS7H：`teams/CAXHS7H-T6NQE5D` vs `members/06ufSd2VAk7sqluYfY7m`）。

→ 存 `teamId`。找不到就略過並回報，**不需要任何 fallback 解析鏈**。

### 1.2 整隊發送可以直接複製一支已上線驗證的函式

`sendNotificationToAll:5220-5266` 的結構就是本案要的：

```js
const teamEmails = {};                                   // 5227-5233
mSnap.docs.forEach(d => { const m = d.data();
  if (m.email) { if (!teamEmails[m.teamId]) teamEmails[m.teamId] = new Set();
                 teamEmails[m.teamId].add(m.email); } });

for (const doc of tSnap.docs) {                          // 5240-5257
  const emails = teamEmails[t.teamId] ? Array.from(teamEmails[t.teamId]) : [];
  if (emails.length === 0) continue;
  const fSubj = subject.replace(/{{競賽名稱}}/g, compName)...   // 逐隊變數代換
  mailDocs.push({ to: emails, message: { subject: fSubj, text: fBody, html: htmlAll } });
}
for (let i = 0; i < mailDocs.length; i += 400) { ... }   // 5259-5263 批次寫入
```

`_deliverCampaign` 重寫 ＝ 這段 + 收件人篩選 + 身分過濾 + 追蹤注入。**本案最高風險的那一支，改成抄現成的**，這是 v3 最大的風險降低來源。

### 1.3 身分（role）也是穩定鍵，且只有兩個值

全檔掃描 `role` 的所有寫入點——`submitRegistration:3148-3149`、`updateRegistration:4373-4374`、批次匯入 `6658/6663`——**一律只寫 `"學生"` 或 `"教練"`**，沒有第三種值。程式碼慣例是 `m.role === "學生"` 否則視為教練（如 4829）。

→ 身分篩選只需在寄送時對該隊的 member 文件做一次過濾，**不需要儲存任何成員識別資訊**。存 `recipientRoles: ["教練"]` 即可，約 10 行。

### 1.4 移除年齡後，所有篩選條件都變成 teams 文件上的直接欄位

| 篩選器 | 讀取來源 | 是否需衍生計算 |
|---|---|---|
| 梯次 | `team.selectedSessions`（fallback `[selectedSession \|\| 0]`）| 否（僅舊欄位 fallback）|
| 組別 | `team.group` | 否 |
| 報名狀態 | `team.status` | 否 |
| 付款狀態 | `team.paymentStatus` | 否 |
| 身分 | `member.role`（寄送時）| 否 |

**篩選階段完全不需要讀 `members`**（members 只用來收集 email）。沒有基準日、沒有年齡運算、不碰 `birthday`。

`team.status` 的實際值域（掃描字面量）：`正取` / `備取N` / `審核中` / `已取消`。

---

## 2. 正式站現況實測

### 2.1 各活動規模

| compId | 活動 | 隊數 | 每隊人數 | 梯次 | 組別 |
|---|---|---|---|---|---|
| CHD8XFK | KidWind 分區預賽 | 21 | 4+1 | **3 梯**（南/北/中區）| 國小/國中/高中 |
| CAXHS7H | 節能公益路跑 | 52 | 1+0 | 無 | 4/10/21 公里 |
| CZXJ323 | 歌唱比賽 | 25 | 1+0 | 無 | 長青/社青 |
| C7PWA78 | 優里卡夏令營 | 19 | 1+1 | 無 | 公開組 |
| C3EJ62D | 遙控帆船 | 11 | 2+1 | 1 梯 | 公開組 |
| CUFAPKF / CGR2RWD | — | 0 | — | — | — |
| | **合計** | **128** | | | |

**128 隊裡有 77 隊（60%）是單人隊**（CAXHS7H + CZXJ323）——對這些活動，整隊寄與成員級輸出**完全相同**。

CHD8XFK 前次實測唯一 email 為 72 個。整隊寄後訊息數為 **21 封**（而非 72 封）。

### 2.2 真實痛點

主辦帳號 `Xenia` 今天上午在 CHD8XFK 建的草稿：

```
campaigns/CPPKKigjR4sSXThJO8tc
  subject:         "2026 Kidwind ... 南區分賽停車證申請通知-停車證範本"
  recipientFilter: "all"        ← 21 隊分散在 3 個梯次，北區與中區也會收到
```

梯次篩選器正是為此。（Xenia 已依你的通知暫停編輯。）

---

## 3. 移除年齡篩選的效益評估（回答你的第 4 點）

### 3.1 風險：消除 5 個問題來源，全部是「整類消失」而非「減少」

| 移除的風險 | 原本的問題 |
|---|---|
| **UTC 時區偏移** | 既有年齡演算法（`index.js:2988-2999`）用 `new Date()`，而 Cloud Run 是 UTC。台北 00:00-08:00 之間，生日當天的人會被少算一歲 |
| **基準日三段 fallback** | 7 個活動有 **3 個** `config.competitionDate` 是空字串（含 CHD8XFK、C3EJ62D、C7PWA78），必須退回「最早梯次起日 → 寄送當日」才能運作 |
| **生日資料不可信** | `updateRegistration`（4274-4386）grep `ageRule` / `groupAgeRules` / `birthday` **零命中**——報名者自助編輯時**完全沒有年齡驗證**。成員級年齡篩選的「精準」沒有資料基礎 |
| **「無生日資料」第三桶** | 教練文件實查**沒有 `birthday` 也沒有 `gender`**，需要 fail-closed 設計 + 一鍵加入 UI + 計數提示 |
| **兩種年齡模式** | 既有 `groupAgeRules` 同時有 `age` 型（min/max 歲）與 `birth` 型（日期區間，CUFAPKF 在用），UI 要同時支援 |

另外，**完全不再讀取 `m.birthday`**，個資接觸面縮小。

### 3.2 改動量：約 −156 行

| 移除項 | 後端 | 前端 | i18n |
|---|---|---|---|
| 年齡運算 + 基準日 fallback 鏈 | −45 | — | — |
| 兩種年齡模式的 UI 與輸入 | — | −45 | — |
| 基準日顯示與手動覆寫 | — | −20 | — |
| 「無生日資料」提示與一鍵加入 | — | −10 | — |
| 對應字典（約 18 鍵 × 2）| — | — | −36 |
| | **−45** | **−75** | **−36** |

### 3.3 額外簡化：不需要新增 `getCampaignAudience`

複查時發現兩件事，讓 v2 規劃的新端點變成多餘：

1. **`getCampaignRecipients:9871` 已經回傳 `{ total, teamCount, teams:[{teamId, teamName, emails[]}] }`**——正是勾選視窗需要的骨架，只要補上 `group` / `sessions` / `status` / `paid` / `emailsByRole` 五個欄位（約 14 行）。
2. **梯次名稱與組別清單前端已經有了**——`announcements.html:258` 在載入時就呼叫 `getRegistrationBundle(compId)`，而該函式（`index.js:2831-2848`）**回傳整份 `config`**，內含 `sessions` 與 `groups`。目前只取用了 `competitionName`（261 行），把區域變數 `cfg` 提升為模組層變數即可，**後端零改動**。

→ 少一個新函式、少一個部署單元、少一個 bridge 條目。

### 3.4 總量對照

| 版本 | 架構 | 行數 | 部署單元 |
|---|---|---|---|
| v2.1 | 成員級 + 年齡篩選 | 約 660 | 7 |
| v3 | **整隊寄 + 身分篩選 + 無年齡** | **約 381** | **6** |
| | | **−42%** | |

---

## 4. 既有缺陷（批 A 要修的四項）

### 4.1【嚴重】收件人篩選是 fail-open

```js
// functions/index.js:9972-9979  _deliverCampaign
teamSnap.docs.forEach(d => {
  const t = d.data();
  if (t.status === '已取消') return;
  if (camp.recipientFilter === 'paid'     && !(t.paymentStatus||'').includes('已確認')) return;
  if (camp.recipientFilter === 'unpaid'   &&  (t.paymentStatus||'').includes('已確認')) return;
  if (camp.recipientFilter === 'waitlist' && !(t.status||'').startsWith('備取'))        return;
  teamIds.add(d.id);        // ← 三條都沒命中就加入
});
```

`recipientFilter` 若是 `'custom'`，三條 `if` 全不成立 → **寄給全部人**。且 `createCampaign:9907` 與 `updateCampaign:9933` **都沒有白名單**，任意字串存得進去。`getCampaignRecipients:9877-9881` 是同一套邏輯，所以**預覽數字也會是錯的**。

→ 改為 fail-closed 白名單。**這是新功能無法只做前端的根本原因。**

### 4.2【嚴重】所有收件人的 Email 互相曝光

```js
// functions/index.js:9993-9996
await db.collection("mail").add({
  to: Array.from(emails),        // ← 全活動 72 個地址塞進同一封
  ...
});
```

CHD8XFK 送一封，72 位家長與老師互相看到彼此的完整 email，寄出無法回收。
改為一隊一封後，`to:` 只含該隊 1-5 個信箱（隊友與教練本來就互相認識），**跨隊曝光完全消除**。

### 4.3【中】介面宣告的變數在此路徑不會代換

`announcements.html:164` 對主辦方寫著「可用變數（寄送時自動帶入每位收件人）：`{{競賽名稱}}` `{{報名編號}}` `{{組別}}` `{{中文隊名}}` `{{英文隊名}}`」，但 `_deliverCampaign` 全段沒有任何 `replace`。收件人看到的就是 `{{報名編號}}` 六個字。

正確實作已存在於 `sendNotificationToAll:5247-5252`，批 A 直接沿用。

### 4.4【中】沒有測試寄送

全檔搜尋 `測試寄送` / `testSend` / `sendTest` → **0 命中**。主辦方目前驗證信件長相的唯一辦法就是真的寄給所有人。

---

## 5. 實作計畫

### 5.1 批 A — 寄送引擎改造

**新增 `_resolveTeams(compId, camp)`（+30 行）**

單一資料來源，供 `getCampaignRecipients`（預覽 + 勾選視窗）、`_deliverCampaign`（實寄）、`sendCampaignTest` 共用，杜絕預覽與實寄口徑不一致。

fail-closed 白名單：

```
'all'      → 全部（排除 已取消）
'paid'     → paymentStatus 含 '已確認'
'unpaid'   → 不含
'waitlist' → status 以 '備取' 開頭
'custom'   → 只取 camp.recipientIds 中存在且未取消的隊伍
其他       → return { success:false, message:'未知的收件對象' }，不寄
```

**`_deliverCampaign` 重寫（~55 行）** — 複製 `sendNotificationToAll:5220-5266` 的結構，加上：

- 逐隊一封，`to:` = 該隊 email 集合（依 `recipientRoles` 過濾身分後）
- 逐隊變數代換（5 個既有變數），**先代換、再注入追蹤**（反過來會把 `{{}}` 包進 percent-encoded URL 而永久失配）
- 代入值經 `escMail`（3742）逸出（`sendNotificationToAll` 未逸出，不沿用該缺陷）
- 統一用 `d.id` 當鍵（現況 9979 用 `d.id`、9986 用 `m.teamId`，值相同但應統一）
- `mailDocs` + 400 筆／批次
- 新增 `stats.teams`（實寄隊數）、`stats.skipped`（找不到或無合格 email 的隊數）

**其餘（+58 行）**

- `getCampaignRecipients` 擴充：改用共用解析器，每隊補回 `group` / `sessions` / `status` / `paid` / `emailsByRole`，並新增 `teamsNoEmail` 計數（+14）
- `createCampaign` / `updateCampaign`：`recipientFilter` 白名單 + 接受 `recipientIds`（字串陣列，上限 2000）與 `recipientRoles`（+14）
- `sendCampaignTest(campaignId)`：寄給 `request.authUser.email`，主旨前綴 `[測試]`，不寫 stats、不改 status（+30）

**`recipientIds` 必須存在 campaign 文件裡**——排程寄送是 cron `processScheduledCampaigns:9128` 在 15 分鐘後跑的，那時瀏覽器早關了。

### 5.2 批 B — 勾選視窗與篩選器（純前端）

- **後端零新增**（見 §3.3）
- 勾選視窗：扁平隊伍清單，每列一個 checkbox，顯示 隊名 / 報名編號 / 組別 / 梯次 / 狀態 / email 數
- 篩選器列：梯次、組別、報名狀態、付款狀態（四個下拉，資料來自已在頁面上的 `cfg`）
- 身分選擇：學生 / 教練 / 兩者（存入 `recipientRoles`）
- 「套用篩選並全選」 /「清空」 /「已選 N 隊」
- 無 email 的隊伍：灰階不可勾選，頁尾統計「N 隊無 email 無法收信」
- **UI 明示**：「以隊伍為單位發送，一隊一封，收件人為該隊全部（或指定身分）成員信箱」
- 複用頁面既有的 `.pv-bg`（announcements.html:82）遮罩樣式

### 5.3 改動量

| 檔案 | 內容 | 行數 |
|---|---|---|
| `functions/index.js` | `_resolveTeams` 新增 | +30 |
| | `_deliverCampaign:9962-10006` 重寫 | ~55 |
| | `getCampaignRecipients:9871` 擴充 | +14 |
| | `createCampaign` / `updateCampaign` 白名單 + 2 新欄位 | +14 |
| | `sendCampaignTest` 新增 | +30 |
| `public/shared/firebase-bridge.js` | argMap（286-291）| +2 |
| `public/admin/events/announcements.html` | 勾選 modal + 篩選器 + 身分選擇 | +120 |
| | `custom` option + 三處送出點 + 確認框 + `cfg` 提升 | +22 |
| | 測試寄送鈕 | +26 |
| `public/shared/i18n-admin-events-announcements.js` | Z / E 各約 34 鍵 | +68 |
| | **合計** | **約 381 行** |

---

## 6. 會動到的後台 functions —— 會，共 6 個部署單元

| # | 部署單元 | 行號 | 動到什麼 | 為何必須重佈 |
|---|---|---|---|---|
| 1 | `_deliverCampaign`（共用函式，非 export）| 9962-10006 | **整段重寫** | 見 #4 #5 |
| 2 | `getCampaignRecipients` | 9871-9895 | 擴充回傳欄位 + 共用解析器 | 直接改到 |
| 3 | `createCampaign` | 9898-9918（filter 在 **9907**）| 白名單 + 2 新欄位 | 直接改到 |
| 4 | `updateCampaign` | 9920-9937（filter 在 **9933**）| 同上 | 直接改到 |
| 5 | `sendCampaignNow` | 10008-10020 | **本體一行不改**，函式體內含 #1 | 不重佈就跑舊引擎 |
| 6 | `processScheduledCampaigns`（cron）| 9128-9137 | **本體一行不改**，同上 | 不重佈就跑舊引擎 |
| 7 | `sendCampaignTest` | 新增 | 全新 | — |

**不需要動也不需要重佈**：`scheduleCampaign`（10022-10038，只寫 status/scheduledFor，不含 `_deliverCampaign`）、`listCampaigns`（9863，`Object.assign({id}, d.data())` 整包回傳，新欄位自動穿透）、`deleteCampaign`、`getRegistrationBundle`。

### 6.1 風險評估

**整體：中，且風險集中在 `_deliverCampaign` 一支。**（v2.1 為中高，降級理由見 §3.1 與 §1.2）

| 動到的部分 | 壞掉的後果 | 風險 | 緩解 |
|---|---|---|---|
| `_deliverCampaign` 重寫 | **寄錯人 / 寄不出 / 重複寄。Email 寄出無法回收** | 🟠 **中**（v2.1 為 🔴 高）| 結構複製已上線的 `sendNotificationToAll`；測試寄送先行；先建只勾 1 隊的 campaign 實寄 |
| `create` / `updateCampaign` 白名單 | 漏列 `'paid'` → 既有草稿降級成 `'all'` → **寄給未付款的人** | 🟠 中 | 白名單須含現存全部值。實查現存 campaigns 只有 `all` 與 `paid` |
| `processScheduledCampaigns` | 與 #5 不同批佈 → 排程路徑跑舊碼，`custom` fail-open 寄給全部人 | 🟠 中 | 兩支必須同一次 deploy 指名帶上 |
| `getCampaignRecipients` | 預覽數字錯 → 主辦方誤判後按送出 | 🟡 低中 | 改成與實寄同源，反而消除既有口徑不一致 |
| `sendCampaignTest` | 新函式，壞了只影響自己 | 🟢 低 | — |

**波及範圍：EDM 以外為零。** `_resolveTeams` 對 `teams` / `members` / `competitions` **只讀不寫**。全案唯一寫入是 `campaigns` 文件（新增兩個欄位）與 `mail` 文件（append-only）。不碰報名、付款、報到、評分、發票、退費。

**唯一的破壞性能力是「寄信」且不可撤回**——這是本案風險維持在「中」而非「低」的唯一理由。

---

## 7. 邊界問題清單（實作時必須逐項處理）

**B1【阻斷級】`recipFilter` 下拉沒有 `custom` 選項時，值會變成空字串**

```js
// announcements.html:361  selectCamp()
document.getElementById('recipFilter').value = c.recipientFilter || 'all';
```

下拉（152-157）目前只有四個 `<option>`。**把 select 設成不存在的值，瀏覽器會讓 `selectedIndex = -1`、`value` 變成 `""`**。接著預覽送 `filter:""` → 後端 fail-open **顯示全部人數**；按儲存 → `recipientFilter:""` 寫回，**自訂名單設定被靜默抹掉**。
→ `<option value="custom">` 必須先存在於靜態 markup，且在 `selectCamp` 執行前就在。**這是實作順序的硬性約束。**

**B2 預覽面板拿不到「尚未存檔」的名單**
`firebase-bridge.js:286` 是 `getCampaignRecipients:["compId","filter"]` → 需擴為 `["compId","filter","recipientIds","recipientRoles"]`。

**B3 fail-closed 分支要「回傳錯誤」而非「拋例外」**
`authCallable:843-846` 會把非 `HttpsError` 一律轉成「系統發生錯誤，請稍後再試」。更糟的是 cron（9134）`try/catch` 吞掉後 **status 仍是 `scheduled`** → **每 15 分鐘無限重試**。
→ 未知 filter 應 `return { success:false, message }`，並把 campaign 退回 `draft` + 記 audit，停止重試。

**B4 重複寄送窗口**
現況「寫 1 筆 mail → 更新 status='sent'」，改成逐隊後是「寫 N/400 個批次 → 更新 status」。中間崩潰 → 下一輪 cron 整封重寄。
→ `_deliverCampaign` 開頭加 `if (camp.status === 'sent') return { success:false, message:'此公告已發送過' };`（與 `announcements.html:377` 在 status==='sent' 時 disable 發送鈕的既有行為一致）。

**B5 空名單會被靜默標記為「已發送」**

```js
// 9989-10003
if ((camp.channels||[]).includes('email') && emails.size > 0) { ...寄信... }
await doc.ref.update({ status:'sent', ... });   // ← 無條件執行
```

`custom` 但一隊都沒勾（或身分過濾後無人）→ 不寄任何信卻標成「已發送 0 人」，發送鈕從此 disabled。
→ 收件隊數為 0 時必須在標記前擋下並回報。

**B6 `custom` 也必須排除「已取消」的隊伍**
其餘四條路徑開頭都有 `if (t.status === '已取消') return;`（9974）。排程可能數天後才寄，期間隊伍可能取消。
→ `custom` 同樣套用，並回報「N 隊因已取消而略過」。

**B7 `selectedSessions` 與舊 `selectedSession` 並存**
實查 CHD8XFK-T4SNGL8 兩者都有、T22D5DB 只有前者 → 需 `t.selectedSessions || [t.selectedSession || 0]`（既有慣例，3111 / 4805 同寫法）。

**B8 梯次可能沒有名稱**
C3EJ62D 的 session 只有 `startDate` / `endDate` / `maxTeams`，**沒有 `name`** → UI 需 fallback 為「第 N 梯（起日）」。

**B9 前端三處送出點都要帶名單**
`announcements.html:446`（儲存草稿）、`469`（立即發送）、`502`（排程發送）。漏一個就是「存好的名單送出時變成寄給全部人」。另 `472` 的確認框讀 `recipCount.textContent`，自訂模式要改讀實際勾選隊數。

**B10 收件人計數語意改變**
`getCampaignRecipients:9895` 的 `total` 是**全活動去重後的唯一 email 數**。改成一隊一封後，跨隊共用的信箱會收到多封（實查 `stkings10@gmail.com` 掛在 CAXHS7H 兩隊）——這是正確行為（`{{報名編號}}` 不同），但確認框要同時顯示**隊數／訊息數／唯一收件人數**三個口徑，否則主辦方會回報「重複寄信」。

**B11 身分過濾後可能整隊無人**
選了「只寄教練」但某隊沒有教練 email → 該隊略過並計入 `skipped`，不可靜默。

**B12 teamId 懸空**
`deleteTeam:4955-4976` 硬刪 team 文件。已存的 teamId 找不到 → 略過 + 回報（單一分支，不需 fallback 鏈）。

**B13 部署順序是硬性的**
若 Hosting 先上、functions 後上，前端會送 `recipientFilter:'custom'` 給舊後端 → **fail-open 寄給全部人**。**必須 functions 先、Hosting 後。**

---

## 8. 其他複核確認（無需改動，但影響設計）

- **權限模型**：`compAuthCallable:895-897` 不帶能力參數時**預設 `"manage"`**。`getCampaignRecipients`（9871）走這條，評審／工作人員（`ROLE_CAPS:854-859` 只有 view/scoring/checkin）拿不到。`sendCampaignTest` 須明寫 `compAuthCallable("manage", ...)` 並沿用 `requireCompFeature(request, "campaigns")`。
- **測試寄送收件人可用**：`authUser` 就是整份 `accounts` 文件（`authCallable:842`）。實查 5 個主辦帳號全部有 `email`，含 `Xenia`（`project@calculator.com.tw`）。仍需處理 email 為空時的明確錯誤訊息。
- **個資範圍**：本版**完全不讀 `m.birthday`**，也不回傳 `idNumber` / `passport`。只用 `email` 與 `role`。
- **追蹤統計仍是彙總層級**：`_injectCampaignTracking:9952` 只嵌 `campaignId`，開信／點擊是活動層級。改成逐隊寄送**不改變**此行為。
- **cron 逾時**：`setGlobalOptions`（18）未設 `timeoutSeconds`，`processScheduledCampaigns`（9128）吃預設 60 秒（同檔其他 cron 都明寫 300/540）。以實際規模（最大 21 封、1 個批次）綽綽有餘，但既然要重佈，**建議順手補 `timeoutSeconds: 300`**。
- **回傳結構相容**：`announcements.html:481` 讀 `res.channels.length`，被 `if (res && res.success)` 保護，故 `{success:false}` 早退安全。成功路徑**必須維持 `{ success, sent, channels }`**。
- **文件大小**：`recipientIds` 上限 2000 × 約 16 bytes ≈ 32KB，遠低於 Firestore 單文件 1MB。
- **`firestore.rules` 全 deny**（實查確認）：存取走 admin SDK，**不需改 rules，也不需新 index**（只用既有 `compId` 單欄位查詢）。
- **mail 文件累積**：`TTL_EXPIRE_TYPE=never`。CHD8XFK 每次發送從 1 筆變 21 筆且永不刪除，成本可忽略。
- **Gmail 配額**：寄件者 `vernierasia@gmail.com` 是一般 Gmail（非 Workspace），**每日 500 位收件人**。一隊一封不增加配額消耗（配額算收件人），訊息數 1→21，節流風險低。

---

## 9. v2 成員級設計作廢的理由（存查）

v2 規劃以 `teamId + role + seq` 為鍵、逐人寄送。作廢原因：

1. 需要三段解析 fallback（ID 命中 → email 備援 → 失效回報），因為 member 文件會被報名者自助編輯刪除重建
2. 前端需要雙層 tri-state checkbox 樹（父子連動、半選狀態），是 UI bug 常見來源
3. 年齡篩選建立在不可靠的生日資料上（`updateRegistration` 不重驗年齡）
4. 以實際資料看價值極低：128 隊中 77 隊是單人隊，兩案輸出相同；唯一有差的 CHD8XFK 其組別本身就按年齡切，且報名時後端強制驗證每位學生符合組別規則（`index.js:2985-3003`）
5. 訊息數 72 vs 21

---

## 10. 部署與回滾

- **一個還原點**：`git tag restore-20260824-pre-edm-recipients`
- **部署順序**：**先 functions，再 Hosting**（B13）
- **需部署的 6 個 functions（必須同批）**：
  `getCampaignRecipients`、`createCampaign`、`updateCampaign`、`sendCampaignNow`、`processScheduledCampaigns`、`sendCampaignTest`
- **時機**：Xenia 已通知暫停編輯 CHD8XFK 草稿
- **回滾**：`git checkout <tag>` 後重佈同樣 6 個 functions + Hosting。
  ⚠️ **回滾前必須先把所有 `recipientFilter='custom'` 的草稿改回 `'all'`**——舊碼對 `custom` 是 fail-open，會寄給全部人。`recipientIds` / `recipientRoles` 欄位舊碼不讀，可留著。

**對既有資料的影響：零。** 不改 `teams`、`members`、`competitions` 任何欄位。只在 `campaigns` 新增兩個欄位（舊文件沒有即視為空）。

---

## 11. 測試計畫

**自動化（本機規格測試，比照 `_verify_fixes/`）**

1. fail-closed：`recipientFilter` 為 `'custom'` / `'bogus'` / `undefined` 的收件集合
2. `custom` 名單含已刪除 teamId → 略過且計入 skipped
3. `custom` 名單含已取消隊伍 → 略過且計入 skipped
4. 身分過濾：只寄教練 / 只寄學生 / 兩者；某隊無該身分 → 略過
5. 梯次 fallback：`selectedSessions` 有 / 只有 `selectedSession` / 兩者皆無
6. 變數代換：5 個既有變數，且**代換後才注入追蹤連結**
7. 隊名含 `<script>` → 經 `escMail` 逸出
8. 空名單 / 全部略過 → 不標記 sent、回報錯誤
9. `status==='sent'` 時再次呼叫 → 早退不重寄

**預覽頻道 UAT（Hosting）**

10. CHD8XFK 開勾選視窗，套用「梯次＝南區預賽」，確認只選到 `selectedSessions` 含 0 的隊伍
11. 身分選「只寄教練」，確認預覽面板的 email 清單只剩教練
12. 手機 RWD：勾選視窗在窄螢幕可用
13. 中 / EN 雙語切換，新 UI 全部有翻譯
14. 儲存 → 重新載入頁面 → `custom` 與勾選結果正確還原（驗 B1）

**正式站謹慎驗證（需你在場）**

15. **先用測試寄送**：寄到你自己信箱，確認變數代換、版型、追蹤連結
16. 建一個只勾 **1 隊** 的自訂 campaign 實寄，確認：只有該隊收到、`to:` 只含該隊信箱、變數正確
17. 觀察 `mail` 集合的 delivery state，確認 21 封連續寄送沒有被 Gmail 節流（CHD8XFK 全量寄送前必做）

---

## 12. 不納入本案

- 每人層級的開信／點擊追蹤（需 per-recipient token，獨立題目）
- **年齡篩選**（依你的決定移除；理由見 §3.1）
- 自訂欄位篩選——實查 CHD8XFK 發現**同一活動內不同時期報名的成員，自訂欄位 id 不一樣**（`f_g5ubjim` vs `f_xjosc7f`，表單設計中途改過），任何以自訂欄位 id 為條件的篩選都會靜默漏掉早期報名者
- SMS / LINE 通道（既有 TODO）
- `updateCampaign` 補 feature gate（既有行為：`createCampaign` / `sendCampaignNow` / `scheduleCampaign` 都有 `requireCompFeature`，唯獨它沒有。另案）
- 退信／無效信箱回收

---

核准後即依 §10 流程施作：還原點 → 實作 → 自審 → Opus 外審 → 預覽頻道 → 你 UAT → 部署 → commit。
