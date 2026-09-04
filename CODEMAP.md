# RegMaster 程式碼地圖 (CODEMAP)

> 建立日期：2026-08-07　　**最後更新：2026-09-04**（對齊 commit `74c6ed0`）
> 建立方式：CodeGraph v1.5.0 語意索引 ＋ 唯讀靜態掃描
> 用途：未來開發／改動前的第一站。回答「這功能在哪」「改這個會炸到誰」「前端這頁打哪些後端」。
>
> **本文件由唯讀分析產生，未修改任何原始碼、未部署、未連線 production。**
>
> 2026-09-04 更新內容：端點 261→**263**（新增 `sendCampaignTest`、`resetCampaignDelivery`）、`functions/index.js` 663→**691 KB**、**全部端點行號位移**已重抓、包裝器簽章新增第三參數、集合引用次數重算、CodeGraph 索引已排除備份影子副本。

---

## 0. 三十秒版本

| 你想知道 | 去哪裡 |
|---|---|
| 某個後端 API 在第幾行、誰有權限呼叫 | [§4 後端端點總表](#4-後端端點總表263-個) |
| 某個前端頁面會打哪些後端 | [§5 前端頁面地圖](#5-前端頁面地圖44-頁) |
| 某個 **內部 helper** 的呼叫鏈／影響半徑 | 用 CodeGraph（[§6](#6-codegraph-使用指南)），**不要 grep** |
| 資料存在哪個 collection | [§3.4 Firestore 集合](#34-firestore-集合48-個) |
| 這份地圖哪裡不可信 | [§7 已知盲區](#7-已知盲區必讀) ← **改動前務必看** |

---

## 1. 系統概觀

RegMaster 是一套**賽事／活動報名管理 SaaS**，多租戶（主辦方 = 租戶），部署在 Firebase。

```
瀏覽器
  │
  ├─ Firebase Hosting ──── public/**  (44 個 HTML 多頁應用，非 SPA)
  │                         └─ public/shared/*.js  (45 個共用腳本，其中 34 個是 i18n 字典)
  │
  └─ Cloud Functions (us-central1, nodejs20)
         functions/index.js   ← 單檔 691 KB / 263 個端點 / 225 個內部 helper
         functions/amego.js   ← 電子發票（光貿 Amego）串接
              │
              ├─ Firestore (asia-east1)  48 個集合
              ├─ Firebase Auth           （Google / LINE 第三方登入用）
              ├─ Storage                 （憑證素材、上傳檔）
              └─ 外部：PAYUNi 金流、Amego 發票、Gemini AI、firestore-send-email 擴充功能
```

**專案 ID：`regmaster-pro`（= production，本文件不觸碰）。** 舊的 `regmaster-v3` 已除役，只剩 301 轉址。

### 1.1 部署單元

| 單元 | 來源 | 備註 |
|---|---|---|
| Hosting | `public/`（**排除 `public/legacy/**` 與 `public/_*`**） | `firebase.json:8` |
| Functions | `functions/` | nodejs20，`predeploy: []`（無建置步驟） |
| Firestore rules / indexes | `firestore.rules` / `firestore.indexes.json` | |
| Storage rules | `storage.rules` | |
| Extension | `firestore-send-email@0.2.7` | 寫入 `mail` 集合即寄信 |

---

## 2. 架構上最關鍵的一件事：`google.script.run` Proxy 橋接

前端呼叫後端**不是**用 Firebase SDK 直接呼叫，而是走一層 **Google Apps Script 相容層**（專案前身是 GAS，這層是為了不重寫所有呼叫點而保留的）。

實作在 `public/shared/firebase-bridge.js`：

| 位置 | 角色 |
|---|---|
| [`firebase-bridge.js:321`](public/shared/firebase-bridge.js:321) `_callFn(name, args)` | 真正的呼叫器：查 `_argMap` 把位置參數轉成具名 payload、自動注入 `_auth`、走 `httpsCallable(name)` |
| [`firebase-bridge.js:347`](public/shared/firebase-bridge.js:347) `window.runFn(name, ...)` | Promise 風格包裝 |
| [`firebase-bridge.js:432`](public/shared/firebase-bridge.js:432) `window.google.script.run` | **ES6 Proxy**，`runner[任意函式名]()` 都會被攔截轉成 `_callFn` |
| [`firebase-bridge.js:~200-315`](public/shared/firebase-bridge.js:200) `_argMap` | 位置參數 → 具名欄位的對照表 |

### 為什麼這件事對開發者很重要

```js
// 前端呼叫長這樣 —— 函式名是 Proxy 的動態屬性，不是靜態符號
google.script.run.withSuccessHandler(cb).acceptTeam(teamId);
runFn('applyPayout', id, a, b);
```

`runner[name]` 是**執行期字串查表**。因此：

- ❌ **任何靜態分析工具（含 CodeGraph）都無法連起前端 → 後端這條邊。** 這也是本文件 §5 存在的理由。
- ⚠️ **改後端端點名稱＝改字串契約。** 沒有型別、沒有編譯器保護，改名只會在執行期炸。改名時必須同時搜前端字面字串。
- ⚠️ **改端點參數順序＝要同步改 `_argMap`。** 前端傳位置參數，`_argMap` 決定它變成哪個欄位名。漏改會靜默傳錯欄位（不是報錯，是傳 `undefined`）。
- ✅ Session 過期自動導回登入的邏輯集中在 Proxy 的 failure handler（`firebase-bridge.js:381-425`），新頁面不必自己處理。

---

## 3. 後端 `functions/index.js` 結構

691 KB 單檔。三層結構：

### 3.1 授權閘（三個包裝器，全部端點都經過其一）

| 包裝器 | 定義位置 | 意思 |
|---|---|---|
| `callable(handler)` | [index.js:281](functions/index.js:281) | **公開**，不驗身分（報名、查詢、金流 webhook 回拋等） |
| `authCallable(roles, handler, fnOpts)` | [index.js:822](functions/index.js:822) | 需登入，`roles` = `["system"]`（平台管理員）或 `["system","competition"]`（含主辦方） |
| `compAuthCallable(capability, handler, opts)` | [index.js:897](functions/index.js:897) | 在 `authCallable(["system","competition"])` 之上，再驗**這個帳號對這場活動有沒有該能力**；`capability` 省略時**預設 `manage`** |

> 後兩者的第三參數（`fnOpts` / `maybeOpts`）用來覆寫該端點的 Cloud Function 設定（記憶體、逾時等）。

**能力 → 角色對照**（[index.js:856](functions/index.js:856) `ROLE_CAPS`）：

| 角色 | view | checkin | scoring | manage | cert |
|---|:-:|:-:|:-:|:-:|:-:|
| `manager` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `staff` | ✅ | ✅ | | | ✅ |
| `judge` | ✅ | | ✅ | | |

活動擁有者（`comp.creator`）永遠通過；`system` 角色為 god-mode。

**⚠️ 已知陷阱**：`compAuthCallable` 只能從 `data.compId` / `data.teamId` 推出活動歸屬。若端點的唯一輸入是 `reqId` 之類的鍵，歸屬檢查會被**靜默跳過**，必須在載入文件後自行呼叫 [`assertCompCapability()`](functions/index.js:932) 補驗，否則造成跨主辦方 IDOR。新增這類端點時務必照做（原始碼 928-931 行有完整註解）。

### 3.2 授權分佈（263 個端點）

| 閘 | 數量 | 說明 |
|---|---:|---|
| `authCallable(["system","competition"])` | 59 ※ | 主辦方＋平台管理員（※ 其中 1 個參數順序寫成 `["competition","system"]`，語意相同） |
| `callable`（公開） | 57 | 報名端、查詢端、金流回拋 |
| `authCallable(["system"])` | 50 | 僅平台管理員 |
| `compAuthCallable`（省略＝預設 manage） | 50 | |
| `compAuthCallable("manage")` | 16 | |
| `compAuthCallable("view")` | 6 | |
| `compAuthCallable("scoring")` | 5 | |
| `compAuthCallable("cert")` | 4 | |
| `compAuthCallable("checkin")` | 3 | |
| `compAuthCallable("danger")` | 1 | `deleteCompetition` |
| `onRequest`（HTTP） | 6 | webhook / 追蹤像素 / OG 分享頁 |
| `onSchedule`（CRON） | 6 | 排程工作 |

### 3.3 內部 helper（225 個符號，CodeGraph 已完整索引）

這一層**不要手動找**，用 CodeGraph（§6）。幾個高流量節點供起手：

| Helper | 行 | 為什麼重要 |
|---|---|---|
| `checkAndReserveQuotaTx` | [188](functions/index.js:188) | 名額檢查＋預約的交易核心。**6 個呼叫點：3103 / 3911 / 3972 / 4360 / 4807 / 4928，改它要同批重佈**（見 memory: five-fixes-batch） |
| `assertCompCapability` | [932](functions/index.js:932) | 補驗活動歸屬，防跨租戶 IDOR |
| `memberHasCapability` / `memberRoleFor` | [866](functions/index.js:866) / [879](functions/index.js:879) | RBAC 查詢 |
| `callable` / `authCallable` / `compAuthCallable` | 281 / 822 / 897 | 所有端點的入口 |

### 3.4 Firestore 集合（48 個）

按後端引用次數排序（次數 ≒ 耦合度，數字大的改動風險高）：

| 集合 | 引用 | 集合 | 引用 | 集合 | 引用 |
|---|---:|---|---:|---|---:|
| `competitions` | 131 | `payoutRequests` | 8 | `auditLogs` | 5 |
| `teams` | 86 | `pdfFiles` | 8 | `knowledgeBase` | 4 |
| `accounts` | 58 | `appSecrets` | 7 | `emailTemplates` | 4 |
| `members` | 45 | `scores` | 7 | `billingRemittances` | 4 |
| `regPayments` | 24 | `deposits` | 7 | `certAssets` | 4 |
| `config` | 22 | `posterFiles` | 7 | `regFiles` | 4 |
| `invoices` | 21 | `coupons` | 6 | `accountPwdResets` | 4 |
| `mail` ※ | 18 | `visitors` | 6 | `aiMessages` | 3 |
| `licenses` | 17 | `registrants` | 6 | `feedback` | 3 |
| `orgMembers` | 16 | `notifications` | 6 | `formAssets` | 3 |
| `campaigns` | 12 | `teamPwdResets` | 5 | `settlements` | 3 |
| `orders` | 10 | `certTemplates` | 5 | `accountRequests` | 3 |
| `refundRequests` | 10 | `registrantSummary` | 5 | `onboarding` | 2 |
| `teamFiles` | 9 | `notifPrefs` | 5 | `feedbackFiles` | 2 |
| `announcements` | 8 | `invoiceReports` | 5 | `contactInquiries` | 1 |
| `discountCodes` | 8 | `aiConversations` | 5 | `rateLimits` | 1 |

※ `mail` 不是資料表——寫入即觸發 `firestore-send-email` 擴充功能寄信。

---

## 4. 後端端點總表（263 個）

**讀法**：`授權閘` 欄告訴你誰能呼叫；`前端呼叫頁` 欄是**靜態字串比對**的結果（Proxy 動態呼叫無法確認，見 §7），**已排除未部署的 `legacy/`**。`—` 表示沒有任何**已部署頁面**引用它——多為 CRON、webhook、遷移腳本、被其他端點內部呼叫者，以及只剩 `legacy/` 在用的**死碼候選**。

#### 帳號 / 登入 / 2FA / 第三方綁定

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `loginAccount` | 990 | public | login |
| `loginWithGoogle` | 1054 | public | login |
| `linkGoogleAccount` | 1106 | auth:system,competition | admin/settings |
| `getLinkedProviders` | 1127 | auth:system,competition | admin/settings |
| `unlinkProvider` | 1137 | auth:system,competition | admin/settings |
| `lineLoginCallback` | 1189 | public | line-callback |
| `linkLineAccount` | 1225 | auth:system,competition | line-callback |
| `loginVerifyTotp` | 1244 | public | login |
| `getTotpStatus` | 1278 | auth:system,competition | admin/settings |
| `generateTotpSecret` | 1283 | auth:system,competition | admin/settings |
| `enableTotp` | 1295 | auth:system,competition | admin/settings |
| `disableTotp` | 1308 | auth:system,competition | admin/settings |
| `listAccounts` | 1320 | auth:system | admin/system |
| `createAccount` | 1363 | auth:system | admin/system |
| `deleteAccount` | 1381 | auth:system | admin/system |
| `changePassword` | 1390 | auth:system,competition | admin/settings |

#### 個人檔案 / 收款帳戶 / 發票設定

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `getMyProfile` | 1410 | auth:system,competition | admin/settings |
| `savePayoutAccount` | 1432 | auth:system,competition | admin/settings |
| `saveInvoiceProfile` | 1451 | auth:system,competition | admin/settings |
| `saveEinvoiceMode` | 1485 | auth:competition,system | admin/settings |

#### 電子發票（Amego）

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `banLookup` | 1509 | public | admin/settings<br>events/register |
| `carrierCheck` | 1521 | public | events/register |
| `listMyInvoices` | 1530 | auth:system,competition | admin/events/payments |
| `getInvoicePdfFile` | 1562 | auth:system,competition | admin/events/payments |
| `getMyInvoices` | 1573 | public | my |
| `getMyInvoiceFile` | 1588 | public | my |
| `exportInvoices` | 1601 | auth:system,competition | admin/events/payments |
| `listMyInvoiceReports` | 1628 | auth:system,competition | admin/events/payments |
| `getInvoiceReportFile` | 1635 | auth:system,competition | admin/events/payments |
| `adminListInvoices` | 1646 | auth:system | admin/system |
| `retryInvoiceNow` | 1654 | auth:system,competition | admin/events/payments |
| `getAmegoPlatformStatus` | 1683 | auth:system | admin/system |
| `saveAmegoPlatformConfig` | 1691 | auth:system | admin/system |
| `testAmegoConnection` | 1707 | auth:system | admin/system |
| `reissueInvoice` | 1728 | comp:manage | admin/events/payments |

#### 平台管理 / 通知 / 稽核

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `adminRefundPlanOrder` | 1766 | auth:system | admin/system |
| `updateProfile` | 1801 | auth:system,competition | admin/settings |
| `deleteOwnAccount` | 1827 | auth:system,competition | admin/settings |
| `getGeminiKeys` | 1842 | auth:system | admin/system |
| `saveGeminiKeys` | 1847 | auth:system | admin/system |
| `addNotification` | 1890 | public | — |
| `getNotifications` | 1903 | auth:system,competition | — |
| `markNotificationRead` | 1910 | auth:system,competition | — |
| `markAllNotificationsRead` | 1937 | auth:system,competition | — |
| `logClientError` | 1953 | public | — |
| `getAuditLogs` | 1966 | auth:system | admin/audit |
| `getMyAuditLogs` | 1977 | auth:system,competition | admin/my-logs |

#### 活動 CRUD / 設定 / 公告 / 報名投遞

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `listCompetitionsPublic` | 2067 | public | events/index |
| `listCompetitions` | 2084 | auth:system,competition | admin/ai<br>admin/events/index<br>admin/index<br>admin/settings |
| `createCompetition` | 2199 | auth:system,competition | admin/events/index |
| `getCompetitionConfig` | 2257 | comp:manage *預設* | admin/events/certificates<br>admin/events/checkin<br>admin/events/scoring |
| `saveCompetitionConfig` | 2321 | comp:manage *預設* | admin/events/edit |
| `approveDescriptionSummary` | 2648 | comp:manage | admin/events/edit |
| `setRegistrationOpen` | 2764 | comp:manage *預設* | admin/events/hub<br>admin/events/index |
| `setCapacityLimit` | 2779 | auth:system | — |
| `deleteCompetition` | 2800 | comp:danger | admin/events/edit |
| `getRegistrationBundle` | 2835 | public | admin/events/announcements<br>admin/events/edit<br>admin/events/form-builder<br>admin/events/hub<br>admin/events/payments<br>admin/events/registrations<br>events/detail<br>events/payment<br>events/register |
| `getShareLink` | 2921 | public | — |
| `addAnnouncement` | 2934 | comp:manage *預設* | admin/events/edit |
| `getAnnouncements` | 2939 | public | admin/events/edit |
| `deleteAnnouncement` | 2943 | comp:manage *預設* | admin/events/edit |
| `submitRegistration` | 2954 | public | events/register |

#### 帳號驗證 / 密碼重設（管理者＋隊伍）

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `requestAccount` | 3208 | public | signup |
| `resetAdminPassword` | 3265 | public | forgot |
| `verifyAccountResetToken` | 3309 | public | reset-account |
| `resetAccountPassword` | 3322 | public | reset-account |
| `sendSystemEmail` | 3349 | auth:system | — |
| `verifyAccount` | 3371 | public | signup |
| `resendVerification` | 3493 | public | signup |
| `loginTeam` | 3519 | public | events/detail<br>events/register |
| `recoverTeamPassword` | 3558 | public | — |
| `requestTeamPasswordReset` | 3595 | public | events/detail |
| `verifyTeamResetToken` | 3644 | public | reset-team |
| `resetTeamPassword` | 3656 | public | reset-team |

#### 退費 refund

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `getRefundTemplates` | 3799 | public | admin/events/edit |
| `getCheckinToken` | 3807 | public | events/register<br>my |
| `getRefundPreview` | 3816 | public | events/detail<br>my |
| `requestRefund` | 3832 | public | events/detail<br>my |
| `withdrawRefund` | 3888 | public | — |
| `listRefundRequests` | 3934 | comp:manage *預設* | admin/events/registrations |
| `decideRefund` | 3942 | comp:manage *預設* | admin/events/registrations |
| `markRefunded` | 4025 | comp:manage *預設* | admin/events/registrations |
| `payuniRefundAndDelete` | 4071 | comp:manage | admin/events/payments |
| `getOwnerRefundContext` | 4152 | comp:manage | admin/events/payments |
| `ownerRefund` | 4251 | comp:manage | admin/events/payments |
| `ownerRefundWaitlist` | 4257 | comp:manage | admin/events/payments |
| `updateRegistration` | 4278 | public | events/register |

#### 報名資料 / 隊伍管理 / 付款確認 / 信件 / 評分(v1)

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `lookupRegistration` | 4391 | public | events/payment |
| `checkDuplicates` | 4407 | public | — |
| `getDashboardStats` | 4462 | comp:view | admin/events/hub<br>admin/index |
| `getAllTeams` | 4523 | comp:view | admin/events/checkin<br>admin/events/hub<br>admin/events/payments<br>admin/events/registrations<br>admin/events/scoring |
| `getRegistrationStats` | 4578 | comp:view | admin/events/registrations |
| `sendTeamEmail` | 4678 | comp:manage *預設* | admin/events/registrations |
| `getTeamDetail` | 4701 | comp:view | admin/events/payments<br>admin/events/registrations |
| `updateTeamDetailOwner` | 4740 | comp:manage | admin/events/registrations |
| `confirmPayment` | 4859 | comp:manage *預設* | admin/events/payments |
| `acceptTeam` | 4903 | comp:manage | admin/events/registrations |
| `deleteTeam` | 4959 | comp:manage *預設* | admin/events/payments<br>admin/events/registrations |
| `reconcilePayments` | 4992 | comp:manage *預設* | admin/events/payments |
| `exportTeamsCSV` | 5011 | comp:manage *預設* | admin/events/payments<br>admin/events/registrations |
| `saveEmailTemplate` | 5165 | comp:manage *預設* | — |
| `getEmailTemplates` | 5176 | comp:manage *預設* | — |
| `deleteEmailTemplate` | 5184 | comp:manage *預設* | — |
| `sendNotificationToTeam` | 5194 | comp:manage *預設* | — |
| `sendNotificationToAll` | 5224 | comp:manage *預設* | — |
| `saveScore` | 5275 | comp:scoring | — |
| `getScores` | 5287 | comp:scoring | — |

#### 授權碼 license

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `createLicense` | 5467 | auth:system | admin/system |
| `listLicenses` | 5485 | auth:system | admin/system |
| `clearExpiredLicenses` | 5500 | auth:system | — |
| `deleteLicense` | 5520 | auth:system | admin/system |
| `getLicenseStatus` | 5527 | auth:system,competition | admin/license |
| `activateLicense` | 5654 | auth:system,competition | admin/license |
| `consumeLicense` | 5710 | auth:system,competition | — |

#### AI（知識庫 / 問答 / 規則 PDF / 海報配色）

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `askCompetitionAI` | 5790 | public | events/detail |
| `rebuildKnowledgeBase` | 5989 | auth:system | admin/system |
| `getKnowledgeBaseStatus` | 6012 | auth:system | admin/system |
| `askAdminAI` | 6126 | comp:manage *預設* | admin/ai |
| `getCompKbStatus` | 6249 | comp:manage *預設* | admin/ai |
| `uploadRulesPdf` | 6276 | comp:manage *預設* | admin/events/edit |
| `getPdfData` | 6341 | public | admin/events/edit<br>events/detail |
| `uploadTeamFile` | 6364 | comp:manage | — |
| `uploadRegFile` | 6402 | public | events/register |
| `getRegFileData` | 6425 | comp:view | admin/events/registrations |
| `getTeamFileData` | 6448 | comp:manage *預設* | — |
| `analyzeRulesWithAI` | 6466 | comp:manage *預設* | admin/events/edit |

#### 檔案上傳 / 海報 / 表單圖 / 複製活動 / 報到(v1)

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `analyzePosterColors` | 6545 | comp:manage *預設* | admin/events/edit |
| `batchImportTeams` | 6637 | comp:manage *預設* | — |
| `updateTeamStatus` | 6754 | comp:manage *預設* | — |
| `clearAuditLogs` | 6810 | auth:system | — |
| `uploadPosterImage` | 6827 | comp:manage *預設* | admin/events/edit |
| `getPosterData` | 6855 | public | admin/events/edit<br>admin/events/index<br>events/detail<br>events/index<br>events/register |
| `uploadFormImage` | 6873 | comp:manage *預設* | admin/events/form-builder |
| `getFormImageData` | 6883 | public | admin/events/form-builder<br>events/register |
| `deleteFormImage` | 6893 | comp:manage *預設* | admin/events/form-builder |
| `deletePosterImage` | 6903 | comp:manage *預設* | admin/events/edit |
| `clearPosterTheme` | 6927 | comp:manage *預設* | admin/events/edit |
| `setPosterTheme` | 6938 | comp:manage *預設* | — |
| `setThemeColors` | 6951 | comp:manage *預設* | admin/events/edit |
| `setPosterFocus` | 6969 | comp:manage *預設* | admin/events/edit |
| `detectPosterFocus` | 6981 | comp:manage *預設* | admin/events/edit |
| `convertDescToInlineHtml` | 7027 | comp:manage *預設* | admin/events/edit |
| `deleteRulesPdf` | 7073 | comp:manage *預設* | — |
| `duplicateCompetition` | 7103 | comp:manage *預設* | admin/events/edit<br>admin/events/index |
| `checkInTeam` | 7141 | comp:checkin | — |

#### 金流（方案 / 優惠 / PAYUNi / 結算 / 撥款）

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `getSalesConfig` | 7484 | auth:system,competition | admin/license<br>admin/system |
| `getPublicPlans` | 7513 | public | index<br>pricing |
| `getMyPlan` | 7525 | auth:system,competition | admin/events/announcements<br>admin/events/edit<br>onboarding |
| `getUpgradeOptions` | 7572 | auth:system,competition | admin/license |
| `saveSalesConfig` | 7583 | auth:system | admin/system |
| `createCoupon` | 7611 | auth:system | — |
| `listCoupons` | 7618 | auth:system | — |
| `deleteCoupon` | 7622 | auth:system | — |
| `validateCoupon` | 7626 | public | — |
| `createPayuniOrder` | 7637 | auth:system,competition | admin/license |
| `payuniNotify` | 7747 | HTTP | — |
| `getOrderStatus` | 7782 | public | — |
| `reconcilePlanOrder` | 7796 | public | — |
| `reconcileRegPayment` | 7818 | public | events/payment |
| `validateDiscountCode` | 7901 | public | events/payment |
| `createDiscountCode` | 7911 | comp:manage *預設* | admin/events/edit |
| `listDiscountCodes` | 7927 | comp:manage *預設* | admin/events/edit |
| `deleteDiscountCode` | 7931 | comp:manage *預設* | admin/events/edit |
| `confirmManualPayment` | 7938 | public | events/payment |
| `createRegistrationPayment` | 7970 | public | events/payment<br>events/register |
| `payuniRegNotify` | 8072 | HTTP | — |
| `getOrganizerBilling` | 8159 | auth:system,competition | — |
| `markBillingAsRemitted` | 8303 | auth:system | — |
| `listRemittanceHistory` | 8323 | auth:system,competition | — |
| `listOrganizerAccounts` | 8334 | auth:system | admin/system |
| `getSettlementData` | 8352 | auth:system,competition | admin/system |
| `createSettlement` | 8446 | auth:system | admin/system |
| `migratePayoutStates` | 8532 | auth:system | — |
| `getPayableItems` | 8595 | comp:manage | admin/events/payments |
| `applyPayout` | 8640 | comp:manage | admin/events/payments |
| `withdrawPayout` | 8706 | comp:manage | admin/events/payments |
| `listPayoutRequests` | 8734 | auth:system | admin/system |
| `approvePayout` | 8742 | auth:system | admin/system |
| `rejectPayout` | 8752 | auth:system | admin/system |
| `markPayoutPaid` | 8778 | auth:system | admin/system |
| `getRegPaymentStatus` | 8827 | public | events/payment |

#### 排程與背景工作

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `checkDeadlines` | 8855 | auth:system | — |
| `sendNotifDigest` | 8899 | auth:system | — |
| `checkLicenseExpirations` | 8944 | auth:system | — |
| `dailyJobs` | 8966 | CRON | — |
| `weeklyJobs` | 8972 | CRON | — |
| `invoiceRetryWorker` | 8980 | CRON | — |
| `lotteryCheckWorker` | 9078 | CRON | — |
| `monthlyInvoiceReport` | 9129 | CRON | — |
| `processScheduledCampaigns` | 9209 | CRON | — |

#### 意見回饋 / 訂單 / 流量分析 / 資料遷移

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `submitFeedback` | 9221 | auth:system,competition | — |
| `listFeedback` | 9288 | auth:system | admin/system |
| `getFeedbackFile` | 9304 | auth:system | admin/system |
| `updateFeedbackStatus` | 9313 | auth:system | admin/system |
| `listOrders` | 9321 | auth:system | admin/system |
| `logVisit` | 9348 | public | — |
| `getUserAnalytics` | 9402 | auth:system | admin/system |
| `getVisitorStats` | 9570 | auth:system | — |
| `migrateTeamCounts` | 9620 | auth:system | — |
| `migrateViewCounts` | 9641 | auth:system | — |

#### V3：聯絡 / 偏好 / Session / 超管 / AI 對話

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `submitContactInquiry` | 9667 | public | contact |
| `getNotifPrefs` | 9738 | auth:system,competition | admin/settings |
| `saveNotifPrefs` | 9750 | auth:system,competition | admin/settings |
| `listSessions` | 9761 | auth:system,competition | admin/settings |
| `revokeSession` | 9775 | auth:system,competition | admin/settings |
| `getPlatformHealth` | 9789 | auth:system | admin/system |
| `listAllOrgs` | 9816 | auth:system | admin/system |
| `listConversations` | 9857 | auth:system,competition | admin/ai |
| `createConversation` | 9868 | auth:system,competition | admin/ai |
| `getConversation` | 9882 | auth:system,competition | admin/ai |
| `appendMessage` | 9896 | auth:system,competition | admin/ai |
| `deleteConversation` | 9918 | auth:system,competition | admin/ai |

#### 行銷活動 campaigns ＋ 追蹤像素

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `listCampaigns` | 9944 | comp:manage *預設* | admin/events/announcements |
| `getCampaignRecipients` | 10043 | comp:manage *預設* | admin/events/announcements |
| `createCampaign` | 10061 | comp:manage *預設* | admin/events/announcements |
| `updateCampaign` | 10090 | comp:manage *預設* | admin/events/announcements |
| `deleteCampaign` | 10127 | comp:manage *預設* | admin/events/announcements |

#### 評分 v2 / 報到 v2

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `sendCampaignNow` | 10281 | comp:manage *預設* | admin/events/announcements |
| `resetCampaignDelivery` | 10300 | comp:manage | admin/events/announcements |
| `sendCampaignTest` | 10345 | comp:manage | admin/events/announcements |
| `scheduleCampaign` | 10371 | comp:manage *預設* | admin/events/announcements |
| `trackOpen` | 10401 | HTTP | — |
| `trackClick` | 10413 | HTTP | — |
| `posterImage` | 10423 | HTTP | — |
| `eventShare` | 10443 | HTTP | — |
| `submitJudgeScore` | 10489 | comp:scoring | admin/events/scoring |
| `getLiveLeaderboard` | 10533 | comp:scoring | admin/events/certificates<br>admin/events/scoring |
| `saveScoringConfig` | 10596 | comp:manage | admin/events/scoring |
| `scoringApi` | 10742 | comp:scoring | admin/events/scoring |
| `checkInTeamV2` | 10802 | comp:checkin | admin/events/checkin |
| `checkinSearch` | 10839 | comp:checkin | admin/events/checkin |

#### 表單 schema（拖拉表單產生器）

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `saveCheckinConfig` | 10869 | comp:manage | admin/events/checkin |
| `selfCheckIn` | 10901 | public | admin/events/checkin |

#### 儀表板洞察 / 待辦聚合

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `getFormSchema` | 11100 | comp:manage *預設* | admin/events/certificates<br>admin/events/edit<br>admin/events/form-builder |
| `saveFormSchema` | 11138 | comp:manage *預設* | admin/events/form-builder |

#### 報名人 registrant 帳號綁定

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `getAiInsights` | 11238 | auth:system,competition | admin/index |
| `getTodoList` | 11338 | auth:system,competition | admin/index |
| `listMyRegistrationsByEmail` | 11466 | public | my |
| `bindRegistrantSocial` | 11587 | public | events/detail<br>line-callback |
| `listMyRegistrationsBySocial` | 11600 | public | events/detail<br>line-callback<br>my |
| `getRegistrantStatus` | 11617 | public | events/detail |
| `listRegistrants` | 11628 | auth:system | — |

#### 組織成員 RBAC

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `reconcileRegistrants` | 11766 | auth:system | admin/system |
| `queryRegistrants` | 11773 | auth:system | admin/system |

#### 證書 / 名牌

| 端點 | 行 | 授權閘 | 前端呼叫頁 |
|---|---|---|---|
| `getRegistrantDetail` | 11837 | auth:system | admin/system |
| `deleteRegistrantBinding` | 11842 | auth:system | admin/system |
| `getOnboardingState` | 11854 | auth:system,competition | onboarding |
| `saveOnboardingStep` | 11864 | auth:system,competition | onboarding |
| `inviteMember` | 11899 | auth:system,competition | admin/settings<br>onboarding |
| `listOrgMembers` | 11928 | auth:system,competition | admin/events/scoring<br>admin/settings |
| `updateMemberRole` | 11953 | auth:system,competition | admin/settings |
| `revokeMember` | 11967 | auth:system,competition | admin/settings |
| `listMyInvites` | 11977 | auth:system,competition | admin/settings |
| `acceptInvite` | 11994 | auth:system,competition | admin/settings |
| `declineInvite` | 12009 | auth:system,competition | admin/settings |
| `getMyEventRole` | 12023 | auth:system,competition | admin/events/checkin<br>admin/events/hub<br>admin/events/payments<br>admin/events/registrations<br>admin/events/scoring |
| `uploadCertAsset` | 12055 | comp:cert | admin/events/certificates |
| `getCertAssetData` | 12076 | public | admin/events/certificates<br>my |
| `listCertTemplates` | 12091 | comp:cert | admin/events/certificates |
| `saveCertTemplate` | 12117 | comp:cert | admin/events/certificates |
| `deleteCertTemplate` | 12149 | comp:cert | admin/events/certificates |
| `getCertRecipients` | 12163 | comp:view | admin/events/certificates |
| `getPublicCertTemplates` | 12189 | public | my |
---

## 5. 前端頁面地圖（44 頁）

### 5.1 全域事實

- **多頁應用（MPA）**，不是 SPA。每頁自己載 Firebase compat SDK → `init.js` → `firebase-bridge.js` → i18n → nav。
- **頁面邏輯幾乎全是 HTML 內嵌 `<script>`**（合計約 **1.39 MB**；扣掉未部署的 `legacy/` 後仍有約 1.06 MB）。這是 CodeGraph 的盲區，也是這一節存在的原因。
- 共用腳本在 `public/shared/`：45 個檔案中 **34 個是 i18n 字典**（每檔 1 個符號，純字串表），真正有邏輯的只有 11 個：

  | 檔案 | 職責 |
  |---|---|
  | `firebase-bridge.js` | **後端呼叫橋接**（§2），所有需要後端的頁面必載 |
  | `app-state.js` | 全域狀態、cookie / localStorage、`window.ME` |
  | `ui-dialog.js` | 對話框 / toast / 載入指示 |
  | `admin-nav.js` / `public-nav.js` | 後台 / 前台導覽列 |
  | `i18n.js` | 語言切換引擎（其餘 `i18n-*.js` 是各頁字典） |
  | `sanitize.js` | 富文字消毒（`events/detail` 顯示主辦方 HTML 用） |
  | `img-util.js` | 上傳前壓縮 |
  | `tw-banks.js` | 台灣銀行代碼表（135 KB 純資料） |
  | `track-visit.js` | 流量記錄 |
  | `reveal.js` | 捲動進場動效（landing 四頁：`index` / `about` / `features` / `pricing`）。⚠️ 動畫不可從 `opacity:0` 起始、隱藏樣式須掛 `html.js-reveal`，否則傷 SEO |

### 5.2 路由（`firebase.json` rewrites）

乾淨網址靠 Hosting rewrite，不是前端 router：

| 網址 | 實際檔案 |
|---|---|
| `/admin/events/*/edit` | `admin/events/edit.html` |
| `/admin/events/*/form-builder` | `admin/events/form-builder.html` |
| `/admin/events/*/announcements` | `admin/events/announcements.html` |
| `/admin/events/*/payments` | `admin/events/payments.html` |
| `/admin/events/*/registrations` | `admin/events/registrations.html` |
| `/admin/events/*/scoring` | `admin/events/scoring.html` |
| `/admin/events/*/checkin` | `admin/events/checkin.html` |
| `/admin/events/*/certificates` | `admin/events/certificates.html` |
| `/admin/events/*` | `admin/events/hub.html`（fallback，須放最後） |
| `/admin/super` | `admin/super.html` |
| `/e/**` | **Cloud Function `eventShare`**（SSR 注入 OG meta 給社群預覽） |
| `/legacy{,/**}` | 301 → `/` |

⚠️ 新增 `/admin/events/*/xxx` 頁面時，**rewrite 必須加在 `/admin/events/*` fallback 之前**，否則會被 hub 吃掉。

### 5.3 頁面清單

`內嵌JS` = 該頁 HTML 裡 `<script>` 的字元量（改動成本指標）。`後端` = 呼叫的端點數。**數據對齊 commit `74c6ed0`（2026-09-03）。**

#### 主辦方後台 `/admin`

| 頁面 | 內嵌JS | 後端 | 職責 |
|---|---:|---:|---|
| [`admin/system.html`](public/admin/system.html) | 87 KB | 35 | **平台超級管理台**：帳號、發票平台設定、Gemini 金鑰、授權碼、方案定價、結算撥款、意見回饋、訂單、流量、報名人查詢。全站最重的後台頁 |
| [`admin/settings.html`](public/admin/settings.html) | 35 KB | 27 | 個人設定：第三方綁定、2FA、密碼、收款帳戶、發票設定、通知偏好、Session、**組織成員邀請 RBAC** |
| [`admin/ai.html`](public/admin/ai.html) | 31 KB | 8 | AI 助理工作區（對話歷史 CRUD ＋ 知識庫狀態） |
| [`admin/index.html`](public/admin/index.html) | 17 KB | 4 | 後台首頁：儀表板統計、AI 洞察、待辦聚合 |
| [`admin/license.html`](public/admin/license.html) | 14 KB | 5 | 授權碼啟用 ／ 方案升級購買 |
| [`admin/audit.html`](public/admin/audit.html) | 4 KB | 1 | 稽核日誌（全站） |
| [`admin/my-logs.html`](public/admin/my-logs.html) | 4 KB | 1 | 我的操作日誌 |
| `admin/super.html` | 0 | 0 | 純轉址殼 |

#### 單一活動管理 `/admin/events`

| 頁面 | 內嵌JS | 後端 | 職責 |
|---|---:|---:|---|
| [`edit.html`](public/admin/events/edit.html) | **99 KB** | 26 | **活動設定總成**：基本資料、報名表設定、公告、規則 PDF＋AI 分析、海報上傳／配色／焦點、佈景、折扣碼、複製活動。**後端層面最複雜的活動設定頁** |
| [`certificates.html`](public/admin/events/certificates.html) | 67 KB | 9 | 證書／名牌範本編輯器（Canvas 渲染在前端） |
| [`registrations.html`](public/admin/events/registrations.html) | 67 KB | 14 | 報名名單：檢視、編輯、正取錄取、刪除、CSV 匯出、退費審核 |
| [`scoring.html`](public/admin/events/scoring.html) | 58 KB | 8 | 評分 v2：多評審、即時排行榜、評分設定 |
| [`form-builder.html`](public/admin/events/form-builder.html) | 65 KB | 6 | 拖拉式報名表產生器（`getFormSchema` / `saveFormSchema`） |
| [`payments.html`](public/admin/events/payments.html) | 50 KB | 22 | **金流總表**：付款確認、對帳、退費、PAYUNi 退刷、發票開立／重開／匯出、撥款申請 |
| [`checkin.html`](public/admin/events/checkin.html) | 33 KB | 7 | 報到（QR 掃描 ／ 搜尋 ／ 自助） |
| [`announcements.html`](public/admin/events/announcements.html) | 42 KB | 11 | 行銷活動 campaigns：**自訂勾選隊伍＋身分篩選＋一隊一封＋測試寄送**（`sendCampaignTest` / `resetCampaignDelivery`） |
| [`hub.html`](public/admin/events/hub.html) | 22 KB | 5 | 單一活動首頁 ／ 導覽中樞 |
| [`index.html`](public/admin/events/index.html) | 18 KB | 5 | 活動列表（建立、開關報名、複製） |

#### 公開端 ／ 報名者

| 頁面 | 內嵌JS | 後端 | 職責 |
|---|---:|---:|---|
| [`events/register.html`](public/events/register.html) | **110 KB** | 11 | **報名主流程（已部署頁中最大）**：動態表單、黑名單檢查、載具驗證、檔案上傳、送出報名、建立金流訂單 |
| [`my.html`](public/my.html) | 60 KB | 9 | 報名者個人中心：我的報名、發票、報到碼、退費申請、證書下載 |
| [`events/detail.html`](public/events/detail.html) | 48 KB | 11 | 活動詳情頁：簡介、公告、隊伍登入、退費、AI 問答、社群帳號綁定 |
| [`events/payment.html`](public/events/payment.html) | 15 KB | 7 | 付款頁：折扣碼、匯款回報、金流狀態輪詢 |
| [`events/index.html`](public/events/index.html) | 16 KB | 2 | 活動列表（公開） |
| [`login.html`](public/login.html) | 10 KB | 3 | 登入（帳密 ／ Google ／ TOTP） |
| [`onboarding.html`](public/onboarding.html) | 10 KB | 4 | 新主辦方導引 |
| [`signup.html`](public/signup.html) | 8 KB | 3 | 註冊 ／ 信箱驗證 |
| [`contact.html`](public/contact.html) | 5 KB | 1 | 聯絡表單 |
| [`line-callback.html`](public/line-callback.html) | 5 KB | 4 | LINE 登入回呼 |
| [`pricing.html`](public/pricing.html) / [`index.html`](public/index.html) | 6 / 7 KB | 1 | 定價頁 ／ 首頁（`getPublicPlans`） |
| `forgot.html` / `reset-account.html` / `reset-team.html` | 2 KB | 1–2 | 密碼重設三部曲 |
| `payuni-return.html` | 2 KB | 0 | 金流跳轉落地頁（純前端） |

#### 純內容頁（無後端呼叫）

`about` / `features` / `privacy` / `terms` / `EULA` / `404` / `Manual.html`（156 KB 使用手冊，純靜態）/ `tutorials/index.html`（22 KB，25 部教學影片內嵌播放器）

#### ⚠️ 死碼：`public/legacy/`

| 檔案 | 大小 | 狀態 |
|---|---:|---|
| `legacy/index.html` | 361 KB（282 KB 內嵌 JS，呼叫 67 個端點） | **未部署**（`firebase.json` ignore ＋ 301 轉址） |
| `legacy/system-settings.html` | 65 KB（21 個端點） | 同上 |

這是改版前的舊 SPA。**它仍在 repo 裡，且是全站最大的檔案**——搜尋時很容易誤中。修 bug 前先確認你不是在改 legacy。

**263 個端點中有 59 個不被任何已部署頁面引用**（§4 表中標 `—`）。這 59 個分成三類，**只有第三類才是刪除候選**：

| 類別 | 數量 | 內容 |
|---|---:|---|
| ① 本來就不該有前端呼叫 | 18 | 6 個 CRON（`dailyJobs` `weeklyJobs` `invoiceRetryWorker` `lotteryCheckWorker` `monthlyInvoiceReport` `processScheduledCampaigns`）＋ 6 個 HTTP（`payuniNotify` `payuniRegNotify` `trackOpen` `trackClick` `posterImage` `eventShare`）＋ 6 個遷移／維運（`migratePayoutStates` `migrateTeamCounts` `migrateViewCounts` `checkDeadlines` `sendNotifDigest` `checkLicenseExpirations`） |
| ② 疑似尚未接線或後端內部使用 | ~10 | `getOrganizerBilling` `markBillingAsRemitted` `listRemittanceHistory` `listRegistrants` `reconcilePlanOrder` `getOrderStatus` `addNotification` `logClientError` `recoverTeamPassword` `withdrawRefund` |
| ③ **只剩 `legacy/` 在用＝刪除候選** | ~31 | `consumeLicense`、`saveScore`／`getScores`(v1)、`checkInTeam`(v1)、`batchImportTeams`、`updateTeamStatus`、`getShareLink`、`checkDuplicates`、`setCapacityLimit`、`clearExpiredLicenses`、`createCoupon`／`listCoupons`／`deleteCoupon`／`validateCoupon`、`getVisitorStats`、`sendSystemEmail`、`clearAuditLogs`、`uploadTeamFile`／`getTeamFileData`、`deleteRulesPdf`、`submitFeedback`、`logVisit`、`setPosterTheme`、`saveEmailTemplate`／`getEmailTemplates`／`deleteEmailTemplate`、`sendNotificationToTeam`／`sendNotificationToAll`、`getNotifications`／`markNotificationRead`／`markAllNotificationsRead` |

⚠️ **清理前必須逐一確認**：`—` 只證明「沒有已部署 HTML 提到這個字串」，不證明沒人呼叫。它可能被**其他後端端點內部呼叫**、被 CRON 觸發、或被外部系統（金流、Amego）打進來。刪除前至少要 `codegraph explore <name>` 看後端內部呼叫者，再確認外部沒有依賴。

---

## 6. CodeGraph 使用指南

已在本專案建立語意索引：

```
索引位置   RegMaster/.codegraph/        （自帶 .gitignore 自我排除）
排除設定   RegMaster/codegraph.json     （排除 _backup_*/ 與 V1_backup/，見 §7.4）
MCP 設定   RegMaster/.mcp.json
權限白名單 RegMaster/.claude/settings.json
Agent 說明 RegMaster/.claude/CLAUDE.md
規模       79 檔 / 744 節點 / 3,687 邊 / 6.9 MB     （2026-09-04 重建）
遙測       已關閉
```

**索引會自動同步，平常不需要手動更新。** MCP server 用 OS 檔案事件監看（2 秒 debounce），連線時還會做一次 `(size, mtime)` + hash 對帳，把「沒開 agent 時 git pull 進來的改動」補上。`codegraph status` 末行會回報是否為最新。**只有改了 `codegraph.json` 的排除規則時才需要手動 `codegraph index` 全量重建**（此時要先停掉持有 DB 的 daemon，否則會 EPERM，PID 在 `.codegraph/daemon.pid`）。

### 覆蓋範圍

| 已索引 ✅ | 未索引 ❌ |
|---|---|
| `functions/index.js` 的 225 個內部 helper | **263 個 `exports.X` 端點**（見 §7.1） |
| `functions/amego.js`（22 符號）、`functions/test/acceptance.test.js` | **44 個 HTML 的 1.39 MB 內嵌 JS**（見 §7.3） |
| `public/shared/*.js` 全部 45 檔 | `firestore.rules`、`firebase.json`、`.md` 等非程式碼 |
| `_dev/`、`_verify_*/` 驗證腳本（23 檔） | `.gitignore` 內容（`_archive`、`_backup/`、影片） |
| | **`_backup_20260902_*` / `_backup_20260903_*`**（影子副本，2026-09-04 起排除） |

### 該怎麼問

| 意圖 | 問法 |
|---|---|
| 理解機制 | 「名額預約與備取給號是怎麼運作的？」 |
| 追流程 | 點名兩端符號：`checkAndReserveQuotaTx` `memberRoleFor` |
| 評估風險 | 「我要改 `assertCompCapability` 的簽章，會波及什麼？」 |
| 讀原始碼 | 直接把符號名或檔名丟進 query，回傳帶行號的現行原始碼 |

**紀律**：
- explore 回傳的原始碼**等同已 Read**，不要再開一次同檔。
- **不要用 grep 複驗 CodeGraph 的結果**（AST 解析比文字搜尋準）。
- 但 **§7 列出的盲區必須用 grep／本文件**，CodeGraph 在那裡是空白而非錯誤。
- 出現 ⚠️ 過期橫幅時，直接 Read 被點名的檔案；未被點名的仍可信。

### 維運

```bash
codegraph status
```
```bash
codegraph sync
```
```bash
codegraph uninit
```
（`uninit` 只刪 `.codegraph/`，不動任何原始碼；`codegraph uninstall` 再移除 MCP 設定與 CLI。）

---

## 7. 已知盲區（必讀）

改動前請把這四點當成前提，否則會踩到「工具說沒事，實際炸了」。

### 7.1 ❌ CodeGraph 看不到 263 個 Cloud Function 端點

端點全部寫成：

```js
exports.acceptTeam = compAuthCallable("manage", async (data, request) => { ... });
```

這是「賦值給 member expression ＋ 匿名 arrow」，tree-sitter 的 JS 擷取器**不會建立具名節點**。實測後果：

```
codegraph callers checkAndReserveQuotaTx
→ 回傳「file index.js」而非那 6 個真正呼叫它的端點名
```

**因應**：端點層級的關係查 §4 總表；helper 層級才交給 CodeGraph。

### 7.2 ❌ 前端 → 後端的邊完全靠字串

§2 的 Proxy 讓這條邊在執行期才成立。§5 / §4 的「前端呼叫頁」欄是**靜態字串比對**產生的，因此：

- 可能**漏抓**：以變數組出函式名者（`runFn(action)`）抓不到。
- 可能**誤抓**：字串剛好同名（例如前端自己也有同名區域函式）。

視為**強線索而非保證**。真要確認，搜前端字面字串。

### 7.3 ❌ HTML 內嵌 JS 不進圖

1.39 MB 的頁面邏輯（`events/register.html` 110 KB、`edit.html` 99 KB、`system.html` 87 KB…）對 CodeGraph 是空白。改前端只能 Read／Grep。

> **後續改善建議（未執行，僅記錄）**：把內嵌 `<script>` 逐頁外抽成 `public/shared/page-*.js`，抽一頁就自動進圖一頁。優先序建議照內嵌量：`register`(110) → `edit`(99) → `system`(87) → `registrations`(67) → `certificates`(67) → `form-builder`(65)。這是純搬移、零邏輯變更，可分頁進行、每頁獨立驗證。

### 7.4 ⚠️ 備份資料夾的「影子副本」——已處理，但這個坑會再犯

2026-09-04 發現索引吃進了兩個本機備份資料夾：

| 資料夾 | 內容 | 與現行 `functions/index.js` 的差異 |
|---|---|---|
| `_backup_20260903_admin-ai-deployed/index.js` | 225 符號 | **0 行不同（逐位元組相同）** |
| `_backup_20260902_admin-ai/index.js` | 220 符號 | 95 行不同 |

後果：後端每個符號在圖裡有 2–3 份重複節點（節點數被灌到 1,194），`callers` / `impact` 被稀釋，而且**舊備份的行號是錯的**，agent 可能照著舊副本改。

已在 `codegraph.json` 排除：

```json
{ "exclude": ["_backup_*/", "V1_backup/"] }
```

重建後回到 79 檔 / 744 節點。

⚠️ **這個坑會再犯**：專案習慣在改動前開 `_backup_YYYYMMDD_*/` 快照。`_backup_*/` 這個 glob 已涵蓋未來的同名快照，**但換個命名（例如 `bak_*`、`old/`）就會再度污染**。開新命名的備份資料夾時，記得一併加進 `codegraph.json`，或直接沿用 `_backup_` 前綴。

### 7.5 ⚠️ 索引含開發用驗證腳本，會稀釋影響分析

`_verify_capacity/`、`_verify_einvoice/`、`_verify_fixes/`、`_verify_edm/`（23 個一次性驗證腳本，未進版控）也在圖裡。實測 `callers checkAndReserveQuotaTx` 的 6 個結果中有 4 個來自這些腳本。

**刻意保留**——它們記錄了各項修復的驗證方式，有參考價值。要排除的話把它們加進 `codegraph.json` 的 `exclude` 再跑 `codegraph index` 即可。

---

## 8. 改動前檢查清單

| 你要改 | 先確認 |
|---|---|
| 後端端點**名稱** | 前端字面字串（Proxy 無編譯期保護）＋ `_argMap` |
| 後端端點**參數順序** | `firebase-bridge.js` 的 `_argMap` 對照 |
| 共用 helper | `codegraph impact <name>` ＋ 過濾掉 `_verify_*` 雜訊 |
| `checkAndReserveQuotaTx` | **6 個呼叫端必須同批重佈**（見 memory: five-fixes-batch） |
| 新增 `compAuthCallable` 端點且輸入無 `compId`/`teamId` | 必須自行呼叫 `assertCompCapability()`，否則跨租戶 IDOR |
| 新增 `/admin/events/*/xxx` 頁 | rewrite 要加在 `/admin/events/*` fallback **之前** |
| 前端頁面 | 確認不是在改 `public/legacy/`（未部署） |
| Firestore 查詢 | 是否需要 `firestore.indexes.json` 新複合索引 |
| CSP／安全標頭 | 目前是 **report-only**；改 enforced 會擋 Google 登入（見 memory: csp-report-only-decision），必須先在預覽頻道實測 |
| 開改動前的備份快照 | 用 `_backup_YYYYMMDD_*/` 命名，否則影子副本會污染 CodeGraph（見 §7.4） |
| 大批 Functions 重佈 | 曾遇 CPU 配額 429，須分批（電子發票案分 9 批）；429 後顯示 Skipped 的函式是舊碼，要指名重佈 |

---

## 9. 本文件的產生方式與更新

| 章節 | 來源 | 會過期嗎 |
|---|---|---|
| §3.1–3.2 授權閘 | 掃描 `^exports\.` ＋ 包裝器解析 | 會，新增端點後需重跑 |
| §3.4 集合 | 掃描 `.collection("X")` | 會 |
| §4 端點總表 | 同上 ＋ 44 頁 HTML 字串比對 | 會 |
| §5 頁面地圖 | 掃描 `<script src>`、內嵌 script 長度、`<title>` | 會 |
| §6 CodeGraph 覆蓋 | `codegraph status` / `files` | `codegraph sync` 自動 |
| §7 盲區 | 實測驗證（`callers` / `query` 對照原始碼） | 除非 CodeGraph 改版，否則不會 |

**兩者的更新頻率不同，別混為一談：**

| | CodeGraph 索引 | 本文件 |
|---|---|---|
| 更新方式 | **自動**（檔案監看＋連線對帳） | **手動重跑掃描** |
| 什麼時候要出手 | 只有改 `codegraph.json` 排除規則時 | 每次新增／刪除端點、新增頁面、大幅改版後 |
| 怎麼確認是否為最新 | `codegraph status` 末行 | 比對本文件表頭日期與 `git log -1` |

**重新產生的做法**（唯讀，不動原始碼）：

1. 掃 `^exports\.(\w+)\s*=` 取端點名、行號、包裝器 → 重建 §3.2 / §4
2. 掃 `\.collection\("X"\)` 計次 → 重建 §3.4
3. 逐頁 HTML 掃 `<script src>`、內嵌 `<script>` 長度、以端點名做字面比對 → 重建 §5 與 §4 的「前端呼叫頁」欄
4. `codegraph status` / `codegraph files` → 更新 §6

**過期偵測捷徑**：`grep -c '^exports\.' functions/index.js` 若不等於本文件表頭寫的數字，§4 的行號**全部**都可能已位移，整份表就該重生。

---

*建立於 2026-08-07，最後更新 2026-09-04（對齊 commit `74c6ed0`）。全程唯讀：未修改原始碼、未部署、未連線 production（`regmaster-pro`）。*
