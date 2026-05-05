# RegMaster UI 重新設計規劃書 v3

> 目標：將 Claude Design 第二版 zip 提供的**完整 23 個畫面**整合進 RegMaster 應用，**並補齊缺漏的後端 callable 與功能**。
>
> 撰寫日期：2026-05-05（v3）
> 狀態：規劃完成，**等候您下指令進入 Phase 0**

---

## 0. 拍板決議（含 v2 五項 + Auto-mode 新增）

| # | 議題 | 決定 |
| --- | --- | --- |
| 1 | 字級 | **保持原始 19px**，所有元件須符合手機 RWD（≤480 / ≤768 / ≤1024px 三檔）|
| 2 | 報名 wizard | **保留 5 步驟**（隊伍 → 學員 → 指導老師 → 自訂問題 → 確認）|
| 3 | Dashboard 漏斗 / 熱點 / 排行 | **要做** |
| 4 | system-settings.html | 一併套樣 |
| 5 | i18n | 所有 UI（除使用者輸入）必須能切中／英文 |
| 6 | Logo | 沿用 `favicon.png`（或 SVG），**不採用設計稿 R mark** |
| 7 | 部署 | 本次只在 **localhost emulator** 跑通；deploy 由您手動 |
| 8 | 安全 | 動工前**先做還原點與備份**（已完成 ✅，第 9 節） |
| 9 | **新功能** | v2 zip 引入新畫面所對應的後端 callable，**全數補齊**（第 3 節清單） |

---

## 1. 設計稿盤點（v2 zip 全 9 檔，23 個畫面）

| 檔案 | 行數 | 內含畫面數 | 對應現行功能 |
| --- | --- | --- | --- |
| `shared.css` | 111 | — design tokens | 全站 |
| `index.html` | 117 | 1（hub demo） | 不直接套用 |
| `registration.html` | 466 | 報名 wizard | `v-form` |
| `event-settings.html` | 604 | 活動設定（sidebar + 6 tabs）| `v-admin → aEditComp` |
| `event-info.html` | 713 | 活動資訊 / Dashboard | `v-admin → aDash` |
| **`auth.html`**（新）| 474 | 6 個：登入 / 註冊 / OTP / 忘記密碼 / 重設 / EULA | `mLogin / mSignup / mVerify / mForgotPwd / mEula` modal |
| **`participant.html`**（新）| 772 | 5 個：成功頁 / 查詢登入 / 我的所有報名 / 詳情頁 / 付款結帳 | `v-success` / `v-comp lookup` / `v-form 付款區` |
| **`admin-tools.html`**（新）| 980 | 4 個：建立活動 wizard / 成績登錄 / QR 報到 / 名牌證書 | `mNewComp` / `dsc 子 tab` / `dqr 子 tab` / **無對應** |
| **`system.html`**（新）| 1 072 | 5 個：購買授權 / 授權歷史 / 操作日誌 / 帳戶設定 / 意見反饋 | `openPurchaseFlow` / `mMyLicHistory` / 現有 audit logs / `system-settings.html` / `mFeedback` |

---

## 2. 後端對照表（functions/index.js 已有 97 個 exports）

### 2.1 既有 callable（會繼續使用，**不動 API 名稱**）

```
auth: loginAccount, createAccount, requestAccount, verifyAccount,
      resetAdminPassword, sendSystemEmail, changePassword

participant: lookupRegistration, loginTeam, updateRegistration,
             checkDuplicates, submitRegistration

competition: listCompetitions, createCompetition, getCompetitionConfig,
             saveCompetitionConfig, deleteCompetition, duplicateCompetition,
             setRegistrationOpen, setCapacityLimit, getShareLink,
             getRegistrationBundle, addAnnouncement, getAnnouncements

dashboard: getDashboardStats, getAllTeams, getTeamDetail, exportTeamsCSV,
           reconcilePayments, listOrders

email: saveEmailTemplate, getEmailTemplates, deleteEmailTemplate,
       sendNotificationToTeam, sendNotificationToAll

scoring: saveScore, getScores
checkin: checkInTeam

license: createLicense, listLicenses, deleteLicense, activateLicense,
         consumeLicense, getLicenseStatus, clearExpiredLicenses

payment: getSalesConfig, saveSalesConfig, createCoupon, listCoupons,
         deleteCoupon, validateCoupon, createPayuniOrder, getOrderStatus,
         createRegistrationPayment, getRegPaymentStatus, payuniNotify,
         payuniRegNotify, confirmPayment

ai: askCompetitionAI, askAdminAI, analyzeRulesWithAI, analyzePosterColors,
    aiConvertInlineHTML

files: uploadRulesPdf, uploadTeamFile, getTeamFileData, getPdfData,
       uploadPosterImage, getPosterData, deletePosterImage, deleteRulesPdf

audit/logs: getAuditLogs, clearAuditLogs, logVisit, logClientError, getVisitorStats
notif: addNotification, getNotifications, markNotificationRead, markAllNotificationsRead

feedback: submitFeedback, listFeedback, getFeedbackFile, updateFeedbackStatus

team mgmt: confirmPayment, deleteTeam, updateTeamStatus, batchImportTeams

system: clearAuditLogs, productionReset, migrateTeamCounts, migrateViewCounts
```

### 2.2 **缺漏 callable — 本次需新增**（13 個）

| # | 新 callable | 用途 | 對應設計畫面 |
| --- | --- | --- | --- |
| 1 | `listRegistrationsByEmail` | 報名者輸入 Email + OTP，回傳跨活動的所有報名 | participant p3 |
| 2 | `sendParticipantOtp` | 寄送 6 碼 OTP 給報名者 Email | participant p2 |
| 3 | `getCompetitionTemplates` | 9 種預設模板（競賽 / 研討會 / 運動 …）| admin-tools p1 |
| 4 | `createCompetitionFromTemplate` | 用模板建立活動（覆蓋現行 createCompetition）| admin-tools p1 |
| 5 | `getCertTemplates` / `saveCertTemplate` / `deleteCertTemplate` | 名牌 / 證書模板 CRUD | admin-tools p4 |
| 6 | `generateCerts` | 批次產生 PDF（用 puppeteer / pdfkit）| admin-tools p4 |
| 7 | `getSubscription` / `subscribeToPlan` / `cancelSubscription` | 訂閱方案管理 | system p1 |
| 8 | `getLicenseUsageStats` | 餘額 / 累計 / 本月用量 4 KPI | system p2 |
| 9 | `getAuditLogsAdvanced` | 多維度過濾 + diff 格式（修改 old→new）| system p3 |
| 10 | `inviteCollaborator` / `listCollaborators` / `removeCollaborator` | 協作管理員邀請 | system p4 |
| 11 | `setupTotp` / `verifyTotp` / `disableTotp` | 雙重驗證（Authenticator App）| system p4 |
| 12 | `generateApiKey` / `listApiKeys` / `revokeApiKey` | API 金鑰管理 | system p4 |
| 13 | `getNotificationPrefs` / `saveNotificationPrefs` + LINE 整合（`linkLineAccount` / `sendLineMessage`）| 即時報名通知 / 每日摘要 | system p4 |

> Phase 7-10 會逐步實作；簡單功能（subscription、usage stats、advanced logs）可先 1-2 天做完，重型功能（PDF cert generation、TOTP、LINE 整合）會獨立成自己的 Phase。

---

## 3. 整合策略

### 沿用 v2 策略 A — 全面整合至既有 SPA
- `public/index.html` 仍是主檔，加新 view（`v-auth`、`v-participant`、`v-admin-tools`、`v-system`）。
- 後端僅**新增** callable，不改動既有 callable 簽章，零破壞。
- `system-settings.html` 拆出去後新增 `account.html`（覆蓋 system.html 全部 5 頁的子路由）以避免 `index.html` 再無限膨脹。

### 檔案規劃

```
public/
├── shared.css                ← Phase 0 落地
├── css/legacy-shim.css       ← Phase 0 變數映射
├── js/                       ← Phase 0 抽出純 helper
│   ├── auth.js               ← Phase 4 抽出 OTP/login 邏輯
│   ├── participant.js        ← Phase 3 抽出 lookup/my-regs
│   ├── certs.js              ← Phase 7 名牌/證書 client
│   └── qr-scanner.js         ← Phase 7 jsQR wrapper
├── index.html                ← 主 SPA：home, comp, form, success, admin-home, settings, dashboard, admin-tools
├── account.html              ← 個人帳戶 SPA：profile, security, notif, api-keys, billing, audit-log, feedback
│                                （取代並擴充 system-settings.html）
├── system-settings.html      ← Phase 6 沿用，只套樣式
├── EULA.html / Manual.html / payuni-return.html / favicon.png（不動）
```

---

## 4. 實作分期（共 12 個 Phase，估 30 工作天）

### Phase 0 — 設計 tokens 落地（0.5 天）
- [ ] `screens/shared.css` 複製成 `public/shared.css`，**base font-size 改回 19px**，等比放大 spacing 與其他字級（× 19/14 ≈ 1.357）。
- [ ] 建 `public/css/legacy-shim.css`：舊變數（`--surface2`、`--txt2`、`--border` …）映射新 tokens。
- [ ] `<head>` 加 link，先於既有 `<style>`。
- [ ] 新增 RWD 三 breakpoint：≤1024 / ≤768 / ≤480。
- [ ] **不動任何 markup**，視覺差異最小化。
- 驗收：emulator 開啟首頁，整體外觀幾乎不變、字級與配色微調。
- Commit：`phase 0: design tokens + legacy shim`

---

### Phase 1 — 公開首頁 / 活動詳情（v-home + v-comp）（1 天）
- [ ] `.topbar` → `.app-top`，logo 區塊用 `<img src="favicon.png">`（**不採設計稿的 R mark**）。
- [ ] hero-bar 套設計稿漸層 + radial highlight。
- [ ] `.comp-card` 換 `.card / .card-hd / .card-body` + chip。
- [ ] 篩選器換 `.in / .btn-ghost`。
- [ ] i18n：補 `data-i` 屬性與 `I18N` 中英 key。
- 驗收：首頁顯示 3+ 活動、篩選 OK、點卡進入 v-comp 仍正常。
- Commit：`phase 1: redesign hub & competition page`

---

### Phase 2 — 報名 wizard（v-form）（2 天）
- [ ] hero header 從 `CFG` 動態填入：競賽名稱 / 日期 / 地點 / 截止。
- [ ] step bar：**保留 5 步邏輯**，視覺改用 `.step / .step-num / .step-line` 並橫向 scroll on mobile。
- [ ] step 1 隊伍 → group-pills + sess-grid。
- [ ] step 2-3 學員 / 指導老師 → `.mgroup / .mgroup-hd / .mgroup-bd` 取代現行 `.section h3`。
- [ ] step 4 自訂問題 → `.chk-grid + .chk-item.on`。
- [ ] step 5 確認 → `.review-section / review-row`。
- [ ] 浮動 / 底部費用試算 `.fee` 元件（依組別 + 學員人數即時試算）。
- [ ] file upload 換 `.file-up / .file-up.has-file`。
- [ ] **保留** `buildWizard / submitForm / validateField / validateTWID` 完整邏輯。
- 驗收：完整跑一次報名（含檔案上傳）成功送出。
- Commit：`phase 2: redesign registration wizard`

---

### Phase 3 — 報名者體驗（Participant area）（3 天）

#### 3a 成功頁 + Next Steps（0.5 天）
- [ ] `.success-card / .success-banner`（含勾勾動畫）。
- [ ] `.success-summary` 3 格資訊（活動 / 隊伍 / 金額）。
- [ ] `.next-steps` 引導：付款 / 加行事曆 / 查詢登入連結 / 分享。
- [ ] 沿用 `submitForm` 成功 callback。

#### 3b 我的所有報名（後端 + UI）（1.5 天）
- [ ] **新後端**：
  - `sendParticipantOtp(email)` → 寄送 6 碼 OTP（5 分鐘有效期）；用 Firestore `participantOtps` collection。
  - `listRegistrationsByEmail(email, otpCode)` → 驗證 OTP 後，跨 collections 查詢 `teams.where('contactEmail', '==', email)`，回傳所有報名摘要。
- [ ] 新 view `v-my-regs`：`participant.html p2`（query login，OTP 驗證）+ `p3`（reg-list）。
- [ ] `_argMap` 新增兩個 callable 對應。

#### 3c 報名詳情頁 + QR 票券（1 天）
- [ ] 新 view `v-reg-detail`：`participant.html p4`：左欄 detail-tabs（票券資訊 / 學員資料 / 指導老師 / 付款 / 時程）+ 右欄 sticky `.tk-card` QR 票券。
- [ ] 沿用 `getTeamDetail` callable。
- [ ] QR 用 `qrcode-generator`（已 vendor 在 index.html L12）。

#### 3d 付款結帳頁（已有後端，UI 整合）
- [ ] 把現行 `regPaySection / regPayPending / regPayDone` 換成 `participant.html p5` 的 `pay-main + pay-side` 雙欄。
- [ ] payment method picker `.pm.on`、credit card 雖然走 PayUni redirect 不收卡，但 UI 仍按設計稿排。
- [ ] 沿用 `createRegistrationPayment / getRegPaymentStatus / startRegPayPoll`。

- Commit：`phase 3: participant area (success, my regs, detail, payment)`

---

### Phase 4 — Auth 流程（v-auth）（2 天）

#### 4a Login / Signup / OTP / Forgot / Reset（1.5 天）
- [ ] 把 5 個 modal（mLogin / mSignup / mVerify / mForgotPwd / 新增重設密碼步驟）改寫成 5 個 `auth-card` panel，可切換顯示。
- [ ] OTP 輸入用 6 個 `.otp-cell`，autofocus 跨欄推進。
- [ ] 密碼強度條 `.pw-strength`（4 段，依長度 + 含字母 + 含數字 + 含符號）。
- [ ] **後端不需新增**：登入 / 註冊 / 驗證 / 重設密碼 callable 都已存在。
- [ ] 「使用 Google 帳號登入」按鈕：先做 UI 但**功能停用 / 隱藏**（後端要走 Firebase Auth Google provider，本次先不做）。

#### 4b 完整 EULA 多分頁（0.5 天）
- [ ] 用 `eula-page / eula-card / eula-tabs / eula-toc / eula-doc / eula-foot` 改寫 mEula。
- [ ] 4 個 tab：服務條款 / 隱私政策 / Cookie 政策 / 資料處理協議（內容沿用既有 EULA.html 並補齊缺項）。
- [ ] 「我已閱讀並理解」勾選後才能按「同意並繼續」。

- Commit：`phase 4: auth flow & EULA redesign`

---

### Phase 5 — 活動設定（v-admin → aEditComp）（3 天）
- [ ] 套設計稿 `.cfg-page` grid（240px sidebar + 1fr main + 320px right sidebar）。
- [ ] sidebar：**logo 區塊用 `<img src="favicon.png">`**，nav 6 個入口（儀表板 / 活動設定 / 報名名單 / 公告Email / 收款對帳 / AI 助理）。
- [ ] cfg-top：breadcrumb + auto-save 時間戳 + 預覽 + 儲存發布。
- [ ] cfg-tabs（6 個）：基本資料 / 組別場次 / 報名表單 / 金流費用 / 通知Email / 進階。
- [ ] `.sec / .sec-hd / .sec-bd` 取代現行 `.card`。
- [ ] groups 改 `.grp-list / .grp-item`（drag handle / inline edit / 名額 / 報名費 / 啟用 toggle / 刪除）。
- [ ] sessions 同上 + 單／複選下拉。
- [ ] field picker 改 `.field-grid + .fchip + .fchip.req + .fchip.on`。
- [ ] 自訂問題 改 `.cq-list / .cq-item / .cq-meta / .cq-opts`。
- [ ] fee 改 `.fee-tbl`（基本費 / 加購 / 折扣 chip）— **資料模型可能需擴充**（現行只有單一 `basicFee`，請確認 cfg.fees 新欄位）。
- [ ] 右 sidebar：狀態卡 + 即時預覽 tile + 分享連結 + 上線檢查清單 + AI 建議。
- [ ] **保留** `saveCompetitionConfig / _settingsDirty` 變更追蹤。
- [ ] RWD：≤1180 隱藏右 sidebar；≤768 cfg-tabs 改 horizontal-scroll；≤480 sidebar 改 hamburger drawer。
- Commit：`phase 5: redesign admin event settings`

---

### Phase 6 — Dashboard / 活動資訊（v-admin → aDash）（4 天）

#### 6a 既有資料 UI 換套（2 天）
- [ ] 套同 sidebar layout。
- [ ] hero `.ev-hero` + meta + 主要 action（複製連結 / 預覽 / 匯出 CSV）。
- [ ] ev-tabs：總覽 / 趨勢 / 報名管理（沿用 3 主 tab 邏輯）。
- [ ] 4 KPI（報名 / 正取 / 備取 / 待付款）含 delta + footnote → 沿用 `_dashStats`。
- [ ] 趨勢圖：保留 Chart.js，container 換成 `.chart-card`。
- [ ] 組別 bar 改純 CSS `.bar-list / .bar-row`。
- [ ] 報名管理 7 子 tab UI 換套，邏輯不動。

#### 6b 後端漏斗 / 熱點 / 排行（1 天）
- [ ] `getRegistrationFunnel(compId)` → 5 步漏斗（瀏覽 → 開始填 → 填完 step N → 送出 → 付款）。需擴充 `logVisit` 或新增 `logRegStep`。
- [ ] `getHourlyHeatmap(compId)` → 7×24 矩陣，從 `teams.createdAt` group。
- [ ] `getSchoolRanking(compId)` → 各校 top 10。
- [ ] `_argMap` 新增三筆。

#### 6c 新元件 UI（1 天）
- [ ] `.funnel / .funnel-row` 渲染漏斗。
- [ ] `.hm` 熱點圖 grid。
- [ ] 學校排行表（用 `.tbl + .av-team` 風格）。
- [ ] 全部加 i18n key。

- Commit：`phase 6a/6b/6c: dashboard redesign + new analytics`

---

### Phase 7 — Admin Tools（4 天）

#### 7a 建立活動 Wizard（template-based, 1 天）
- [ ] **新後端**：
  - `getCompetitionTemplates()` → 9 個預設模板（競賽 / 研討會 / 運動 / 課程 / 社交 / 招募 / 售票 / 夏令營 / 空白）；硬編碼於 functions/index.js。
  - `createCompetitionFromTemplate({templateId, customName, ...})` → 取代現行 createCompetition 的薄殼，內部仍 call 原 logic。
- [ ] 改寫 mNewComp modal 為全螢幕 5-step wizard：選模板 → 基本資訊 → 報名表單 → 收費名額 → 確認上線。
- [ ] `.tpl-grid / .tpl.on` 模板 picker。

#### 7b 成績登錄專用介面（1 天）
- [ ] 新 view `v-scoring`：左 `.score-side`（隊伍清單，含「待評 / 評中 / 已評」狀態）+ 右 `.score-main`（評分表單）。
- [ ] 鍵盤快速鍵：方向鍵切隊伍、Enter 儲存、Esc 取消。
- [ ] 沿用 `saveScore / getScores / getAllTeams`。

#### 7c QR 報到掃描台（1 天）
- [ ] 新 view `v-checkin`：`admin-tools p3`：左 `.ci-scanner`（攝影機畫面）+ 右 `.ci-feed`（即時記錄）。
- [ ] **新增 vendor**：`jsQR.min.js`（單檔 ~50KB，BSD 授權）。
- [ ] 用 `getUserMedia({video})` 取得攝影機，每秒 sample → jsQR 解析。
- [ ] 解析到 teamId 後 `checkInTeam(teamId, user)`，feed 加一行。
- [ ] 重複掃描 → 顯示 `.ci-row.dup`。
- [ ] 失敗 → `.ci-row.err`。
- [ ] 手動輸入 fallback（`.ci-controls`）。

#### 7d 名牌 / 證書產生器（1.5 天，最重）
- [ ] **新後端**：
  - Firestore `certTemplates` collection per-user：`{id, ownerUsername, name, type, paperSize, color, content, variables, logoUrl}`。
  - `getCertTemplates(username)`、`saveCertTemplate(template)`、`deleteCertTemplate(id)`。
  - `generateCerts({compId, teamIds, templateId})` → 用 `puppeteer-core` + Cloud Run 的 chromium 渲染 HTML → PDF；回傳 Storage URL。**估 30-60s for 100 份**，需用 background job (`onCall` timeout 540s 應足夠)。
  - **替代方案**：用 `pdfkit`（純 Node）做簡單版本，犧牲視覺保真度但快很多 → 建議**先做 pdfkit 版**，puppeteer 留 v2。
- [ ] 新 view `v-certs`：左模板類型 picker + 中央 canvas-frame + 右側變數面板。
- [ ] 內建 5 個證件類型 + 4 種樣式預設。

- Commit：`phase 7a/7b/7c/7d: admin tools (wizard + scoring + checkin + certs)`

---

### Phase 8 — System & Account 帳戶設定頁（4 天）

> 拆獨立檔 `public/account.html`，避免 `index.html` 繼續肥大。

#### 8a 訂閱方案 + 次數型授權（1 天）
- [ ] **新後端**：
  - Firestore `subscriptions` collection：`{username, planId, status, startedAt, renewsAt, paymentMethod}`。
  - `getSubscription(username)`、`subscribeToPlan({planId})`、`cancelSubscription()`。
  - 4 個 plan：free / starter / pro / team（team 暫顯示 coming soon）。
- [ ] UI 套 `.pricing-shell / .plan-grid / .plan.featured`。
- [ ] 「目前用量」`.usage-box`：呼叫 `listCompetitions` + `getDashboardStats` 加總。
- [ ] 次數型授權沿用 `openPurchaseFlow / createPayuniOrder`，但 UI 改用 `.qty-grid`。

#### 8b 授權使用歷史（0.5 天）
- [ ] **新後端** `getLicenseUsageStats(username)` → 餘額 / 累計購買 / 已使用 / 本月用量 4 KPI（從 `licenses` + `licenseUsage` collections 計算）。
- [ ] 取代現行 mMyLicHistory modal，套 `.lh-shell / .lh-stats / .lh-toolbar / .lh-list`。
- [ ] 沿用 `getLicenseStatus` 提供細項。

#### 8c 操作日誌（0.5 天）
- [ ] **新後端** `getAuditLogsAdvanced({actorFilter, actionFilter, targetFilter, dateRange, search, limit})` 取代基礎 `getAuditLogs`。
- [ ] **新增 diff 格式**：在所有 `compAuthCallable` 修改 callable 內，記錄 `{old, new}` patch 進 audit log（系統範圍的全域影響需審核）。**建議只在 saveCompetitionConfig / setCapacityLimit / deleteTeam 三個高敏 callable 加，避免 audit 表炸開**。
- [ ] UI 套 `.al-shell / .al-side / .al-main / .diff-block`。

#### 8d 帳戶設定主頁（2 天）
- [ ] 個人資料 `.profile-row` + 基本資料 form：沿用 `accounts` collection + `changePassword`。
- [ ] 雙重驗證 (TOTP)：
  - **新後端**：`setupTotp` → 產 secret + QR；`verifyTotp(code)` 開啟；`disableTotp(code)` 關閉。用 `speakeasy` npm package。
  - 8 個備用恢復碼（hash 後存）。
- [ ] 通知偏好 `.set-row + .tg`：
  - **新後端** `getNotificationPrefs` / `saveNotificationPrefs` → `notifPrefs` collection。
- [ ] LINE 整合：
  - **新後端** `linkLineAccount(lineToken)` / `unlinkLineAccount` / `sendLineMessage`（內部用）。
  - 需註冊 LINE Notify token 或 LINE Messaging API；本次先做 **LINE Notify**（簡單，user-bound token）。
- [ ] API 金鑰：
  - **新後端** `generateApiKey()` 回傳 `{keyId, secret}`（secret 只顯示一次）；`listApiKeys()` 列出 keyId + last4 + createdAt；`revokeApiKey(keyId)`。
  - 用 `apiKeys` collection，secret 用 SHA-256 雜湊。
  - **本次只做 CRUD，不做 API 認證 middleware**（API 端點開放屬於 v2 範疇）。
- [ ] 危險區域「永久刪除帳戶」：
  - **新後端** `requestAccountDeletion()` → 標記 `accounts.{username}.pendingDeletion = serverTimestamp + 7 days`；7 日後 cron 真刪。
  - 新增 `processPendingDeletions` cron（複用 `checkDeadlines` 模式）。

- Commit：`phase 8a/8b/8c/8d: subscription, license history, audit, account settings`

---

### Phase 9 — Feedback dedicated page（0.5 天）
- [ ] 把 `mFeedback` modal 改成 `account.html` 內的 `v-feedback` view（路徑 `/account#feedback`）。
- [ ] UI 套 `.fb-shell` 雙欄（form 主 + 既有 ticket list 副）。
- [ ] 沿用 `submitFeedback / listFeedback / updateFeedbackStatus / getFeedbackFile`。
- Commit：`phase 9: feedback dedicated page`

---

### Phase 10 — Collaborator 邀請 + 品牌客製化（1.5 天）

#### 10a 協作管理員（1 天）
- [ ] **新後端**：
  - Firestore `collaborators` collection：`{compId, username, role, invitedBy, status, invitedAt}`。
  - `inviteCollaborator({compId, email, role})` → 寄邀請信（內含 token 連結）。
  - `acceptCollaboration(token)` → 帳戶 join 該 comp。
  - `listCollaborators(compId)` / `removeCollaborator({compId, username})`。
  - 修改 `compAuthCallable` middleware：除 `creator` 外，`collaborators[role=editor/viewer]` 也允許讀寫（依 role）。
- [ ] UI 在活動設定頁的「進階」tab 加「協作者」section。

#### 10b 品牌客製化（0.5 天）
- [ ] **新後端** `getOrgBranding(username)` / `saveOrgBranding(username, {logo, primaryColor, customDomain})`。
- [ ] account.html 內加 `v-branding` view。
- [ ] custom domain 只做 UI（CNAME 指向需 v2 / Pro 方案）。

- Commit：`phase 10: collaborator invitations + org branding`

---

### Phase 11 — system-settings.html 套樣 + i18n 完整稽核（1.5 天）

#### 11a system-settings.html（0.5 天）
- [ ] 引入 `shared.css` + `legacy-shim.css`。
- [ ] 套 sidebar layout（與 admin event-settings 同架構）。
- [ ] 全面換 button / input / card / chip class。

#### 11b i18n full audit（1 天）
- [ ] grep `>[一-鿿]+<` 找寫死中文，全部移到 `I18N` + `data-i`。
- [ ] 補齊每個 key 的 `en` 版本。
- [ ] JS 動態字串改 `LANG === 'en' ? ... : ...` 或 `L('key')`。
- [ ] **驗收標準**：`?lang=en` 開站，跑完一次端到端，**不應出現任何中文 UI 字串**（使用者輸入除外）。

- Commit：`phase 11: system-settings styling + i18n full audit`

---

### Phase 12 — RWD / 端到端 smoke（2 天）

#### RWD 三尺寸調整（1.5 天）
- [ ] **480 px iPhone 直式**：所有 sidebar 收 hamburger drawer；ev-tabs / cfg-tabs horizontal-scroll；KPI 4→1 欄；mgroup 全 1 欄；step-num 縮小；reg-list grid 改 1 欄；payment 改單欄。
- [ ] **768 px iPad 直式**：sidebar 收起；KPI 4→2 欄；雙欄 main+side → 純單欄。
- [ ] **1024 px iPad 橫式**：右 sidebar 改成主內容上方 collapsible accordion（status / preview / checklist / AI 建議）。
- [ ] 圖表 / 攝影機畫面 / cert canvas 在小螢幕的 fallback。

#### 端到端 smoke（0.5 天）
- [ ] 中文跑：建活動 → 報名 → 付款 → 確認 → 發信 → 報到掃描 → 評分 → 證書產生 → 匯出。
- [ ] 英文跑同樣流程，確認所有 UI 都能切換。
- [ ] 三尺寸（480 / 768 / 1024+）各跑一次。
- [ ] Lighthouse / 效能跑分（目標 PWA-like：FCP < 2s, LCP < 3s）。

- Commit：`phase 12: RWD three breakpoints + e2e smoke`

---

## 5. 工時與里程碑

| Phase | 主要產出 | 估時 |
| --- | --- | --- |
| 0 | tokens + shim | 0.5 |
| 1 | 公開首頁 / 詳情 | 1 |
| 2 | 報名 wizard | 2 |
| 3 | Participant area（成功 / 我的 / 詳情 / 付款）| 3 |
| 4 | Auth + EULA | 2 |
| 5 | 活動設定 | 3 |
| 6 | Dashboard + funnel/heatmap/ranking | 4 |
| 7 | Admin tools（wizard / 評分 / 報到 / 證書）| 4 |
| 8 | 帳戶設定（subscription / TOTP / API key / 通知 / 刪除）| 4 |
| 9 | Feedback dedicated | 0.5 |
| 10 | 協作者 + 品牌 | 1.5 |
| 11 | system-settings + i18n | 1.5 |
| 12 | RWD + smoke | 2 |
| **合計** | | **29 工作天** |

> 約 6 週（每週 5 天）。可分批 PR，每 Phase 一個 commit + 自我端到端驗證 + 您驗收後才進入下一個。

---

## 6. 風險與待確認

### 6.1 後端負擔
- Phase 7d 證書 PDF 渲染：puppeteer + Chromium 在 Cloud Functions 冷啟動慢、體積大；建議**先 pdfkit 版**（純 Node，1-2 秒生 100 份）。
- Phase 8d TOTP 用 `speakeasy`，~50KB 純 Node，無外部依賴。
- Phase 8d LINE 整合：用 LINE Notify（簡單）vs LINE Messaging API（功能多但需 Bot account）；建議**只做 LINE Notify**。
- Phase 6b funnel：需要前端在每一 wizard step 呼叫 `logRegStep(compId, step)`，會增加 ~5 個 callable 觸發 / 報名；可以容忍。

### 6.2 資料模型擴充
- `cfg.fees`（費用 array：基本費 / 加購 / 折扣）— 設定頁 04 需要。
- `cfg.template`（記錄該活動是從哪個 template 建立）— 建立 wizard 需要。
- `accounts.{username}.subscription` / `.totpSecret` / `.notifPrefs` / `.lineToken`。
- 新 collections：`participantOtps`、`certTemplates`、`subscriptions`、`apiKeys`、`collaborators`、`notifPrefs`。

### 6.3 安全
- TOTP secret 必須 server-side 用 KMS 或環境變數加密；本次先 plaintext 存（standard practice for many apps），但加 TODO 註記。
- API key secret 只存 SHA-256 hash，產生時只回傳一次。
- Email OTP 走既有 `sendSystemEmail` 流程，rate-limit 每 IP 每分鐘 3 次。
- collaborator role：editor / viewer 兩種，editor 可改 cfg、viewer 只能讀 dashboard。

### 6.4 範圍邊界
- Google 登入（auth.html p1 social button）：本次只做 UI 占位，**不接 Firebase Auth provider**。
- LINE Messaging API（vs Notify）：本次走 Notify，bot 化留 v2。
- API 認證 middleware（讓第三方真的能用 API key 打）：本次只做金鑰 CRUD，呼叫端不開放。
- 自訂網域 (`*.regm.app`)：UI 占位，不做 CNAME 與 DNS 自動化。

---

## 7. 動工前 checklist

- [x] 6 大決策已拍板（第 0 節）
- [x] 還原點與備份已建立（第 9 節）
- [x] 缺漏 callable 清單已列（第 2.2 節）
- [ ] localhost emulator 第一次啟動成功
- [ ] 您下指令進入 Phase 0

---

## 8. 還原點與備份（已完成 ✅，2026-05-05）

### 8.1 資料夾快照
路徑：`_backup/2026-05-05_pre-redesign/`（4.0 MB）。任何時候要還原，把 `public/` 蓋回去即可。

### 8.2 Git baseline
```
36f8713 baseline: pre UI redesign snapshot   ← tag: v1-pre-redesign
a76f9ce plan: lock in 6 decisions
```

還原指令：
```bash
git reset --hard v1-pre-redesign     # 全部退回
git checkout v1-pre-redesign -- public/index.html   # 只退單檔
```

### 8.3 安全強化
`.gitignore` 已排除 `serviceAccountKey.json` / `firestore-debug.log` / `_backup/`。

---

## 9. localhost 工作流程

`firebase.json` 已設好 emulators：

| Service | Port |
| --- | --- |
| Hosting | http://localhost:5000 |
| Functions | 5001 |
| Firestore | 8085 |
| Auth | 9099 |
| Storage | 9199 |
| **Emulator UI** | http://localhost:4000 |

```bash
firebase emulators:start
```

每 Phase 收尾：
1. `git status` 看異動；
2. emulator 跑通該 Phase checklist；
3. **每個 Phase commit 前要中英文各跑一次**；
4. 通過後 `git add ... && git commit -m "phase X: ..."`。

deploy 由您手動：
```bash
firebase deploy --only hosting
firebase deploy --only functions   # 若有後端變動
```

---

## 10. 下一步

備份就緒、規劃確認後，可以下指令：

- **「開始 Phase 0」** — 落 design tokens，零風險，commit 後請您 emulator 驗收
- **「先看看 emulator」** — 您 `firebase emulators:start` 確認本機環境
- **「規劃書還要改 X」** — 提出後我先改規劃書，再進入 Phase 0
- **「跳過某 Phase」** — 例如「先不做 Phase 10 協作者」，會把該 Phase mark 為 deferred
