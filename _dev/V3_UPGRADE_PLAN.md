# RegMaster v3 全面升級計畫書

> 目標：將 `RegMaster (1).zip` 內 v3 設計系統（28 個獨立 HTML 頁面 + 共用 `styles.css`）完整套用到現有 Firebase 應用，**全部本機完成驗證後**才推上 production。
>
> 撰寫日期：2026-05-27
> 版本：v1（規劃中、尚未動工）
> 設計來源：`_dev/design_zip_extracted/v3/`
> 此計畫**取代**舊的 `UI_REDESIGN_PLAN.md`（該版本是針對 v1 三頁設計稿撰寫，已過時）。

---

## 0. TL;DR — 三句話總結

1. v3 比 v1 規模放大 **6 倍**（5 頁 → 28 頁），是一套**完整 SaaS 產品設計**，不只是「重新著色」而是把 RegMaster 升級成商務級 SaaS 平台（含 landing、pricing、AI 助理工作區、表單設計器、即時評分板、QR 報到 console、Super Admin 等全新模組）。
2. 現有後端（98+ 個 callable functions、Firestore schema）**大部分可以沿用**；但約 6–8 個新模組（form builder logic、scoring 多評審、announcements multi-channel、super admin、AI conversation history…）需要新增 callable 與 Firestore collection。
3. 建議走 **Strategy C：Hybrid 多頁 + Hosting rewrites**，分 **9 個 Phase**、約 **22–28 個工作天**完成；本機完全跑通 emulator suite + smoke test → 通過後才 deploy production。

---

## 1. 現況盤點

### 1.1 程式碼資產

| 路徑 | 規模 | 角色 |
| --- | --- | --- |
| `public/index.html` | **6 630 行** | 單檔 SPA，五個 view + 14 個 modal + 所有 JS 邏輯（~280 個 function） |
| `public/system-settings.html` | 1 142 行 | 系統管理員設定頁（Gemini key、license、coupon、feedback、orders） |
| `public/EULA.html` / `Manual.html` | — | 法律文件、操作手冊（modal iframe） |
| `public/payuni-return.html` | — | PayUni 付款 redirect 中繼頁 |
| `public/Emaillogo.png`、`favicon.png` | — | 品牌資產 |
| `functions/index.js` | **3 317 行 / 152 KB** | Cloud Functions，**98 個 callable** + 2 個 onRequest（payuni notify）+ scheduled tasks |
| `firestore.rules` | 8 行 | 拒絕一切前端直連，全經 callable |
| `firestore.indexes.json` | — | 既有索引 |
| `storage.rules` | — | Storage 規則 |
| `firebase.json` | 30 行 | Hosting `public/` + rewrite `**→/index.html` + emulator 設定齊全（auth 9099 / functions 5001 / firestore 8085 / hosting 5000 / storage 9199 / ui 4000） |

### 1.2 現有前端結構

- **SPA 五大 view**：`v-home`（公開首頁）/ `v-comp`（活動詳情）/ `v-form`（報名 wizard）/ `v-success`（報名成功）/ `v-admin`（管理後台）。
- **管理後台子畫面**：`renderAdminHome` → `aEditComp`（活動設定，長卷軸 + settings-nav）/ `aDash`（dashboard，3 主 tab × 7 子 tab）。
- **14 個 modal**：mLogin / mSignup / mVerify / mForgotPwd / mPwd / mDetail / mEmail / mTpl / mNewComp / mConfirm / mLicense / mEula / mManual / mFilePreview / mMyLicHistory / mFeedback。
- **業務邏輯**：所有狀態（ME、CFG、CUR、CQ_DATA、SCQ_DATA、TCQ_DATA…）都在 SPA 全域變數內。
- **i18n**：`I18N[LANG]`，zh/en 雙語。

### 1.3 現有 callable functions 全表（98 個）

按業務域分類：

| 域 | 數量 | 代表 callable |
| --- | --- | --- |
| 帳號 / 認證 | 11 | loginAccount, createAccount, deleteAccount, changePassword, listAccounts, requestAccount, verifyAccount, resetAdminPassword, sendSystemEmail, logClientError, addNotification |
| 通知 | 4 | getNotifications, markNotificationRead, markAllNotificationsRead, addNotification |
| 稽核 | 2 | getAuditLogs, clearAuditLogs |
| 活動 CRUD | 11 | listCompetitions, listCompetitionsPublic, createCompetition, getCompetitionConfig, saveCompetitionConfig, setRegistrationOpen, setCapacityLimit, deleteCompetition, getRegistrationBundle, getShareLink, duplicateCompetition |
| 公告 | 3 | addAnnouncement, getAnnouncements, deleteAnnouncement |
| 報名 | 7 | submitRegistration, loginTeam, updateRegistration, lookupRegistration, checkDuplicates, batchImportTeams, checkInTeam |
| Dashboard / 隊伍 | 8 | getDashboardStats, getAllTeams, getTeamDetail, confirmPayment, updateTeamStatus, deleteTeam, exportTeamsCSV, reconcilePayments |
| Email / Template | 5 | saveEmailTemplate, getEmailTemplates, deleteEmailTemplate, sendNotificationToTeam, sendNotificationToAll |
| 評分 | 2 | saveScore, getScores |
| License | 7 | createLicense, listLicenses, clearExpiredLicenses, deleteLicense, getLicenseStatus, activateLicense, consumeLicense |
| AI | 4 | askCompetitionAI, askAdminAI, analyzeRulesWithAI, analyzePosterColors |
| 檔案 / 海報 / PDF | 6 | uploadRulesPdf, getPdfData, uploadTeamFile, getTeamFileData, uploadPosterImage, getPosterData, deletePosterImage, deleteRulesPdf |
| 銷售 / 金流 | 12 | getSalesConfig, saveSalesConfig, createCoupon, listCoupons, deleteCoupon, validateCoupon, createPayuniOrder, payuniNotify, getOrderStatus, createRegistrationPayment, payuniRegNotify, getRegPaymentStatus |
| 系統 / 維護 | 6 | productionReset, migrateTeamCounts, migrateViewCounts, checkDeadlines, checkLicenseExpirations, listOrders, getVisitorStats |
| Feedback | 4 | submitFeedback, listFeedback, getFeedbackFile, updateFeedbackStatus |
| Visit log | 1 | logVisit |

### 1.4 目前問題點（v1 plan 已列、仍有效）

1. 視覺風格雜湊：早期紫 `#4F46E5` 與後期海軍藍 `#0A437A` 混雜。
2. body 19px 過大、密度低、scan 困難。
3. admin 後台是**單欄長卷軸**，無 sidebar / breadcrumb / 自動儲存提示。
4. 報名 wizard 缺即時費用試算面板、step bar 陽春。
5. dashboard 缺 KPI delta、AI insights、todo、漏斗、24h 熱點等商務級組件。
6. 沒有 marketing / pricing 頁，無法對外行銷。
7. 沒有 multi-org / super admin 概念。

---

## 2. v3 設計稿盤點

### 2.1 28 個頁面（共用 `styles.css`）

| Phase | 頁面 | 對應現有功能 | 狀態 |
| --- | --- | --- | --- |
| **1 公開行銷** | 01-landing.html | 無（現有直接 v-home） | 🆕 全新 |
| | 02-pricing.html | 部分（mLicense 內購買流程） | 🆕 全新 |
| | 03-features.html | 無 | 🆕 全新 |
| | 04-about.html | 無 | 🆕 全新 |
| | 05-contact.html | 無（只有 mFeedback） | 🆕 全新 |
| **2 認證** | 11-login.html | mLogin modal | 🔄 modal→page |
| | 12-signup.html | mSignup modal | 🔄 modal→page |
| | 13-forgot.html | mForgotPwd modal | 🔄 modal→page |
| | 14-onboarding.html | 無 | 🆕 全新 |
| **3 報名者** | 21-browse.html | v-home | ♻️ 重設計 |
| | 22-event-detail.html | v-comp | ♻️ 重設計 |
| | 23-register.html | v-form（5-step wizard） | ♻️ 重設計 + 加入右側 sticky 訂單摘要 |
| | 24-my-registrations.html | 部分（doLookup） | 🆕 升級：跨活動歷史 + QR 票券 |
| | 25-payment.html | v-success + payuni-return | ♻️ 重設計成獨立結帳頁 |
| **4 主辦核心** | 31-admin-dashboard.html | v-admin → aDash | ♻️ 大改 + AI insights / todo / funnel 卡片 |
| | 32-admin-events.html | v-admin → renderAdminHome | ♻️ 重設計成卡片網格 |
| | 33-event-detail-admin.html | v-admin → aEditComp + aDash 整合入口 | ♻️ 加入 hero + tabs 高層導覽 |
| | 34-create-event.html | mNewComp modal + 表單 | 🆕 升級：5-step wizard + 模板選擇 + AI 智慧建立 |
| | 35-form-builder.html | aEditComp 中（CQ/SCQ/TCQ） | 🆕 大幅升級：drag-drop palette + inspector + logic builder + live preview |
| **5 進階工具** | 41-announcements.html | mEmail / mTpl + aLoadA | 🆕 升級成 multi-channel campaigns（Email/SMS/LINE）+ Email canvas |
| | 42-payments.html | reconcilePayments + 表格 | ♻️ 視覺強化（summary cards + 對帳工具列） |
| | 43-ai-assistant.html | chat-fab + askCompetitionAI/askAdminAI | 🆕 大幅升級：獨立工作區、對話歷史、知識庫、suggested replies |
| | 44-scoring.html | saveScore + dLoadScores | 🆕 大幅升級：live leaderboard + 多評審 + ACM 風格 + slider |
| | 45-checkin.html | doCheckIn + checkinStats | 🆕 大幅升級：全螢幕掃描器 + 物資配發 + 即時 KPI |
| **6 系統** | 51-settings.html | system-settings.html 部分 | ♻️ 重設計：個人 + 通知 + 安全 + sessions |
| | 52-license.html | mLicense + showPurchaseModal | ♻️ 升級成 cur-plan card + plans grid + 授權碼 + 發票歷史 |
| | 53-audit-log.html | getAuditLogs 列表 | ♻️ 視覺升級成 timeline + filters + diff view |
| | 54-super-admin.html | 散在 system-settings | 🆕 全新：所有組織 / 平台健康 / 警示 |

合計：**🆕 全新 = 13 頁、♻️ 重設計 = 11 頁、🔄 modal→page = 3 頁、部分有對應 = 1 頁**

### 2.2 Design tokens（`styles.css` 671 行）

```
品牌色：
  navy-900 #060B1C → navy-50 #EBEFF7    (10 階)
  blue-600 #2952E3 → blue-50  #F1F5FF   (6 階)
  amber-600 #C2410C → amber-100 #FED7AA (5 階)
  cream / cream-2                       (warm accent)

語意色：ok / warn / err / info / acc + 三階深淺
表面：bg / surface / surface-2 / surface-3 / line / hairline
墨色：ink / ink-2 / ink-3 / muted / muted-2

字體：
  Inter Tight  (display，標題)
  IBM Plex Sans + Noto Sans TC  (body)
  IBM Plex Mono + JetBrains Mono (mono / 數字)
  base 16px、line-height 1.5、tabular-nums
  letter-spacing -.028em ~ -.006em（標題收緊）

圓角：4 / 6 / 10 / 14 / 20 / 28
陰影：6 階（sh-xs ~ sh-xl）
動畫 easing：cubic-bezier(.2,.8,.2,1)

模式：[data-theme="light"] / [data-theme="dark"] 完整對應
```

### 2.3 共用 layout patterns

設計稿 28 頁可歸納成 **6 種 layout shell**：

| Shell | grid-template-columns | 用於 |
| --- | --- | --- |
| **Marketing nav + body** | 1fr | 01-05, 11-13 |
| **60px mini-sidebar + main** | 60px 1fr | 32, 34, 35, 41, 42, 43, 44, 45, 52, 53, 54 |
| **240px full-sidebar + main** | 240px 1fr | 31, 51 |
| **240px sidebar + main + 320px aux** | 240px 1fr 320px | 54 |
| **mini-sidebar + 3 column workspace** | 60px 1fr 360px(L) 1fr 360px(R) | 41, 43, 44, 45 (3-pane) |
| **24-page top breadcrumb + step bar** | 1fr（內含 step bar） | 14, 34, 35（wizard 流程） |

### 2.4 共用元件清單

`styles.css` 已內建：
- **按鈕**：`.btn-primary` / `.btn-accent` / `.btn-ghost` / `.btn-quiet` × `-sm/-md/-lg/-xl` × `-block`
- **輸入**：`.input` / `.select` / `.textarea` / `.label` / `.help`
- **卡片**：`.card` / `.card-pad` / `.card-hover` / `.divider`
- **標籤**：`.chip` / `.chip-ok/warn/err/acc/amber` / `.chip-dot`
- **Shell**：`.app-shell` / `.sidebar` / `.main` / `.topbar` / `.crumb` / `.content`
- **KPI**：`.kpi` / `.kpi .label / .value / .delta`
- **表格**：`.tbl` / `.tbl thead` / `.tbl tbody`
- **搜尋**：`.cmd` / `.cmd kbd`
- **頭像**：`.av` / `.av-sm/-lg/-xl` / `.av-grad-1~5`
- **Toggle / Skeleton / Progress bar / Tabs / Segmented / Alert**
- **Utility classes**：flex / grid / gap / mb / mt / mute / mono / w-full / rad / bdr…

各 page 內 `<style>` 補強當頁專屬樣式（hero、step bar、scanner-frame、leaderboard…）。

---

## 3. 升級策略選擇

### 3.1 三個選項

| 策略 | 描述 | 適用情境 | 評估 |
| --- | --- | --- | --- |
| **A：純美術替換**（最小改動） | 只在 SPA 內換色票/字體，markup 不動 | 時間極短 | ❌ 拿不到 v3 設計 80% 的價值（sidebar、KPI、AI 工作區、form builder…全做不出來） |
| **B：把 v3 28 頁全部塞進 SPA** | 在 `public/index.html` 內新增 28 個 `<div class="view">`，全部路由用 `showV()` 切換 | 維持單檔架構 | ⚠️ 結果會是 **15 000+ 行 HTML**，無法維護；JS 全域變數衝突風險高；首屏載入慢 |
| **C：Hybrid 多頁 + Hosting rewrites**（**推薦** ✅） | 把 28 頁拆成 28 個 HTML（或合併成 ~12 個），用 Firebase Hosting rewrites 路由；共用 `public/shared/` 內的 `styles.css`、`firebase-bridge.js`、`i18n.js`、`app-state.js` | 最貼近 v3 設計、可獨立 cache、SEO 好、code split 自然發生 | ✅ 工程量大但結構乾淨；現有 callable 99% 可沿用 |

### 3.2 推薦 Strategy C 的理由

1. **v3 設計本身就是 multi-page 假設**：每頁有自己的 layout（marketing nav vs admin sidebar 完全不同），硬塞進單檔會產生大量 CSS 衝突。
2. **業務邏輯解耦**：報名者流程（11–25）與管理後台（31–54）幾乎沒有共用 JS 邏輯，分開反而清晰。
3. **Firebase Hosting 友善**：`firebase.json` 一行 rewrite 即可指定。
4. **既有 Cloud Functions 不動**：所有 callable API 與 Firestore schema 保留，前端只是換殼。
5. **可漸進切換**：把舊 `index.html` 暫保留為 `index-legacy.html`、新版本上 `index.html`，出問題隨時切回。

### 3.3 多頁拆檔的具體規劃

考慮到「過度拆分會增加維護成本」，**將 28 個設計頁合併成 ~14 個實際路由**：

| URL 路由 | 設計來源 | 對應現有功能 |
| --- | --- | --- |
| `/` | 01-landing.html | （現 v-home 移到 `/events`） |
| `/pricing` | 02-pricing.html | 全新 |
| `/features` | 03-features.html | 全新 |
| `/about` | 04-about.html | 全新 |
| `/contact` | 05-contact.html | 全新 |
| `/login`, `/signup`, `/forgot` | 11/12/13 | 取代 mLogin/mSignup/mForgotPwd |
| `/onboarding` | 14-onboarding.html | 全新（新帳號首次登入） |
| `/events` | 21-browse.html | 取代 v-home 活動列表 |
| `/events/:id` | 22-event-detail.html | 取代 v-comp |
| `/events/:id/register` | 23-register.html | 取代 v-form |
| `/events/:id/payment` | 25-payment.html | 取代 v-success 付款區 + payuni-return |
| `/my` | 24-my-registrations.html | 部分取代 doLookup |
| `/admin` | 31-admin-dashboard.html | 取代 v-admin 首頁 |
| `/admin/events` | 32-admin-events.html | 取代 renderAdminHome |
| `/admin/events/:id` | 33-event-detail-admin.html | 入口頁，內含 5 個 sub-tab |
| `/admin/events/:id/edit` | 34-create-event.html + 設定 sub-tabs | 取代 aEditComp |
| `/admin/events/:id/form-builder` | 35-form-builder.html | 升級 CQ/SCQ/TCQ |
| `/admin/events/:id/announcements` | 41-announcements.html | 取代 mEmail/mTpl/aLoadA |
| `/admin/events/:id/payments` | 42-payments.html | 升級 reconcile UI |
| `/admin/events/:id/scoring` | 44-scoring.html | 升級評分介面 |
| `/admin/events/:id/checkin` | 45-checkin.html | 升級報到介面 |
| `/admin/ai` | 43-ai-assistant.html | 取代 chat-fab |
| `/admin/settings` | 51-settings.html | 取代 system-settings 部分 |
| `/admin/license` | 52-license.html | 取代 mLicense |
| `/admin/audit` | 53-audit-log.html | 升級 audit UI |
| `/admin/super` | 54-super-admin.html | 全新 |

`firebase.json` rewrite 改成：
```jsonc
"rewrites": [
  { "source": "/events/*/register", "destination": "/events/register.html" },
  { "source": "/events/*/payment",  "destination": "/events/payment.html" },
  { "source": "/events/*",          "destination": "/events/detail.html" },
  { "source": "/admin/events/*/**", "destination": "/admin/events/[id].html" },
  { "source": "/admin/events/*",    "destination": "/admin/events/[id].html" },
  { "source": "/admin/**",          "destination": "/admin/index.html" },
  { "source": "**",                 "destination": "/index.html" }
]
```

> 註：Firebase Hosting rewrite 不支援真正的動態 segment，需要靠前端 JS 讀 `location.pathname` 去 parse `:id`。設計稿其實已預期這件事（每頁都假設自己會從 URL 取 eventId）。

### 3.4 預期目錄結構（升級後）

```
public/
├── index.html                ← 01-landing 套版
├── pricing.html              ← 02
├── features.html             ← 03
├── about.html                ← 04
├── contact.html              ← 05
├── login.html                ← 11
├── signup.html               ← 12
├── forgot.html               ← 13
├── onboarding.html           ← 14
├── events/
│   ├── index.html            ← 21-browse
│   ├── detail.html           ← 22-event-detail（從 URL 取 :id）
│   ├── register.html         ← 23-register
│   └── payment.html          ← 25-payment + payuni-return 合併
├── my.html                   ← 24-my-registrations
├── admin/
│   ├── index.html            ← 31-admin-dashboard
│   ├── events/
│   │   ├── index.html        ← 32-admin-events
│   │   └── [id].html         ← 33-event-detail-admin（hub，內含 sub-route）
│   ├── ai.html               ← 43-ai-assistant
│   ├── settings.html         ← 51
│   ├── license.html          ← 52
│   ├── audit.html            ← 53
│   └── super.html            ← 54
├── shared/
│   ├── styles.css            ← v3 設計 tokens（從 zip 複製）
│   ├── styles-extra.css      ← 各 page 共用補強
│   ├── firebase-bridge.js    ← 抽出 _argMap + _callFn + google.script.run shim
│   ├── app-state.js          ← ME / CFG / I18N / theme / lang 全域狀態
│   ├── i18n.js               ← zh / en 字典
│   ├── auth.js               ← 共用登入檢查 + redirect
│   ├── components.js         ← topbar / sidebar / toast / modal 共用 widget
│   └── icons.svg             ← sprite（heroicons-style）
├── legacy/
│   └── index.html            ← 舊 SPA 備份（保留 1 個月後刪）
├── EULA.html / Manual.html   ← 不動
├── Emaillogo.png / favicon.png
└── （payuni-return.html 改寫進 events/payment.html）

functions/
├── index.js                  ← 現有 98 個 callable 保留 + 新增 ~12 個
└── ...

firebase.json                 ← rewrites 改寫
```

---

## 4. 功能差異與後端缺口分析

### 4.1 後端 callable 缺口（需新增）

| 模組 | 新需求 | 建議新 callable | 對應 Firestore collection |
| --- | --- | --- | --- |
| **Form Builder** | 拖放欄位、條件邏輯（if 答 A 則顯示 B）、live preview | `getFormSchema(compId)` / `saveFormSchema(compId, schema)` / `validateFormLogic(schema)` | 改寫 `comps/{id}.cfg.formSchema`（取代分散的 CQ/SCQ/TCQ） |
| **Announcements / EDM** | Multi-channel (Email/SMS/LINE)、Email canvas、排程發送、recipient picker（按條件篩） | `createCampaign(compId, payload)` / `updateCampaign(id)` / `sendCampaignNow(id)` / `scheduleCampaign(id, datetime)` / `listCampaigns(compId)` / `getCampaignAnalytics(id)` | 新增 `campaigns/{id}` |
| **AI Assistant** | 對話歷史、多 conversation 切換、訊息引用知識庫 | `createConversation(compId, title)` / `listConversations(compId)` / `getConversation(id)` / `appendMessage(convId, role, content)` / `deleteConversation(id)` | 新增 `aiConversations/{id}` + `aiMessages/{id}` |
| **Scoring** | 多評審、權重、子項目、ACM 風格 live leaderboard、AC/WA 記錄 | `createScoreSchema(compId, schema)` / `submitJudgeScore(teamId, judgeId, scores)` / `getLiveLeaderboard(compId)` / `lockScoring(compId)` | 改寫 `scores/{id}` schema + 新增 `judges/{id}` |
| **Check-in** | 物資配發（便當/T-shirt/紀念品 checkbox）、會場分區 | 既有 `checkInTeam` 加參數 `extras: {meal, shirt, gift}` + 新 `getCheckinStats(compId, by: 'venue'/'time')` | 改寫 `teams/{id}.checkin` |
| **Onboarding** | 新帳號 5-step 引導完成度 | `getOnboardingState(username)` / `saveOnboardingStep(username, step, data)` | 新增 `onboarding/{username}` |
| **Super Admin** | 跨組織 health、所有 orgs、平台警示 | `getPlatformHealth()` / `listAllOrgs()` / `getOrgUsage(orgId)` / `suspendOrg(orgId)` | 新增 `platform/health` + `orgs/{id}` |
| **My Registrations** | 跨活動歷史、QR 票券 | `listMyRegistrations(username/email/phone)` | 沿用 `teams` 但需要按 email/phone 索引 |
| **Pricing / Plans** | 方案 metadata、訂閱狀態、發票歷史 | `getCurrentPlan(username)` / `listInvoices(username)` / `previewPlanChange(planId)` / `changePlan(planId, cycle)` | 新增 `subscriptions/{username}` + `invoices/{id}` |
| **Settings** | sessions / devices 列表、第三方登入綁定、通知偏好 | `listSessions(username)` / `revokeSession(sessionId)` / `getNotifPrefs(username)` / `saveNotifPrefs(username, prefs)` | 既有 sessions 表 + 新增 `notifPrefs/{username}` |
| **Dashboard 新組件** | AI insights、todo 清單、漏斗、24h 熱點、學校排行 | `getAiInsights(compId)` / `getTodoList(compId)` / `getFunnelStats(compId)` / `getHourlyHeatmap(compId)` / `getSchoolRanking(compId)` | 多為 aggregation，可用 Firestore aggregation queries |
| **Form 自動儲存** | 設定頁右上 "已自動儲存 12 秒前" | `saveDraftConfig(compId, partialCfg)`（已有 saveCompetitionConfig，可加 `draft: true` 參數） | 沿用 |

合計：**約 30 個新 callable**，但**沒有任何既有 callable 需要破壞性修改**（兼容性最佳）。

### 4.2 既有 callable 可直接沿用（無需改）

✅ 認證類（loginAccount、createAccount、changePassword…）  
✅ 活動 CRUD（listCompetitions、createCompetition、saveCompetitionConfig…）  
✅ 報名類（submitRegistration、loginTeam、lookupRegistration…）  
✅ 金流類（createPayuniOrder、payuniNotify、createRegistrationPayment…）  
✅ License（createLicense、activateLicense、consumeLicense…）  
✅ Audit / Visit log

### 4.3 Firestore schema 影響面

**改寫**：
- `comps/{id}.cfg.formSchema`（取代 CQ_DATA / SCQ_DATA / TCQ_DATA 三個陣列），需要**寫一個 migration script** 把舊資料轉成新 schema。
- `teams/{id}.checkin`（從 boolean 升級成 object，含 extras）。
- `scores/{id}`（多評審後變成複合鍵 `compId_teamId_judgeId`）。

**新增**：
- `campaigns/{id}`、`aiConversations/{id}`、`aiMessages/{id}`、`judges/{id}`、`onboarding/{username}`、`subscriptions/{username}`、`invoices/{id}`、`platform/health`、`orgs/{id}`、`notifPrefs/{username}`。

**Migration**：寫 `functions/migrations/v3-upgrade.js`，提供 admin-only callable `migrateToV3()`，逐 collection 轉換。

### 4.4 styles / 字級降級的影響

| 項目 | v1（現行） | v3（新） | 影響 |
| --- | --- | --- | --- |
| body font-size | 19px | 16px (base) | **客戶端老師可能反應字太小**，建議 base 維持 16px、admin 區可降 14px |
| line-height | 1.75 | 1.5 ~ 1.6 | 較緊湊 |
| 字體家族 | Outfit + Noto Sans TC | Inter Tight + IBM Plex Sans + Noto Sans TC | 多了 mono（JetBrains→IBM Plex Mono）、display（Outfit→Inter Tight） |
| 主色 | `#0A437A`（navy） | `#060B1C`（更深 navy）+ `#3D6BFF`（acc blue） | 對比度增加，視覺更鋭利 |
| 暗模式 | 無 | 完整支援 | 新增 toggle 元件、需在 `app-state.js` 持久化偏好 |

---

## 5. 實作分期（9 個 Phase × 22–28 工作日）

> 原則：每 Phase 結束在本機 emulator 跑完 smoke test → commit → 進下一 Phase；中途**不 deploy production**。

### Phase 0 — 基礎建設（2 天）

- [ ] 在 `public/shared/` 建立 6 個共用檔（styles.css、firebase-bridge.js、app-state.js、i18n.js、auth.js、components.js）。
- [ ] 把 zip 內 `styles.css` 複製成 `public/shared/styles.css`，並補上 `--font-base: 16px`、`--font-admin: 14px` 變數。
- [ ] **重要**：抽出 SPA 內的 `_argMap` + `_callFn` + `google.script.run` shim 到 `firebase-bridge.js`（這段 100% 可重用，不要重寫）。
- [ ] 抽 `I18N` 字典到 `i18n.js`。
- [ ] 把舊 `public/index.html` 備份成 `public/legacy/index.html`、`firebase.json` rewrite 暫時改成 `**→/legacy/index.html`，保留可隨時切回。
- [ ] **本機驗證**：跑 `firebase emulators:start`，舊 SPA 還能 100% 正常運作。

### Phase 1 — Marketing / 公開頁（3 天）

落地頁面：`/` (01-landing), `/pricing` (02), `/features` (03), `/about` (04), `/contact` (05)。

- [ ] 直接套用設計稿 HTML（5 頁）到 `public/`，把外部資源（Google Fonts）改成 `<link href="https://fonts.googleapis.com/css2?family=...">`。
- [ ] 公開頁的 CTA 連到 `/signup`、`/events`。
- [ ] `/pricing` 的「立即訂閱」串 `createPayuniOrder`（同現有 showPurchaseModal 邏輯）。
- [ ] `/contact` 表單送 `submitFeedback`（沿用既有 callable）。
- [ ] 全頁支援 dark mode toggle（`<html data-theme="...">`）。
- [ ] zh / en 切換（i18n）。

**本機驗證**：5 頁顯示正常、CTA 跳轉正確、訂閱流程跑通 payuni notify。

### Phase 2 — 認證流程（2 天）

落地頁面：`/login` (11), `/signup` (12), `/forgot` (13), `/onboarding` (14)。

- [ ] 移除舊 SPA 內 mLogin / mSignup / mForgotPwd modal，改成獨立頁。
- [ ] `/login` 串 `loginAccount`、處理 SSO 按鈕（**先佔位、Phase 8 再做**）。
- [ ] `/signup` 串 `requestAccount` + `verifyAccount`。
- [ ] `/forgot` 串 `resetAdminPassword`。
- [ ] `/onboarding` 是新功能：需新增 `getOnboardingState / saveOnboardingStep` callable（5 個 step）。
- [ ] 登入成功 redirect 邏輯：第一次登入 → `/onboarding`，否則 → `/admin` 或之前的 `from` URL。

**本機驗證**：新帳號全流程（註冊 → OTP → 登入 → onboarding → admin 首頁）跑通。

### Phase 3 — 報名者體驗（4 天）

落地頁面：`/events` (21), `/events/:id` (22), `/events/:id/register` (23), `/events/:id/payment` (25), `/my` (24)。

- [ ] `/events`：套 21-browse，串 `listCompetitionsPublic`，篩選邏輯沿用 `filterHome`。
- [ ] `/events/:id`：套 22-event-detail，串 `getRegistrationBundle` + `getAnnouncements` + `getPosterData` + `getPdfData`。
- [ ] `/events/:id/register`：套 23-register，把現有 `buildWizard` / `validateField` / `validateTWID` / `submitRegistration` 直接 import 過來（**只換 UI 殼，不改驗證邏輯**）。
  - 步驟設計：4-step（基本 → 學員 → 老師 → 確認），右側 sticky 「訂單摘要」即時試算費用。
  - 學員/老師區用 mgroup（保留現有資料結構，UI 改成可摺疊區塊）。
- [ ] `/events/:id/payment`：套 25-payment，整合現有 `createRegistrationPayment` + `payuni-return.html` 邏輯。
- [ ] `/my`：套 24，**需新增** `listMyRegistrations(emailOrPhone)` callable（按 email/phone 找跨活動報名紀錄）。

**本機驗證**：建一個假活動 → 完整跑「瀏覽 → 詳情 → 報名 → 付款 → 我的報名查 QR 票券」。

### Phase 4 — 管理後台 Dashboard 與活動列表（3 天）

落地頁面：`/admin` (31), `/admin/events` (32), `/admin/events/:id` (33)。

- [ ] `/admin`：套 31-admin-dashboard。
  - KPI 4 卡：沿用 `getDashboardStats`。
  - AI insights 卡：**需新增** `getAiInsights(compId)` callable（先 mock，Phase 7 再串真 LLM）。
  - Todo 清單：**需新增** `getTodoList(compId)`（如「3 件待付款」、「5 件待確認」之 aggregation）。
  - 活躍活動 list：沿用 `listCompetitions`。
- [ ] `/admin/events`：套 32-admin-events，卡片網格 + 篩選。
- [ ] `/admin/events/:id`：套 33-event-detail-admin（hero + 5 個 sub-tab 路由入口）。
- [ ] 共用 admin sidebar 元件（60px mini-sidebar）抽出到 `components.js`。

**本機驗證**：admin 登入後可看 dashboard、KPI 與真實 Firestore 資料一致、左側導覽切換到任一活動 → 看到 hero。

### Phase 5 — 活動設定（建立 + 編輯 + 表單設計器）（4 天）

落地頁面：`/admin/events/new` (34), `/admin/events/:id/edit`, `/admin/events/:id/form-builder` (35)。

- [ ] `/admin/events/new`：套 34-create-event。
  - 模板選擇（9 種：競賽、講座、營隊、研習、報名比賽、學分課…）→ 預填 `cfg`。
  - AI 智慧建立：**需新增** `aiGenerateEventConfig(prompt)`（先 mock）。
- [ ] `/admin/events/:id/edit`：把 34 的 step bar 拿掉，改成「左 sub-tab + 右內容」（6 個 sub-tab 對應原 aEditComp 內容）。
  - 沿用 `getCompetitionConfig` / `saveCompetitionConfig`，**只改 UI 殼**。
  - 自動儲存指示器（每 10 秒 debounce 一次）。
- [ ] `/admin/events/:id/form-builder`：套 35，**最關鍵的新功能**。
  - palette + canvas + inspector 三欄。
  - 拖放欄位：用 `Sortable.js` 或 HTML5 native drag-drop。
  - Conditional logic 編輯：先做基本「if 欄位 X = 值 Y → 顯示 Z」。
  - Live preview：右上角開新 tab 預覽 `/events/:id/register?preview=1`。
  - **資料模型**：用 `cfg.formSchema = { sections: [{ fields: [...] }] }` 取代舊的 CQ/SCQ/TCQ。
  - **Migration**：寫一個 callable `migrateFormSchema(compId)` 把舊資料轉新。

**本機驗證**：建一個新活動 → 用 form builder 設計表單 → 預覽 → 真實報名一筆，資料寫入 Firestore 正確。

### Phase 6 — 進階管理工具（4 天）

落地頁面：`/admin/events/:id/{announcements,payments,scoring,checkin}` (41,42,44,45)。

- [ ] **41-announcements**：multi-channel campaigns。
  - 左：campaigns 列表（draft/scheduled/sent）。
  - 中：Email canvas（rich text editor，建議用 `Tiptap` 或 `Quill`，先用 contenteditable + 基本工具列佔位）。
  - 右：recipient picker（依組別、付款狀態、報到狀態篩選）+ 排程設定。
  - **需新增** `createCampaign / sendCampaignNow / scheduleCampaign / listCampaigns` callable。
  - SMS / LINE channel：**先 disable**（Phase 9 再做整合）。
- [ ] **42-payments**：對帳。
  - Summary cards 沿用 `getDashboardStats` 的金額欄。
  - 表格沿用 `listOrders`、加 hover row。
  - 對帳工具列沿用 `reconcilePayments`。
- [ ] **44-scoring**：live leaderboard。
  - 左：leaderboard（即時刷新 5s）。
  - 中：選手詳情 + 評分輸入（slider + stepper）。
  - 右：評審操作面板。
  - **需新增** `submitJudgeScore` / `getLiveLeaderboard` callable；改寫 `scores` schema 成複合鍵。
  - 舊 `saveScore` 視為「單評審模式」可保留。
- [ ] **45-checkin**：QR 掃描 console。
  - 沿用 `checkInTeam`，加 extras 參數。
  - 物資配發 UI（meal / shirt / gift）。
  - 即時 KPI 卡（已報到 / 未報到 / 報到率 spark）。

**本機驗證**：
- 建立 campaign → 排程 1 分鐘後發送 → 收信。
- 用兩個評審角色同時打分 → leaderboard 即時更新。
- 模擬 QR 掃 5 人 → 物資配發紀錄寫入 Firestore。

### Phase 7 — AI 助理工作區（2 天）

落地頁面：`/admin/ai` (43)。

- [ ] 套 43-ai-assistant：左對話列表、中對話、右知識庫。
- [ ] **需新增** `createConversation / listConversations / appendMessage / deleteConversation` callable。
- [ ] 訊息呼叫沿用 `askAdminAI`（已存在）+ `askCompetitionAI`，加上 `conversationId` 參數讓對話可持久化。
- [ ] 知識庫先寫死「常見問題」+ `Manual.html` 內容；下一階段串 vector search。
- [ ] 移除舊 SPA 的 chat-fab（在 `/admin/*` 任何頁右下放浮動 mini-launcher → 點擊跳 `/admin/ai`）。

**本機驗證**：可建多輪對話、切換 conversation、引用報名紀錄回答（沿用現 askAdminAI 的 RAG）。

### Phase 8 — 系統 / 設定 / Super Admin（3 天）

落地頁面：`/admin/settings` (51), `/admin/license` (52), `/admin/audit` (53), `/admin/super` (54)。

- [ ] **51-settings**：個人資料 + 通知偏好 + 安全（2FA、devices）+ 登入裝置列表。
  - 個人資料沿用既有欄位。
  - 通知偏好：**需新增** `getNotifPrefs / saveNotifPrefs` callable。
  - 登入裝置：**需新增** `listSessions / revokeSession`（從現有 sessions collection 讀）。
  - 2FA：**先佔位**（OTP via email 已有，Phase 9 加 TOTP）。
- [ ] **52-license**：方案管理。
  - cur-plan card：**需新增** `getCurrentPlan`。
  - plans grid：4 個方案沿用 `getSalesConfig`。
  - 授權碼啟用：沿用 `activateLicense`。
  - 發票歷史：**需新增** `listInvoices`（從 `orders` 過濾）。
- [ ] **53-audit-log**：沿用 `getAuditLogs`，UI 改 timeline + filter + diff view（diff view 需後端在寫 log 時保存 before/after，**新增 schema 但 backward compatible**）。
- [ ] **54-super-admin**：跨組織管理。**需新增** `getPlatformHealth / listAllOrgs / getOrgUsage / suspendOrg` callable。先 mock health 數據，串真實監控可後續做。

**本機驗證**：用 super 角色登入，看到所有組織列表；改一個組織 license expiry 後 audit log 記錄正確。

### Phase 9 — RWD / Polish / 端到端回歸（3 天）

- [ ] 全頁 RWD：≤768px sidebar 折疊成 drawer、KPI grid 4→2→1、表格改 horizontal scroll。
- [ ] 暗模式切換在所有頁正常（檢查 28 頁）。
- [ ] zh/en 雙語覆蓋率 100%。
- [ ] Lighthouse 跑分（performance / a11y / SEO 三項 ≥ 90）。
- [ ] 端到端 smoke：
  - [ ] 訪客瀏覽 landing → pricing → 訂閱方案 → 註冊帳號 → onboarding → 建活動 → 設計表單 → 發布 → 接受報名（用另一瀏覽器分頁）→ 付款 → 報到 → 評分 → 公告發信 → 匯出 → 退款。
- [ ] 把所有舊 modal（mEula、mManual、mFeedback、mFilePreview、mDetail、mTpl…）改造成可重用 component（在 components.js）。
- [ ] 移除 `legacy/` 目錄（先保留 commit history）。

---

## 6. 本機驗證流程（Production 之前）

### 6.1 Local emulator suite

```bash
# Terminal 1 - start emulators
firebase emulators:start

# Terminal 2 - serve hosting only (already part of suite)
# Hosting at http://localhost:5000
# Emulator UI at http://localhost:4000

# Terminal 3 (optional) - import seed data
firebase emulators:export ./seed --force      # 從現有 prod 匯出 sanitized 種子
firebase emulators:start --import=./seed
```

`firebase.json` 已有完整 emulator port 對映，**不用改**。

### 6.2 必跑的本機 smoke test 清單

每個 Phase 收尾前必須通過：

| 測試項目 | 通過標準 |
| --- | --- |
| **註冊 → 登入** | 新 user 可註冊、收到 OTP（emulator email log）、登入成功 |
| **建立活動** | 建一個假活動、上傳海報、儲存設定 |
| **公開報名** | 第二個瀏覽器分頁開無痕，能看到活動並完整報名 |
| **付款** | 模擬 PayUni notify（用 emulator function 直接 trigger payuniNotify）、order 狀態變 paid |
| **管理員確認** | admin 看到報名、confirmPayment 後 dashboard 數字 +1 |
| **報到 QR** | 模擬掃 QR、checkin 狀態變 true |
| **評分** | 評審輸入分數、leaderboard 更新 |
| **公告** | 排程 1 分鐘後發送 campaign、收到 email |
| **匯出 CSV** | exportTeamsCSV 下載成功 |
| **語系切換** | zh / en 切換時所有頁面文案正確 |
| **暗模式** | 28 頁開暗模式都不破版 |
| **RWD** | 在 375px / 768px / 1280px / 1920px 不破版 |

### 6.3 性能基準

| 指標 | 目標 |
| --- | --- |
| 首屏 LCP（landing） | < 2.0s |
| 首屏 LCP（admin dashboard） | < 2.5s |
| 任意頁互動 INP | < 200ms |
| Lighthouse Performance | ≥ 90 |
| Lighthouse Accessibility | ≥ 90 |
| Bundle 大小（無 framework） | shared.css < 30KB、shared.js < 50KB |

---

## 7. 風險評估

### 7.1 高風險項

| 風險 | 機率 | 影響 | 緩解 |
| --- | --- | --- | --- |
| **CQ/SCQ/TCQ → formSchema migration 出錯** | 中 | 高（舊資料遺失） | Phase 5 寫 migration callable，先在 emulator 跑、用 Firestore export/import 備份 production |
| **舊 SPA 全域變數（ME/CFG/CUR…）改成多頁後 race condition** | 中 | 中 | `app-state.js` 用 `localStorage` + custom event 廣播；每頁 onload 重新從 cookie / localStorage 重建 ME |
| **scoring schema 改寫破壞既有比賽資料** | 低 | 高 | 舊 saveScore 保留為 fallback、加 `schemaVersion` 欄位 |
| **Hosting rewrites 設定錯誤導致 404** | 中 | 中 | Phase 0 先測試所有路由、保留 `**→/index.html` 為最後 fallback |
| **font 載入慢拖累 LCP** | 中 | 低 | `<link rel="preconnect">` + `font-display: swap` |
| **dark mode SVG / chart 顏色寫死** | 高 | 低 | Phase 9 統一檢查所有 SVG 使用 `currentColor` / CSS var |

### 7.2 中風險項

| 風險 | 緩解 |
| --- | --- |
| AI insights / form-builder logic / scoring multi-judge 開發複雜度被低估 | 各 Phase 預留 +20% 緩衝；先 mock 後串 |
| 老師端反應字級太小 | 提供「大字模式」toggle（base 18px override） |
| SEO 流量損失（網址結構大改） | sitemap.xml + Google Search Console redirect map |

### 7.3 低風險項

- 既有 callable 不破壞 → 後端極穩定。
- Firebase Hosting cache 機制健全 → 部署回滾容易（CLI 一鍵 `firebase hosting:clone`）。

---

## 8. Production 切換策略

當 Phase 9 全部通過後：

1. **暫停寫入**：production 設「維護中」（在 `cfg.maintenance: true`）。
2. **Backup**：`gcloud firestore export gs://regmaster-backups/v3-upgrade-$(date)`。
3. **Migration**：跑 `migrateToV3()` callable（內含 formSchema、checkin、scores 三段）。
4. **Deploy hosting**：`firebase deploy --only hosting`。
5. **Deploy functions**：`firebase deploy --only functions:newFn1,functions:newFn2,...`（**不要全部一次 deploy**，分批降低風險）。
6. **Verify**：拿 staging account 跑一次完整 smoke。
7. **解除維護**：`cfg.maintenance: false`。
8. **24 小時觀察**：監控 audit log error 率、客服反映。
9. 1 個月後刪 `public/legacy/`。

**Rollback 計畫**：
- Hosting：`firebase hosting:clone <prev-version>`，1 分鐘內回滾。
- Functions：保留舊 functions，新功能用 `v2 namespace`（如 `submitRegistration` vs `submitRegistrationV2`）→ 改前端呼叫即可。
- Firestore：用備份 import 還原。

---

## 9. 工時與里程碑

| Phase | 內容 | 估時 | 累積 | 里程碑 |
| --- | --- | --- | --- | --- |
| 0 | 基礎建設、抽 shared 檔 | 2 d | 2 | 舊系統仍能跑 |
| 1 | Marketing 5 頁 | 3 d | 5 | 公開頁可瀏覽 |
| 2 | 認證 4 頁 | 2 d | 7 | 註冊 / 登入流程獨立成頁 |
| 3 | 報名者 5 頁 | 4 d | 11 | **報名者體驗 GA** |
| 4 | Admin Dashboard / Events 列表 | 3 d | 14 | Admin 首頁可用 |
| 5 | 活動設定 / 表單設計器 | 4 d | 18 | **核心功能升級完成** |
| 6 | 進階工具 4 頁 | 4 d | 22 | 公告 / 評分 / 報到 GA |
| 7 | AI 助理 | 2 d | 24 | AI 工作區 GA |
| 8 | 系統 / 設定 / Super | 3 d | 27 | 全頁覆蓋 |
| 9 | RWD / Polish / 回歸 | 3 d | **30** | **準備 production deploy** |

**總計：22 個工作天**（樂觀）— **28 天**（含 +20% 緩衝）。

---

## 10. 啟動前要使用者拍板的決策

請以下 6 個問題拍板後才進 Phase 0：

1. **策略**：確認走 Strategy C（多頁 + Hosting rewrites）？還是 B（單檔 SPA 內塞 28 view）？或 A（純美術）？
2. **字級**：base 維持 16px（v3 設計） / 升 17–18px（保護老師端可讀性） / 提供 user toggle？
3. **路由結構**：是否接受第 3.3 節的 14 個 URL 路由規劃？（其中 `/admin/events/:id/...` 用前端 JS parse path）
4. **資料 migration 範圍**：本次是否同步 migrate `formSchema`（CQ/SCQ/TCQ → formSchema）和 `scores schema`？或先保留舊 schema 並行（雙寫）？
5. **新功能優先級**（如要砍範圍可以砍）：
   - 必做：Phase 0–5（基礎 + Marketing + 認證 + 報名者 + 管理核心 + 表單設計器）
   - 可後做：Phase 6 公告 multi-channel、Phase 7 AI 助理工作區、Phase 8 Super Admin
   - **建議拆兩個 release**：v3.0 = Phase 0–5、v3.1 = Phase 6–8、v3.2 = Phase 9 polish
6. **舊 SPA 保留期**：production 切換成功後，`public/legacy/index.html` 保留 1 個月 / 3 個月 / 直接刪？

---

## 11. 結論

✅ **可行性**：高。後端架構穩、callable 99% 可沿用，主要工作集中在前端 + 約 30 個新 callable + 3 個 schema migration。

✅ **本機驗證可行**：Firebase emulator suite 已完整設定，從 Phase 0 起就能本機跑完整流程，不需要碰 production。

⚠️ **規模**：v3 比 v1 大 6 倍，工時 22–28 工作天（不是「幾天」），請依據業務節奏決定要不要分兩個 release。

⚠️ **資料 migration** 是最敏感的一段，建議用「雙寫 + 灰度」策略：新欄位寫入時也維持舊欄位、舊讀路徑保留 fallback；驗證 1–2 週確認新 schema 穩定後才停掉舊欄位。

📌 **下一步**：等使用者回覆第 10 節 6 個決策後，從 **Phase 0** 動工。
