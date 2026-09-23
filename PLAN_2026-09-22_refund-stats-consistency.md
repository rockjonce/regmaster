# PLAN 2026-09-22 — 退費後統計口徑一致化（v2 裁決版）

> **狀態**：唯讀查證完成、產品口徑已裁決。**尚未實作、未部署、未變更任何 production 資料或程式。**
> **授權範圍**：本文件僅為施工計畫。§5 產品口徑已由使用者拍板，但**開工與部署需另行取得明確授權**。
> **原碼基準**：本機 HEAD `18f641fb4378c2c97bcb1e242f96a5c47bd09548`（分支 main）。
> 本機較 origin/main 多出的提交僅 CODEMAP.md／codegraph.json 文件類。
> **production 部署版本未核實**——施工前須先比對線上 functions 版本，不可假設等同本機。
> 行號均指此基準版本；實作時以「函式名稱 + 行號」雙重定位，不只依行號。
>
> **v2 變更**：更正 v1 §2.2 對 `_ownerRefundCore` 的錯誤描述（實為條件式）；新增 §2.4 死結分析；
> 新增工項 W-D5（退費意圖選擇）；§5 待決事項改為已裁決紀錄；§6 依 D9(b) 重評 EDM 風險；
> §7 施工批次重編；§10 新增浮現待辦。

---

## 1. 觸發案例與唯讀查證結果

2026-09-22 客服案件：報名者（活動 `CZXJ323` 2026台北市電器盃歌唱比賽，報名代碼
`CZXJ323-TBTKN8T`，電話 0910-100-768）線上刷卡 NT$1,500 後申請退費，線上退費入口顯示
「主辦方尚未設定退費政策」。主辦方隨後於後台手動完成退刷。

以 Admin SDK 對 production 唯讀查詢，確認事實如下：

| 項目 | 查得內容 |
|---|---|
| 退款 | 2026/9/22 16:07:15，PayUNI 退刷，退刷單號 `1786535191112499863`，NT$1,500 全額，`retainedAmount: 0` |
| 訂單 `RG17865350641196` | `status: "paid"`（未變）、`refundState: "refunded"`、`refundedAmount: 1500`、`payoutState: "available"` |
| 申請單 `RF7SJKFS` | `initiatedBy: "owner"`、`status: "refunded"`、`channel: "payuni_refund"` |
| 隊伍 | `status: "正取"`（未變）、`refundStatus: "refunded"`、`paymentStatus: "已退費 NT$1500 2026/9/22 下午4:07:15"` |
| 活動設定 | `config.refundPolicy: null`（＝「不啟用退費政策」）、`competitionDate: "2026-11-01"`、`registrationFee: 1500` |

退費本身執行正確、金額正確、無重複退刷。**問題在退費之後的語意判定與統計歸類。**

### 1.1 以線上資料重算各處統計（唯讀重現後端／前端演算法）

活動 `CZXJ323` 當時共 75 筆報名（0 筆已取消、0 筆備取）：待確認 18、已確認 56、已退費 1。

| 顯示位置 | 目前會顯示 | 裁決後應為 | 判定 |
|---|---|---|---|
| 儀表板 KPI 總報名 | 75 | 75 | 符合 D1(a) |
| 儀表板 KPI 正取 | 75 | 75 | 符合 D1(a)（本案屬「保留報名」） |
| 儀表板 KPI 待付款 | **19** | 18 | **錯，須修** |
| 分組統計「長青組」待付款 | **10** | 9 | **錯，須修** |
| 帳務頁 應收總額 | **NT$112,500／75 筆** | NT$111,000／74 筆 | **錯，須修（D2a）** |
| 帳務頁 待收款 | **NT$28,500／19 筆** | NT$27,000／18 筆 | **錯，須修** |
| 帳務頁 已收款 | NT$84,000／56 筆 | 不變 | 正確 |
| 帳務頁 收款率 | **75%** | 76% | **錯，須修** |
| 分析頁 營收圖表 | NT$84,000 | 不變 | 正確（見 §2.3 註） |
| 後台待辦／AI 洞察 | **「有 19 筆待付款，建議寄送付款提醒信」** | 18 | **錯，且會誘發誤催繳** |
| EDM 收件人「未付款」 | **含此人** | 不含 | **錯，寄信不可逆** |
| 報名者端「我的報名」 | 顯示「已退費」、不引導付款 | 不變 | 正確 |

### 1.2 全站退費盤點（唯讀）

| 項目 | 數字 |
|---|---|
| `refundRequests` 總數 | 11（`initiatedBy: owner` 8 筆、報名者申請 3 筆） |
| `regPayments` 中 `refundState: refunded` | 1（即本案） |
| `teams` 中 `refundStatus: refunded` | **1（即本案）** — 組合為「正取 ／ paymentStatus 含已退費」 |
| 部分退費（`retainedAmount > 0`） | 2 筆，`RF4KNQYV`／`RFPZUJVS`，皆屬**已刪除的測試活動** `CBTX6VP`（NT$10 級距、2026/6/25 上線日） |

**結論：正式營運資料中，受本缺陷影響的實體只有 1 筆；部分退費從未在正式資料發生過。**
這是本次採用「唯讀派生、零資料遷移」（D6a）的主要依據。

---

## 2. 根因

### 2.1 第一層：用「有沒有『已確認』字樣」反推未付款

系統以 `paymentStatus` 字串承載付款狀態。退費時該欄位被**整串覆寫**成
`"已退費 NT$1500 …"`（`functions/index.js:4219`），字串內不含「已確認」，於是所有
以下寫法都把「已退費」誤判成「尚未付款」：

```js
const isPayWait = !(t.paymentStatus || "").includes("已確認");
```

前端 `public/my.html:362` 在 R9-2 已針對此點修過（先判「已退費」再判其他），
**但後台的統計、待辦、EDM、帳務完全沒有比照辦理。**

### 2.2 `_ownerRefundCore` 是條件式的（v1 此處描述有誤，本版更正）

`functions/index.js:4217-4227` 實際邏輯：

```js
const hadRequest = ["requested","approved"].includes(team.refundStatus || "") || team.status === "退費申請中";
if (hadRequest) teamUpd.status = "已取消";                    // 報名者申請過 → 視為退出
await db.collection("teams").doc(teamId).update(teamUpd);
if (hadRequest && team.status !== "已取消") {                  // 釋出名額
  await db.collection("competitions").doc(compId).update({ teamCount: FieldValue.increment(-1) });
}
```

系統原本就區分「報名者主動退出」與「主辦方退押金」，**此設計意圖正確，與 D1(a) 一致**。
缺陷不在這個分支，而在它**只能靠「有沒有申請單」來猜意圖**（見 §2.4）。

### 2.3 三條退費路徑的落地方式

| 路徑 | 進入點 | 對 `teams` 的處置 | `teamCount` |
|---|---|---|---|
| A. 主辦方主動退費 | `ownerRefund` → `_ownerRefundCore`（`:4178`） | `hadRequest` 為真 → `status:"已取消"`；否則保留原狀態。`paymentStatus` 一律改「已退費 …」 | 僅 `hadRequest` 為真時 −1 |
| B. 報名者申請 + PayUNI | `payuniRefundAndDelete`（`:4071`） | **硬刪除 team 與 members**（`:4133-4135`） | −1 |
| C. 報名者申請 + 銀行轉帳 | `markRefunded`（`:4025`） | `status:"已取消"`；**`paymentStatus` 維持「已確認 …」**（`:4040`） | −1 |

> **路徑 B 與 D5 裁決原則牴觸**：使用者已明示「取消報名後資料仍應保留（不刪除），只是不計入正取統計」。
> 路徑 B 目前是硬刪除 team 與 members。依 D7(a) 路徑統一另案處理，**但此牴觸已記錄於 §10，
> 另案時直接沿用 D5 原則，不需重新裁決。**

### 2.4 死結：政策未啟用時，主辦方無法表達「退費＝退出」

1. 活動未設退費政策 → `requestRefund`（`:3844`）以 `!calc.hasPolicy` 擋下 → **報名者無法產生申請單**。
2. 無申請單 → `_ownerRefundCore` 的 `hadRequest` 必為 `false` → 一律走「保留報名」分支。
3. 另一條「退費並取消報名」的路徑 `payuniRefundAndDelete`（`:4071`）
   **要求必須先有 requested/approved 的申請單**（`:4082`）；帳務頁該區塊標題即為
   「可退刷（報名者退費已核准）」（`payments.html:211`），無申請單時清單為空。
4. 因此帳務頁提示文案 `aePayRefundKeepNote`「若要退費並取消報名／釋出名額，請改用
   『平台代收轉付 → 退刷』」**在此情境下是無法執行的建議**。

**本案的統計錯亂，終極成因是主辦方沒有任何途徑可以宣告退費意圖。**
D5(a) 即針對此點：把意圖從「系統猜」改為「主辦方明確選擇」。

### 2.5 註：分析頁營收「正確」是巧合，不是設計

`public/admin/events/registrations.html:504` 同樣以「含『已確認』」為閘門，
因退費覆寫了字串而**恰好**排除了這筆。修正時必須一併納管，不能因為現在數字對就跳過。

---

## 3. 施工項目清單

### 3.1 W-STAT：統計端判讀修正（判為「未付款」，實際已退費）

| # | 位置 | 所屬端點 | 前端依賴 | 影響 |
|---|---|---|---|---|
| F1 | `functions/index.js:4480` | `getDashboardStats` | hub.html、admin/index.html | 儀表板待付款 KPI、分組統計 |
| F2 | `functions/index.js:4609` | `getRegistrationStats` | registrations.html | 報名分析付款分佈／每日已付 |
| F3 | `functions/index.js:6032` | `buildOrgStatsContext`（`askAdminAI`） | admin/ai.html | AI 助理回答的付款數字 |
| F4 | `functions/index.js:11314` | `getAiInsights` | admin/index.html | 「有 N 筆待付款」洞察 |
| F5 | `functions/index.js:11396` | `getTodoList` | admin/index.html | 待辦清單 |
| F6 | `functions/index.js:10012-10013`、`:10027` | `_resolveTeams` ← `getCampaignRecipients`／`sendCampaignNow`／`sendCampaignTest`／`processScheduledCampaigns` | announcements.html | **EDM 收件人（不可逆）** |
| F7 | `functions/index.js:11650`／`:11691`／`:11732` | `listRegistrants`／`refreshOneRegistrant`／`reconcileRegistrants` | CRM 名單 | paid／unpaid 計數 |
| F8 | `public/admin/events/payments.html:321` | — | 帳務頁 | 應收／待收／收款率（依 D2a 整筆排除） |
| F9 | `public/admin/events/registrations.html:504` | — | 分析頁 | 見 §2.5，須納管 |
| F10 | `public/admin/events/registrations.html:809` | — | 報名列表 | 付款徽章顯示成橘色 pending |

### 3.2 W-PAY：已退費仍可再次付款（D4a、D8「要」）

`createRegistrationPayment`（`functions/index.js:7970`）**沒有任何付款狀態閘門**——
既不擋「已確認」也不擋「已退費」。前端 `payment.html:286` 只在「已確認」時隱藏付款方式，
已退費者會看到完整付款方式；`detail.html:1043` 更會主動給出「前往付款」按鈕。

**後果**：已退費者循活動頁查詢或舊付款連結進入，會被引導再付一次，產生真實刷卡。

| # | 位置 | 修正 |
|---|---|---|
| F11 | `functions/index.js:7970` `createRegistrationPayment` | 新增閘門：`isRefunded(team)` 為真才擋，**其餘一律放行（fail-open）** |
| F12 | `functions/index.js:7948` `confirmManualPayment` | 同上 |
| F13 | `public/events/detail.html:1032`、`:1043` | 已退費不顯示「前往付款」，改顯示已退費狀態 |
| F14 | `public/events/payment.html:286` | 已退費隱藏付款方式，顯示 D4 文案 |
| F15 | `public/Manual.html:1095` | 更正敘述——現行「已退費的報名不會再被引導去付款」僅對 my.html 成立 |

**D4 文案（已裁決採用）**：`此報名已退費，如需重新參加請聯繫主辦方。`

### 3.3 W-D5：退費意圖選擇（新增工項）

讓主辦方在退費時明確選擇處置方式，取代系統以 `hadRequest` 猜測。

| # | 位置 | 修正 |
|---|---|---|
| F16 | `public/admin/events/payments.html` 退費對話框（`orfConfirm` 附近，`:763-779`） | 新增二擇一：<br>○ **只退費，保留報名**（正取不變、不釋出名額）<br>○ **退費並取消報名**（釋出名額、不計入正取統計、**資料保留不刪除**） |
| F17 | `public/shared/firebase-bridge.js:186` | `ownerRefund` 位置參數由 `["compId","teamId","refundAmount","note"]` 擴充為 `[..., "cancelRegistration"]`。**⚠️ 位置參數對照表與後端簽章必須同批改、同批佈** |
| F18 | `functions/index.js:4251` `ownerRefund` ／ `:4178` `_ownerRefundCore` | 新增參數；`hadRequest` 改為 `hadRequest \|\| explicitCancel`。<br>**向後相容**：參數未傳時維持現行 `hadRequest` 行為，舊前端不會壞 |
| F19 | `public/shared/i18n-admin-events-payments.js` | `aePayRefundKeepNote` 改寫（現文案指向無法執行的路徑，見 §2.4）；新增二選項字串（中／EN） |

**不在本工項範圍**：`ownerRefundWaitlist`（備取一鍵退款）維持現行行為，未獲正取者本就不佔名額。

### 3.4 判定為「維持現狀、不動」

| 位置 | 理由 |
|---|---|
| `functions/index.js:4263` `ownerRefundWaitlist` | 已正確排除「已退費」 |
| `functions/index.js:4400` `lookupRegistration` | 顯示「(等待確認中)」；已退費者語意不在本批範圍 |
| `functions/index.js:4872`／`:5003` `confirmPayment`／`reconcilePayments` | 寫入端，非統計端 |
| `functions/index.js:8238` `getOrganizerBilling` | 僅處理非 PayUNI 的 ATM 列 |
| `functions/index.js:4920` `acceptTeam` | 已另行擋掉「已退費不可勾選正取」（`:4921`） |
| `public/legacy/index.html` 全部 | 已除役頁面 |
| `competitions.teamCount` 既有值 | D1(a)：不改規則、不回填 |
| 路徑 B 的硬刪除行為 | D7(a) 另案，見 §10 |

---

## 4. 修法方案（D6a 已裁決）

新增兩個純函式（後端一份、前端 `public/shared/` 一份），全部改用：

```js
function isRefunded(t) { return String(t && t.paymentStatus || "").includes("已退費"); }
function isPaidConfirmed(t) { return !isRefunded(t) && String(t && t.paymentStatus || "").includes("已確認"); }
```

三分類取代現行二分類：**已收款 / 待付款 / 已退費**。

- 不新增欄位、不回填、不寫入 production 資料 → **資料面零風險**。
- `paymentStatus` 只由系統寫入（`:3112`、`:4219`、`:4875`、`:5003`、`:7422`、`:8018`），
  主辦方與報名者無法自由輸入，字串比對安全。`updateTeamStatus`（`:6754`）與
  `batchImportTeams`（`:6637`）入口即 throw，不構成汙染來源。
- 依 D3(a)：部分退費（字串含「（保留NT$N）」）**視同全退，整筆排除**，不解析保留款金額。
  保留款已結構化存於 `deposit` 集合，另案呈現（§10）。

---

## 5. 裁決紀錄（2026-09-22，使用者拍板）

| # | 題目 | 裁決 | 使用者說明 |
|---|---|---|---|
| D1 | 退費後算不算報名 | **(a)** 維持「退出才減、退押金不減」 | 退費有可能只是退押金，實際上還是正取可參賽 |
| D2 | 應收總額怎麼算 | **(a)** 整筆排除 | — |
| D3 | 部分退費保留款 | **(a)** 視同全退；保留款走 `deposit` 另案 | — |
| D4 | 已退費者的付款入口 | **(a)** 前後端都擋 | — |
| D5 | 主辦方如何表達「退費＝退出」 | **(a)** 退費對話框加二擇一 | 與 D1 一致。若選取消報名，**資料仍保留（不刪除）**，但不計入正取統計 |
| D6 | 修法方案 | **(a)** 唯讀派生，零資料遷移 | — |
| D7 | 三路徑統一 | **(a)** 另案 | — |
| D8 | 重複付款缺口 | **併入本批** | — |
| D9 | EDM 部署節奏 | **(b) 一次改完** | 覆蓋建議的 (a) 拆兩次佈 |

---

## 6. 風險評估（production）

### 6.1 本專案的部署特性（已知、必須納入評估）

1. **Cloud Functions 一佈即全站生效**——預覽頻道只涵蓋 Hosting，functions **沒有預覽**。
   後端改動無法讓使用者先驗收，只能靠部署前的原碼審查與部署後的線上抽查。
2. **Hosting 可走預覽頻道**，前端改動應先開預覽頻道由使用者實測後再 `hosting:clone` 升正式。
3. **函式數量多（263 端點）**，全量部署會撞 CPU 配額 429；必須**指名分批部署**，
   且每支部署後**逐支核對 `updateTime`**，429 後顯示 Skipped 的是舊碼。
4. 部署前必須 `grep` 前端實際呼叫的端點名，確認與 `firebase-bridge.js` 對照表一致。
5. **F17 位置參數對照表**：`firebase-bridge.js` 以位置陣列轉送 callable，
   後端簽章與該陣列**必須同批變更、同批部署**，且後端須向後相容（參數缺漏不改變行為）。

### 6.2 端點風險排序（由高而低）

| 級 | 端點／檔案 | 壞掉的後果 | 可逆性 |
|---|---|---|---|
| **🔴 極高** | `_resolveTeams`（F6） | 影響 `getCampaignRecipients`／`sendCampaignNow`／`sendCampaignTest`／`processScheduledCampaigns` 四個入口。判斷寫錯會**寄錯人或漏寄**；`processScheduledCampaigns` 是 cron，會在無人看管時自動觸發 | **寄出的信不可撤回** |
| **🔴 極高** | `createRegistrationPayment`（F11） | 新增閘門若判斷寫反，會擋住**正常未付款者**付款＝直接阻斷活動收款 | 可回滾，但期間流失的付款無法追回 |
| 🟠 高 | `ownerRefund` + `firebase-bridge.js`（F17/F18） | 位置參數不同步 → 退費金額參數錯位 → **退錯金額**（真實金流） | 可回滾；但已執行的退刷不可撤回 |
| 🟠 高 | `getDashboardStats`（F1） | 三個前端依賴；壞了整個活動總覽頁空白 | 回滾即復原 |
| 🟠 高 | `payments.html`（F8/F16） | 主辦方對帳主畫面；數字錯會導致錯誤的匯款申請 | Hosting 可秒回滾 |
| 🟡 中 | `getRegistrationStats`（F2）、`getAiInsights`（F4）、`getTodoList`（F5） | 單頁圖表／提示區塊失效 | 回滾即復原 |
| 🟡 中 | `detail.html`／`payment.html`（F13/F14） | 報名者端；改錯會擋住正常付款流程 | Hosting 可秒回滾 |
| 🟢 低 | `buildOrgStatsContext`（F3）、`listRegistrants`（F7）、`registrations.html`（F9/F10） | 末端顯示 | 回滾即復原 |

### 6.3 風險緩解

| 風險 | 緩解 |
|---|---|
| **EDM 誤寄／漏寄**（🔴，**D9(b) 已接受一次改完**） | ① 部署前先查 `campaigns` 集合，確認**無 `scheduled` 狀態公告落在部署窗口內**，有則先暫停；② 部署後**立即**以 `getCampaignRecipients` 預覽三種篩選（all／paid／unpaid）核對筆數；③ 以「測試寄送」寄給自己驗證；④ 部署後 30 分鐘內不離開，確認 cron 未誤觸發。**見 §6.4 具名接受**  |
| **擋住正常付款**（🔴） | 閘門採 fail-open：**只在 `isRefunded(t)` 為真時擋**，其餘一律放行。禁止寫成「只有未付款才放行」的黑名單式。單元測試須含「未付款者仍可建單」的回歸案例 |
| **退費金額參數錯位**（🟠） | F17/F18 同批改同批佈；後端對新參數採「未傳＝維持舊行為」；部署後先以 NT$1 測試活動驗證，不得直接用正式活動 |
| **429 配額造成新舊碼混用** | 分批、每批 ≤ 6 支；每批後 `firebase functions:list` 逐支核 `updateTime`；出現 Skipped 一律指名重佈 |
| **functions 無預覽** | 部署前以原碼語意斷言測試覆蓋（見 §8）；部署後立即以唯讀腳本對 `CZXJ323` 抽查真實數字 |
| **前後端口徑不同步** | 後端先佈、前端後佈：前端舊碼配新後端只是「數字變對」，不會爆版；反之則否。**F17 為唯一例外**，必須同批 |
| **改到看似無關的既有行為** | §3.4 明列「不動」清單；施工後 `git diff` 逐行對照本文件，出現清單外的異動即視為越界 |
| **同檔多段替換出錯** | 多段替換同一檔後，`grep` 定義與呼叫成對核對 |

### 6.4 具名接受的風險

> **D9(b)：EDM 收件人解析一次改完。**
> 建議方案為拆兩次部署（先佈唯讀的 `getCampaignRecipients` 供核對，確認後才改共用體），
> 使用者裁決採一次改完。
> **已接受的風險**：`_resolveTeams` 改動一旦有誤，`sendCampaignNow` 與 cron
> `processScheduledCampaigns` 會在**沒有人工驗收窗口**的情況下直接以新邏輯寄信，
> 而**已寄出的信無法撤回**。
> **補償控制**：§6.3 第一列四項（部署窗口清空排程、部署後立即預覽核對、測試寄送、留守 30 分鐘）。
> 補償控制為**必做**，不得因時程壓縮而省略。

### 6.5 還原點

- 施工前打 tag：`restore-20260922-pre-refund-stats`（指向 `18f641f`）。
- 前端另備 `_backup_20260922_refund-stats/`。
- 回滾：Hosting 走 `hosting:clone` 回既有版本；functions 以 tag checkout 後**指名重佈**該批函式。

---

## 7. 分批施工與部署順序

| 批 | 內容 | 部署 | 通過才進下一批 |
|---|---|---|---|
| **批 0** | 新增共用判讀函式（後端 + `public/shared/`），**不改任何呼叫點** | 不部署 | 原碼測試通過 |
| **批 1** | F1 F2 F3 F4 F5 F7（統計讀取端，6 支） | functions 指名佈 | 後台核對 `CZXJ323` 待付款＝18、長青組＝9 |
| **批 2** | F8 F9 F10（後台前端） | Hosting 預覽頻道 → 使用者實測 → clone 正式 | 帳務三數字正確 |
| **批 3** | F11 F12（後端閘門）→ F13 F14 F15（前端） | functions 先佈 2 支；Hosting 走預覽 | 已退費者被擋；**未付款者仍可付款（回歸）** |
| **批 4** | F16 F17 F18 F19（退費意圖選擇） | **後端 + bridge 同批**；Hosting 走預覽 | 以測試活動驗證二選項各自行為與金額正確 |
| **批 5** | F6（EDM，依 D9(b) 一次改完） | functions 指名佈；**執行 §6.4 補償控制** | 三種篩選筆數正確、測試寄送正確 |

---

## 8. 驗收

**原碼層**：於 `_verify_refund_stats/` 新增語意斷言測試——對每個 F 編號位置斷言
「已呼叫共用判讀函式」且「舊寫法已不存在」（斷言舊寫法不存在時須先去除整行註解，
否則說明舊寫法為何被淘汰的註解本身會讓斷言誤報）。
**不使用同構複製測試**（對本專案零偵測力）。

**線上層**（每批部署後以唯讀腳本對 `CZXJ323` 抽查）：

| 檢查 | 期望 | 對應批 |
|---|---|---|
| 儀表板待付款 | 18 | 1 |
| 長青組待付款 | 9 | 1 |
| 待辦／AI 洞察 | 「18 筆待付款」 | 1 |
| 帳務應收總額／筆數 | NT$111,000／74 | 2 |
| 帳務待收款 | NT$27,000／18 | 2 |
| 收款率 | 76% | 2 |
| 已收款 | NT$84,000／56（**不得變動**） | 2 |
| 分析頁營收 | NT$84,000（**不得變動**） | 2 |
| 總報名／正取 | 75／75（**不得變動**，D1a） | 1、2 |
| 已退費者開付款頁 | 被擋，顯示 D4 文案 | 3 |
| **未付款者開付款頁** | **仍可正常付款（最重要回歸項）** | 3 |
| 退費對話框「只退費」 | 狀態不變、`teamCount` 不變 | 4 |
| 退費對話框「並取消報名」 | `status:"已取消"`、`teamCount` −1、**team 文件仍存在** | 4 |
| EDM「未付款」收件人 | 18 筆，不含 `CZXJ323-TBTKN8T` | 5 |
| EDM「已付款」收件人 | 56 筆 | 5 |
| EDM「全部」收件人 | 75 筆 | 5 |

---

## 9. 本次不做的事

- 不改 `refundPolicy` 相關邏輯；本案活動未設退費政策屬主辦方設定，非程式缺陷。
- 不統一三條退費路徑（D7a），含路徑 B 的硬刪除行為。
- 不新增 `paymentState` 欄位、不回填既有資料（D6a）。
- 不調整既有 `teamCount` 值（D1a）。
- 不對本案當事人以外的任何 production 資料做寫入或修補。
- 不改 `ownerRefundWaitlist`。

---

## 10. 施工中浮現、留待另案的項目

| # | 項目 | 說明 | 建議處置 |
|---|---|---|---|
| N1 | **路徑 B 硬刪除與 D5 原則牴觸** | `payuniRefundAndDelete`（`:4133-4135`）刪除 team 與 members；D5 裁決為「取消報名但資料保留」 | 路徑統一另案時，改為 `status:"已取消"` + 保留資料，沿用 D5 原則，**不需重新裁決** |
| N2 | 部分退費保留款在帳務上不可見 | D3(a) 使該筆同時退出「應收」與「已收」，保留款僅存於 `deposit` 集合 | 另案：帳務頁增列「保留款」來源為 `deposit`，不從字串解析 |
| N3 | 退費政策未啟用時，報名者端仍顯示「申請退費」按鈕 | `my.html:466` 無條件渲染，點三步才撞牆（本案客訴的直接觸發點） | 另案 UX：渲染時即依政策狀態改為「退費請洽主辦方」或隱藏 |
| N4 | 路徑 C（`markRefunded`）退費後 `paymentStatus` 維持「已確認」 | 與路徑 A 口徑不同；目前因 `status:"已取消"` 被排除而未顯形 | 路徑統一另案一併處理 |
| N5 | `_ownerRefundCore` 未呼叫 `refreshRegistrantsForTeam` | 路徑 B／C 皆有呼叫，A 沒有；CRM 摘要不更新 | 併入批 4 一併補上（低風險、單行） |

---

## 11. 待授權

本文件產品口徑已於 2026-09-22 完成裁決。**尚未開工。**
開始實作與部署需另行明確授權；授權後依 §7 批次推進，每批通過 §8 驗收才進下一批。
