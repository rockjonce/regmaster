# Phase 1-9 完整變更報告

> Snapshot: pre-deploy（git tag `v3-ready-pre-deploy-2026-05-27`）
> Production 影響：0（尚未 deploy）

---

## 1. 總覽

| 指標 | 數量 |
|---|---|
| 完成 Phase | 10 個（0 / 1 / 2 / 2.5 / 3 / 4 / 5 / 6 / 7 / 8 / 9） |
| 新增 v3 HTML 頁面 | 24 個 |
| 新增 callable functions | 30 個 |
| 修改既有 callable | 2 個（向後相容） |
| 程式碼新增（不含 design extract） | ~12,500 行 |
| 影響 production | 0（尚未 deploy） |
| Git tags | `pre-v3-upgrade-2026-05-27`、`v3-ready-pre-deploy-2026-05-27` |

---

## 2. 檔案結構變更

```
public/
├── index.html               ← 新 v3 landing（原 landing.html 改名）
├── pricing.html             ← v3-02
├── features.html            ← v3-03
├── about.html               ← v3-04
├── contact.html             ← v3-05（串 submitContactInquiry）
├── login.html               ← v3-11（串 loginAccount）
├── signup.html              ← v3-12（串 requestAccount + verifyAccount，含 trial）
├── forgot.html              ← v3-13（串 resetAdminPassword）
├── onboarding.html          ← v3-14（4-step wizard，串 onboarding callables）
├── my.html                  ← v3-24（串 listMyRegistrationsByEmail）
│
├── events/
│   ├── index.html           ← v3-21 瀏覽活動
│   ├── detail.html          ← v3-22 活動詳情
│   ├── register.html        ← v3-23 報名 wizard
│   └── payment.html         ← v3-25 付款（取代 payuni-return）
│
├── admin/
│   ├── index.html           ← v3-31 主控台
│   ├── ai.html              ← v3-43 AI 助理工作區
│   ├── settings.html        ← v3-51 帳戶設定
│   ├── license.html         ← v3-52 方案與授權
│   ├── audit.html           ← v3-53 操作日誌
│   ├── super.html           ← v3-54 Super Admin（system role）
│   │
│   └── events/
│       ├── index.html       ← v3-32 所有活動
│       ├── hub.html         ← v3-33 單一活動 hub（rewrite target）
│       ├── edit.html        ← v3 6-tab settings
│       ├── form-builder.html ← v3-35 拖放表單設計器 ⭐
│       ├── announcements.html ← v3-41 公告 / EDM
│       ├── payments.html    ← v3-42 對帳
│       ├── scoring.html     ← v3-44 多評審即時排行
│       └── checkin.html     ← v3-45 QR 報到
│
├── shared/                  ← Phase 0 共用層
│   ├── styles.css           ← v3 設計 tokens (671 行)
│   ├── admin-layout.css     ← admin 側欄/topbar 共用 (270 行)
│   ├── firebase-bridge.js   ← _argMap + google.script.run shim
│   ├── app-state.js         ← ME/CFG/theme/lang/font 持久化 + auto-detect
│   ├── i18n.js              ← zh/en 字典
│   ├── auth.js              ← 共用 auth helper
│   └── components.js        ← topbar/sidebar/toast widget
│
├── legacy/                  ← 3 個月 fallback（per Q6）
│   ├── index.html           ← 原 SPA (369 KB)
│   └── system-settings.html ← 原系統設定頁
│
├── favicon.png / Emaillogo.png / EULA.html / Manual.html / payuni-return.html ← 不動

functions/
└── index.js                 ← +963 行新增、+8 處 Node 24 相容性修補

firebase.json                ← 10 條 rewrites（admin sub-routes + legacy fallback）

_dev/
├── V3_UPGRADE_PLAN.md       ← 原始升級計畫
├── design_zip_extracted/    ← v3 設計稿（28 頁，參考用）
└── backup/
    ├── SNAPSHOT.md          ← 還原點記錄
    ├── snapshot.ps1
    ├── restore.ps1
    ├── phase4-smoke.js      ← 可重跑的測試腳本
    ├── phase5-smoke.js
    └── cleanup-dual-write.js ← 90 天後跑的 Q4 cleanup
```

---

## 3. 30 個新 Callable Functions（依 Phase 排序）

| Phase | Callable | 公開/驗證 | 用途 |
|---|---|---|---|
| 2 | `submitContactInquiry` | 🌐 public | 公開聯絡表單，寫入 `contactInquiries` + 信給 admin |
| 2 | `getOnboardingState` | 🔒 self | 讀取使用者 onboarding 進度 |
| 2 | `saveOnboardingStep` | 🔒 self | 寫入 onboarding step |
| 2.5 | `requestAccount` ✏️ | 🌐 public | **修改**：+ `intendedPlan` 第 6 參數（向後相容） |
| 2.5 | `verifyAccount` ✏️ | 🌐 public | **修改**：trial/starter/pro 給 14d subscription license |
| 3 | `listMyRegistrationsByEmail` | 🌐 public | 跨活動報名查詢 (email or phone) |
| 4 | `getAiInsights` | 🔒 auth | 基於規則的儀表板洞察（3 條規則） |
| 4 | `getTodoList` | 🔒 auth | 待辦事項聚合（4 類） |
| 5 | `getFormSchema` | 🔒 comp | 取得 v3 formSchema 或從 legacy 合成 |
| 5 | `saveFormSchema` | 🔒 comp | **雙寫**：新 schema + 反向衍生舊欄位 ⭐ |
| 6 | `listCampaigns` | 🔒 comp | 列出活動所有 EDM campaigns |
| 6 | `createCampaign` | 🔒 comp | 建立 draft campaign |
| 6 | `updateCampaign` | 🔒 comp | 更新 campaign 內容 |
| 6 | `deleteCampaign` | 🔒 comp | 刪除 campaign |
| 6 | `sendCampaignNow` | 🔒 comp | 立即發送 Email；SMS/LINE 標記 scheduled |
| 6 | `submitJudgeScore` | 🔒 comp | 多評審評分（schemaVersion=v2） |
| 6 | `getLiveLeaderboard` | 🔒 comp | 即時排行榜（含 per-judge breakdown） |
| 6 | `checkInTeamV2` | 🔒 comp | 報到 + 物資配發 extras |
| 7 | `listConversations` | 🔒 self | 列 AI 對話歷史 |
| 7 | `createConversation` | 🔒 self | 建立新對話 |
| 7 | `getConversation` | 🔒 self | 取得對話 + 訊息 |
| 7 | `appendMessage` | 🔒 self | 追加訊息（含 typing indicator） |
| 7 | `deleteConversation` | 🔒 self | 刪除對話 + cascade 訊息 |
| 8 | `getNotifPrefs` | 🔒 self | 通知偏好 |
| 8 | `saveNotifPrefs` | 🔒 self | 儲存通知偏好 |
| 8 | `listSessions` | 🔒 self | 列登入裝置（單一 session） |
| 8 | `revokeSession` | 🔒 self | 撤銷 session（rotate token） |
| 8 | `getPlatformHealth` | 🔒 system | 平台健康（system role） |
| 8 | `listAllOrgs` | 🔒 system | 全組織列表（system role） |

---

## 4. 資料 Schema 變更（per Q4 雙寫策略）

### 新增 Firestore collections

- `contactInquiries/{id}` — 公開聯絡表單
- `onboarding/{username}` — 引導進度
- `campaigns/{id}` — EDM campaigns
- `aiConversations/{id}` + `aiMessages/{id}` — AI 對話歷史
- `notifPrefs/{username}` — 通知偏好

### 改寫的欄位（雙寫）

- `comps/{id}.cfg.formSchema` **新**：權威 source of truth（v3）
- `comps/{id}.cfg.studentFields/teacherFields/customQuestions/memberCount/teacherCount/dietaryOptions/tshirtOptions` — 由 formSchema 反向衍生，保留 3 個月讓舊讀取路徑相容
- `comps/{id}.cfg.intendedPlan` **新**：使用者註冊時選的方案
- `accounts/{username}.intendedPlan` **新**：同上
- `licenses/{code}.trial` **新**：標記試用授權；既有授權不受影響

### 既有欄位不破壞

所有 v1 SPA 讀取路徑（v-form 報名）持續工作。`/legacy/` 子目錄完整保留 3 個月。

---

## 5. firebase.json rewrites（最終版）

```json
"rewrites": [
  // Admin sub-route patterns (event-scoped tools)
  { "source": "/admin/events/*/edit",          "destination": "/admin/events/edit.html" },
  { "source": "/admin/events/*/form-builder",  "destination": "/admin/events/form-builder.html" },
  { "source": "/admin/events/*/announcements", "destination": "/admin/events/announcements.html" },
  { "source": "/admin/events/*/payments",      "destination": "/admin/events/payments.html" },
  { "source": "/admin/events/*/scoring",       "destination": "/admin/events/scoring.html" },
  { "source": "/admin/events/*/checkin",       "destination": "/admin/events/checkin.html" },
  { "source": "/admin/events/*",               "destination": "/admin/events/hub.html" },
  // Super admin
  { "source": "/admin/super",                  "destination": "/admin/super.html" },
  // Legacy 3-month overlap fallback
  { "source": "/legacy/**",                    "destination": "/legacy/index.html" },
  // New v3 SPA fallback (catch-all)
  { "source": "**",                            "destination": "/index.html" }
]
```

---

## 6. Production 影響評估

| 範疇 | 影響 | 緩解 |
|---|---|---|
| 既有 callable（98 個） | ✅ 全部行為不變 | — |
| 既有 schema 讀取 | ✅ 透過雙寫保持 | 90 天後跑 cleanup |
| 既有 URL（`/`、`/system-settings.html`） | ⚠️ `/` 改顯示 v3 landing；`/system-settings.html` 會 404 | 改用 `/legacy/` 路徑 |
| 既有 session | ✅ 自動相容 | — |
| 既有金流（PayUni） | ✅ 完全不動 | — |
| 既有 Email 範本 | ✅ 不動 | — |
