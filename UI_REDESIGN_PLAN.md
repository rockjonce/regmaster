# RegMaster v2 升級計畫書 — v4（整合最終版）

> **版本**：v4（整合修正版，取代 v3）
> **日期**：2026-05-06
> **策略**：Localhost-first emulator 全程開發 → 一次性 production 上線
> **對象**：`regmaster-pro`（Firebase Hosting + Functions Gen2 + Firestore）
> **架構大變更**：PAYUNI 平台統收（取消每活動自接），含手續費 + 撥款流程

---

## 0. v4 與 v3 / v2 plan 的差異

| 來源 | 已採用 | 已修正 | 已補入 |
|---|---|---|---|
| v3 plan（我的）| 12 phase 結構→收斂為 11 phase；缺漏 callable 列表；2FA / API key / 協作 / LINE / 刪除帳戶；i18n audit phase；TOTP 安全註記；funnel 埋點顧慮 | — | — |
| v2 plan（您的）| Localhost-first 策略；Phase 4/5 拆 a/b/c；Section 6 上線 runbook；rollback 三情境；token alias 表；RM_* namespace；ngrok PAYUNI；監控門檻；dev project 分離；單檔 SPA 不拆檔 | 17 處（OTP 不重做、不引入 nodemailer、firestore port 8085、cookie 不存 OTP、branch 不拆 phase、funnel 降為 3 階段、PAYUNi 模式描述、`--radius` 影響範圍、訂閱方案模式分離、Mailhog 刪除等）| — |
| **本次新增** | — | — | **PAYUNI 平台統收**（新 Phase 6，全站架構變更）+ EULA 4-tab + 證書模板 CRUD + firestore rules/indexes 變更計畫 + lint hook + changelog modal + members.email index |

---

## 1. v4 拍板決議（最終）

| # | 議題 | 決定 |
|---|---|---|
| 1 | 字級 | 保持 19px，三檔 RWD（≤1024 / ≤768 / ≤480）|
| 2 | 報名 wizard | 保留 5 步（學員與指導老師分頁）|
| 3 | Dashboard 漏斗 / 熱點 / 排行 | 都做；funnel 第一版 3 階段（瀏覽 → 送出 → 付款），5 階段需埋點延 v3 |
| 4 | system-settings.html | 一併套樣 + 新增 PAYUNI 商家設定 tab |
| 5 | i18n | 全 UI 中英可切；Phase 9 專屬稽核 |
| 6 | Logo | 沿用 `favicon.png` |
| 7 | 部署 | localhost 全程開發；最後一次性 deploy |
| 8 | 安全 | 還原點與備份已建（[`_backup/2026-05-05_pre-redesign/`](_backup/2026-05-05_pre-redesign/) + git tag `v1-pre-redesign`）|
| 9 | 進階帳戶功能 | 2FA / API key / 協作者 / LINE Notify / 自助刪除全做 |
| **10** | **PAYUNI** | **取消每活動自接**：全站金流統一走平台 PAYUNI；強制 production；新增 commission（手續費）+ payout（撥款）機制 |

---

## 2. PAYUNI 架構變更（Phase 6 詳述，先列總覽）

### 2.1 現況（廢除）

```
┌─────────────────────────────────────────────────────┐
│  Platform PAYUNI（system salesConfig）              │
│  → 用於授權碼購買（License purchase）               │
│  ✅ 保留                                             │
├─────────────────────────────────────────────────────┤
│  Per-Activity PAYUNI（cfg.payuniMerID/HashKey/...）│
│  → 用於報名費收款 → 直接進主辦方 PAYUNI 帳戶        │
│  ❌ 廢除                                             │
└─────────────────────────────────────────────────────┘
```

### 2.2 新架構

```
┌─────────────────────────────────────────────────────────────┐
│  Platform PAYUNI（唯一商號，平台擁有）                      │
│  → 授權碼購買 ✅                                            │
│  → 報名費收款（所有活動都走這條）✅                         │
│  → 強制 production 模式（移除 t/sandbox 切換）             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼ 報名者付款（含手續費）
┌──────────────────────────────────┐
│  orders / regOrders collection   │
│  + commission（手續費）          │
│  + netAmount（淨額）             │
└──────────────────┬───────────────┘
                   │
                   ▼ 平台撥款（手動 / 排程批次）
┌──────────────────────────────────┐
│  payouts collection（新）        │
│  → 撥到主辦方銀行帳戶            │
│  → status: pending / processing  │
│           / paid / failed        │
└──────────────────────────────────┘
```

### 2.3 主辦方體驗

- 活動設定的「金流 & 費用」tab：**移除** PAYUNI 商號設定欄位；**新增**「收款銀行帳戶」設定（銀行 / 戶名 / 帳號）。
- 「線上付款」開關仍在，啟用後直接走平台 PAYUNI（無需主辦方額外設定）。
- 新增主辦方 sidebar 入口「我的撥款 (Payouts)」，看待撥 / 已撥 / 撥款失敗的 transactions。

### 2.4 平台主（系統管理員）體驗

- system-settings 新增「PAYUNI 商家設定」tab（**唯一可設定 MerID/HashKey/HashIV 的地方**）。
- 新增「批次撥款處理」tab：勾選 pending payouts → 一鍵標記 processing / paid / failed（手動匯款後回填）。
- 新增 commission rate 設定（預設 1%，可依方案分級）。

### 2.5 既有資料相容

- 既有 cfg 中的 `payuniMerID/HashKey/HashIV/Mode` 欄位**保留但 ignore**（讀取時 fallback 到 system salesConfig）。
- 一次性 migration 寫進 v4：第一次 emulator import 時，把所有 cfg 的 PAYUNI 欄位清空（不刪 doc，避免影響其他欄位）；上線前再對 production 跑一次同樣 migration。

---

## 3. v4 執行階段（共 11 個 Phase，估 9-11 週）

### Phase 0 — 基礎建設（4-5 天）

**目標**：建好「可隨時看實際運作」的開發底子 + 安全強化。

#### 0.1 環境工具
- [x] Node.js 20+ 已裝
- [x] Firebase CLI 已裝
- [ ] Java JDK 11+（emulator 必需）
- [ ] gcloud CLI（Firestore export 用）
- [ ] Docker Desktop（選；用於 Mailhog 替代方案）

#### 0.2 Firebase project 雙環境設置
```bash
# 申請 dev project
firebase projects:create regmaster-pro-dev
firebase use --add  # 加 alias
# 結果在 .firebaserc 應該有：
#   "default": "regmaster-pro"
#   "dev":     "regmaster-pro-dev"
firebase use dev    # 開發中切到 dev
```
> ⚠️ Cloud Functions 與 Firestore data 要在 dev project 各自建一份。production 的 PAYUNI 商號**絕對不能** sync 到 dev — dev 用 sandbox merchant ID。

#### 0.3 emulator 啟動
- [x] [`firebase.json:21-29`](firebase.json:21) emulators 區塊已設好（hosting:5000, functions:5001, firestore:**8085**, auth:9099, ui:4000）
- [ ] 寫 `npm start` script：
  ```json
  "scripts": { "emu": "firebase emulators:start --import=./_emu_data --export-on-exit" }
  ```

#### 0.4 前端 emulator detection（單一檔，上線時整檔刪）
新增 [`public/js/emulator-config.js`](public/js/emulator-config.js)：
```javascript
(function(){
  if (location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;
  if (typeof firebase === "undefined") return;
  try {
    firebase.functions().useEmulator("localhost", 5001);
    firebase.firestore().useEmulator("localhost", 8085);
    firebase.auth().useEmulator("http://localhost:9099");
    console.log("[RegMaster] Connected to local emulators");
  } catch(e){ console.warn("[RegMaster] emulator hook failed:", e); }
})();
```
在 [`public/index.html`](public/index.html) `<head>` Firebase init 之後 include。上線前 `firebase deploy` 不上傳此檔（用 `firebase.json` `hosting.ignore` 加 `js/emulator-config.js`）。

#### 0.5 生產資料快照匯入
```bash
gcloud config set project regmaster-pro
gcloud firestore export gs://regmaster-backup/baseline-v1-$(date +%Y%m%d)
gsutil -m cp -r gs://regmaster-backup/baseline-v1-20260506 ./_gcs_export
firebase emulators:start --import=./_gcs_export --export-on-exit=./_emu_data
```
- [x] [`.gitignore`](.gitignore) 已含 `_backup/`，補加 `_emu_data/` 與 `_gcs_export/`
- ⚠️ 開發完畢後，**rm -rf** 這三個目錄（含真實使用者個資）

#### 0.6 design tokens 落地
新增 [`public/shared.css`](public/shared.css)（複製 zip `screens/shared.css`，base font-size 改 19px / line-height 1.6 維持 / spacing 等比 × 1.357）。
新增 [`public/css/legacy-shim.css`](public/css/legacy-shim.css)：
```css
:root{
  /* 舊變數→新 tokens 映射 */
  --ink: var(--txt);
  --ink2: var(--txt2);
  --muted: var(--txt2);
  --muted2: var(--txt3);
  --line: var(--border);
  --line2: var(--surface2);
  /* 新增 v3 沒有的 */
  --pri3: #1573CC;
  --purple: #8B5CF6; --purple-bg: #F5F3FF;
  --info: #0EA5E9; --info-bg: #F0F9FF;
}
```
> ⚠️ `--radius` 維持 16px 不動（避免 .card 視覺跳動）；要改 14 等 v3。
> ⚠️ Phase 5 開始要在 [index.html:4061](public/index.html:4061) `sanitizeStyleBody()` 把上述新增變數加入白名單，避免被誤過濾。

#### 0.7 RM 命名空間骨架
[`public/index.html`](public/index.html) `<script>` 開頭加：
```javascript
window.RM = window.RM || {
  core: {}, evtSet: {}, dash: {}, auth: {},
  my: {}, tools: {}, payment: {}
};
```
> 不強制立刻搬，後續 phase 用到逐步搬。

#### 0.8 lint / format hook
- 新增 [`.eslintrc.js`](.eslintrc.js)（root，沿用 functions/.eslintrc 風格）
- 安裝 husky + lint-staged：
  ```bash
  npm install --save-dev husky lint-staged
  npx husky init
  ```
- pre-commit hook：跑 eslint + prettier check 在 staged files

#### 0.9 smoke test checklist
建 [`_test/smoke.md`](_test/smoke.md) — 內容見 v3 plan 4.8。每個 phase 結束跑一次。

#### 0.10 firestore.rules / indexes 變更模板
建立 [`_test/migration-checklist.md`](_test/migration-checklist.md)：每個 phase 結束時記錄該 phase 新增 / 改了哪些 collection、需要哪些 rule 與 index，最終 deploy 時統一 review。

**Phase 0 驗收**：
- ✅ `firebase use dev && firebase emulators:start` 成功，4 services 都 up
- ✅ http://localhost:5000 看到首頁
- ✅ 用測試帳號登入後台
- ✅ DevTools 看 `--ink` / `--pri3` / `--purple` 都有值
- ✅ husky pre-commit 在嘗試 commit lint 錯時擋下
- ✅ smoke test 全綠（記錄基準）

**修改檔案**：[firebase.json](firebase.json) / [.gitignore](.gitignore) / [.firebaserc](.firebaserc) / [public/index.html](public/index.html) / [public/shared.css](public/shared.css)（新）/ [public/css/legacy-shim.css](public/css/legacy-shim.css)（新）/ [public/js/emulator-config.js](public/js/emulator-config.js)（新）/ [.eslintrc.js](.eslintrc.js)（新）/ [_test/](_test/)（新目錄）

**Commit**：`phase 0: emulator + tokens + RM namespace + lint hook`

---

### Phase 1 — 公開頁面（4-5 天）

**目標**：報名者打開連結看到的 3 個畫面（首頁 / 活動詳情 / 報名 wizard）視覺改版。

#### 1.1 首頁 hero（v-home）
- [`hero-bar`](public/index.html:443) 換 design 稿 gradient + radial 橘色光暈
- 5 個 hero-feat 排版改用設計稿樣式
- 篩選列保留功能，套新 input/button class
- logo 區塊用 `<img src="favicon.png">`（**不採設計稿 R mark**）

#### 1.2 活動詳情頁 hero（v-comp）
- 採 `screens/registration.html` 的 `.reg-hero` 版型
- hero 顯示：活動名稱 / 日期 / 地點 / 截止 / 開放中 pill
- 海報 + 規章 PDF + 公告卡換 `.card / .card-hd`
- ⚠️ **不可改寫** [`_showInModal()` (index.html:6174)](public/index.html:6174) 與 [`_toBlobUrl()` (index.html:6191)](public/index.html:6191)，加 `// DO NOT DELETE — critical for poster/PDF preview` 註解

#### 1.3 報名 wizard（v-form）5-step 視覺重做
- step bar：橫向 5 個 step，視覺上用 `.step / .step-num / .step-line`，**邏輯仍是 5 步**（隊伍 → 學員 → 指導老師 → 自訂問題 → 確認）
- Step 1：`.group-pills` + `.sess-grid`
- Step 2-3：每位學員/老師包進 `.mgroup` 卡
- Step 4：`.chk-grid + .chk-item.on` + `.file-up` 拖放
- Step 5：`.review-section / review-row`
- 底部加 `.fee` 即時試算
- 底部「儲存草稿」（純 localStorage，不打 server）
- 底部 2 格 `.card`（報名問題 / 隱私保護）

**注意**：
- ⚠️ `submitRegistration` callable signature 不變
- ⚠️ 編輯模式（isEdit=true）、4 種 eventType、單/複梯次都要驗
- ⚠️ Phase 6 之後此 step 4 的「線上付款」選項要對接平台 PAYUNI（不再讀 cfg.payuniMerID）

**驗收**：375/768/1280 三檔正常 + 4 種 eventType 都能送出 + smoke test pass

**Commit**：`phase 1: redesign hub + competition + wizard 5-step visuals`

---

### Phase 2 — Auth 現代化（4-5 天，**比 v2 plan 短 1 天**）

**目標**：modal-based 改成獨立 [`auth.html`](public/auth.html) + 6 sub-page 流程；**沿用既有 OTP 機制**不重做後端。

#### 2.1 新檔 [`public/auth.html`](public/auth.html)（hash routing，6 sub-page）
- `#login` — Email/帳號 + 密碼（保留舊用戶相容）+ Google OAuth 占位（不接後端）
- `#signup` — 真實姓名 + Email + 帳號 + 密碼（含強度條 4 段）+ 使用情境 + EULA 勾選
- `#otp` — 6 位數 cell + 倒數重寄
- `#forgot` — Email → 寄重設驗證碼
- `#reset` — 設新密碼
- `#eula` — **EULA 4 tab**（服務條款 / 隱私政策 / Cookie / 資料處理協議）+ TOC，需勾「我已閱讀」才能繼續

#### 2.2 後端：**沿用既有 callable，不重複造輪子**
v2 plan 提案的 `requestOtp/verifyOtp/completeSignup/resetPasswordWithOtp` **取消**。改為：

| 流程 | 用既有 callable |
|---|---|
| 註冊發 OTP | [`requestAccount`](functions/index.js:833)（已 6 位數、15min TTL、`accountRequests` collection、寄信透過 `mail` collection）|
| 驗證 OTP 完成註冊 | [`verifyAccount`](functions/index.js:933) |
| 忘記密碼發重設信 | [`resetAdminPassword`](functions/index.js:873) |
| 一般登入 | [`loginAccount`](functions/index.js:155)（密碼登入，不動）|

只新增 1 個 callable：
```javascript
exports.resendOtp = callable(async ({ username, purpose }) => {
  // purpose: 'signup' (沿用 accountRequests) | 'reset' (沿用 resetAdminPassword)
  // 防 spam: 60s rate limit per email
});
```

> 工時節省：原計畫 4 個新 callable + nodemailer 設定 → 1 個新 callable + 沿用 mail collection。**省 1 day**。

#### 2.3 OTP 寄信機制
**沿用既有** `db.collection("mail").add(...)`（[functions/index.js:858 等](functions/index.js:858)）— Firebase Trigger Email Extension 已在 production 用。**不引入 nodemailer**。

emulator 中可以在 Emulator UI Firestore tab 直接看 `mail` collection 寫入的內容（mock SMTP catcher 不需要）。

#### 2.4 密碼強度（純前端）
- 8+ 字元（必要）
- 含字母（+1）、含數字（+1）、含符號（+1）、12+ 字元（+1）

#### 2.5 Google OAuth
- UI 占位按鈕（不接 Firebase Auth provider）
- v3 再做（會牽涉 accounts collection 對應 Google email）

#### 2.6 修改 [`index.html`](public/index.html)
- 移除 `mLogin / mSignup / mForgotPwd / mPwd / mEula` modal 內容（保留 ID 但 redirect 到 `/auth.html`）
- topbar「🔑 活動管理者登入」連 `/auth.html#login`

**注意**：
- ⚠️ 老用戶用既有密碼仍可登入（loginAccount 不動）
- ⚠️ 不存 OTP code 進 cookie（OTP 永遠在 server，client 只持 verifyToken from `accountRequests` doc）

**驗收**：老用戶密碼登入 OK + 新用戶走 OTP 註冊 OK + 忘記密碼重設 OK + EULA 4 tab 都能切

**修改檔案**：[`public/auth.html`](public/auth.html)（新檔，~700 行）/ [`public/index.html`](public/index.html)（移 modal）/ [`functions/index.js`](functions/index.js)（+ resendOtp 1 個 callable）/ [`firestore.rules`](firestore.rules)（accountRequests rule 確認）

**Commit**：`phase 2: auth dedicated page + EULA 4-tab (reuse existing OTP backend)`

---

### Phase 3 — 報名者個人中心（5-6 天，**比 v2 plan +1 天**）

**目標**：[`public/my.html`](public/my.html) 5 sub-page；**修正 v2 plan 的資料模型誤解**。

#### 3.1 資料模型確認（v2 plan 漏看的關鍵）
報名者的 email **不存在 teams**，存在 `members` collection（每位學員/老師獨立 doc）。
跨活動查報名要先：
```
Step 1: members.where('email','==', X).get()  → 拿 [teamId, compId] 清單
Step 2: teams.doc(teamId).get() for each      → 拿 team status / paymentStatus
Step 3: competitions.doc(compId).get()        → 拿活動標題
```

**新增 Firestore index**：
```json
{
  "collectionGroup": "members",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "email", "order": "ASCENDING" },
    { "fieldPath": "compId", "order": "ASCENDING" }
  ]
}
```
寫進 [`firestore.indexes.json`](firestore.indexes.json) — Phase 11 deploy 時生效。

#### 3.2 新檔 [`public/my.html`](public/my.html)
- `#login` — Email + OTP 驗證（不需註冊帳號；OTP 走新 callable `requestParticipantOtp`）
- `#list` — 我的所有報名卡片
- `#detail/:teamId` — 報名詳情 + 5 階段進度條（送出 → 補資料 → 付款 → 待審核 → 已確認）+ QR 票券
- `#payment/:teamId` — 付款（接 Phase 6 之後的平台 PAYUNI）
- `#success` — 報名成功（用 sessionStorage 短暫存 teamId，不暴露在 URL）

#### 3.3 後端新 callable（**3 個**，比 v2 plan 多 1 個）
```javascript
exports.requestParticipantOtp = callable(async ({ email }) => {
  // 寄 OTP 到 email（rate limit 60s/email）；寫 participantOtps/{email}
});

exports.getMyRegistrations = callable(async ({ email, otpCode }) => {
  // 1. 驗 OTP
  // 2. members.where('email','==',email).get()  → 拿 teamIds
  // 3. teams.doc(teamId).get() 取狀態
  // 4. competitions.doc(compId).get() 取活動名
  // 5. 回 [{teamId, compId, compName, status, paymentStatus, deadline, ...}]
});

exports.getMyRegistrationDetail = callable(async ({ teamId, otpToken }) => {
  // otpToken 來自 getMyRegistrations 的回應；驗證 token 後回完整 detail
});

exports.resendRegistrationEmail = callable(async ({ teamId, otpToken }) => {
  // 重寄報名確認信（寫入 mail collection）
});
```

> v2 plan 漏列 `requestParticipantOtp` 但 `#login` 必需。補上後是 4 個。

#### 3.4 報名後跳轉
[`submitRegistration`](functions/index.js:686) callback 改：
```javascript
sessionStorage.setItem('regSuccess', JSON.stringify({teamId, password, compId}));
location.href = '/my.html#success';
```
不在 URL 暴露 teamId。

#### 3.5 連結
- 公開頁 topbar 加「🎫 我的報名」連 `/my.html#login`
- 確認信 template 補「查詢我的報名」連結

**驗收**：Email + OTP 能查到所有以該 email 註冊的活動 + 詳情頁進度條正確 + 重寄確認信 emulator UI 看得到

**修改檔案**：[`public/my.html`](public/my.html)（新，~900 行）/ [`public/index.html`](public/index.html)（topbar + 跳轉）/ [`functions/index.js`](functions/index.js)（+4 callable）/ [`firestore.indexes.json`](firestore.indexes.json)（+1 index）/ [`firestore.rules`](firestore.rules)（participantOtps rule）

**Commit**：`phase 3: participant my-page (5 sub-pages, members.email index)`

---

### Phase 4 — Admin Sidebar + Dashboard（10-14 天，**最大塊**）

**目標**：[`v-admin`](public/index.html:731) 改 240px sidebar + Dashboard 重做為 `event-info.html` 樣式。拆 4a/b/c 三波。

#### Phase 4a — Sidebar 容器（2 天）
- 新增 [`<aside class="rm-aside">`](public/index.html)：brand（用 favicon.png）+ nav-grp + nav-i + aside-foot
- nav 9 項，對應現有功能：
  - 儀表板 → `aDash()`
  - 活動設定 → `aEditComp()`
  - 報名名單 → Dashboard `dt` 子 tab
  - 公告 / Email → Dashboard `dtpl` 子 tab
  - 收款對帳 → Dashboard `drec` 子 tab
  - **我的撥款 (Payouts)** → 新（Phase 6 對接，**先放 placeholder**）
  - AI 助理 → 開 chatPanel
  - 匯出 / 報表 → Dashboard `dexp` 子 tab
  - 所有活動 → `renderAdminHome()`
  - 授權碼 → `showLicenseInput()`
- RWD：≤768px 改頂部 hamburger drawer
- ⚠️ system role 看到的 sidebar 多 1 項「PAYUNI 商家設定」連 system-settings.html

#### Phase 4b — Dashboard Hero + 6 vertical tabs 骨架（3-4 天）
- Hero（活動名稱 / 日期 / 地點 / status pill / 3 quick action：複製連結 / 預覽 / 匯出 CSV）
- **6 vertical tabs**（重新分配現有 3 主 tab × 7 子 tab 內容）：

  | 新 tab | 原內容 |
  |---|---|
  | 總覽 | 「報名總攬」+「報名情況」合併 |
  | 報名名單 | 原 `dt` 子 tab |
  | 場次 & 組別 | 從活動設定挪「唯讀視圖」+ 名額使用率 |
  | 付款 & 撥款 | 原 `drec` + 新「待付款列表」+ Phase 6 後加「我的撥款」 |
  | 公告 & Email | 原 `dtpl` + 公告管理 + 群發 |
  | 規章 & 附件 | 規章 PDF + 海報 + AI 摘要 |

- 每個 tab 內先放 placeholder

#### Phase 4c — Dashboard 元件全補完 + 評分 + 證書（5-8 天）

**新增 UI 元件**：
- `.kpi`（4 KPI 卡含 delta「↑23 本週」）
- 趨勢圖（Chart.js 套色到 design tokens）
- `.bar-row` 進度條（組別 / 場次名額）
- `.urg-card` 待關注卡（自動偵測：付款逾期 < 24h / 組別額滿候補 ≥ 5 / 規章未上傳）
- `.act-list` 即時動態（接 [`getAuditLogs`](functions/index.js:356) + teams.createdAt 最新 5 筆 merge）
- `.tbl` 最近報名（最近 6 筆，純前端從 [`getAllTeams`](functions/index.js:1169) 取）
- `.funnel` 報名漏斗 — **第一版 3 階段**（瀏覽 viewCount / 送出 teams 數 / 付款 paymentStatus 已確認）。**5 階段需新埋點 → 標記延 v3**
- `.hm` 24h × 7d heatmap
- 「快速動作」grid（4 按鈕：匯出 CSV / 寄 Email / 列印名牌 / QR 報到）

**新後端 callable（5 個）**：
```javascript
exports.getRecentActivity = compAuthCallable(async (data) => {
  // auditLogs 撈最近 10 筆 + teams.createdAt 撈最新 5 筆 → 合併排序
});
exports.getRegistrationFunnel = compAuthCallable(async (data) => {
  // 第一版只 3 階段：viewCount / submittedCount / paidCount
  // 註記 // TODO: v3 add wizard step tracking
});
exports.getRegistrationHeatmap = compAuthCallable(async (data) => {
  // teams.createdAt 聚合到 7 days × 24 hour，Asia/Taipei
});
exports.getSchoolRanking = compAuthCallable(async (data) => {
  // members 聚合 school + count + percentage TOP 10
});
exports.getUrgentItems = compAuthCallable(async (data) => {
  // 付款逾期 < 24h + 組別額滿候補 ≥ 5 + 規章未上傳
});
```

**Manage 整合**：
- 報名名單加「批次操作」（原 `dexp` 移整合）
- **評分介面新版**（取代原 `dsc`）
  - 多評分項目從 `cfg.scoringCategories` 讀；read fallback `[{name:'總分', max:100}]`，write 才寫入
  - 既有 [scores collection.item 欄位](functions/index.js:1484)沿用作 instance 儲存
  - 鍵盤快速鍵（Tab / Enter / 1-9）
- **名牌 / 證書 PDF**（新 callable 2 個）
  - **取捨**：名牌用 `pdfkit`（簡單 layout 1-2s 生 100 份）；證書用 **puppeteer-core + chromium**（複雜 layout 含 ribbon / 印章）→ functions Gen2 設 2GB memory + 60s timeout
  - 4 hardcoded 模板：A4 名牌 8/頁 / A4 證書直 / A4 證書橫 / A6 名牌
  - 模板 CRUD（`certTemplates` collection）→ 簡化版只做色彩 + 變數，視覺編輯器留 v3
  - 批次產生並 zip（archiver）回 Storage URL
  - new callable: `getCertTemplates / saveCertTemplate / deleteCertTemplate / generateBadges / generateCertificates`（5 個）

**保留只套樣**：報名管理表格 / 詳情 modal / 公告 / 對帳 / QR 報到 / CSV 匯出

**新 npm 套件（functions/package.json）**：
```json
"pdfkit": "^0.14.0",
"archiver": "^6.0.0",
"puppeteer-core": "^21.0.0",
"@sparticuz/chromium": "^120.0.0"
```
> ⚠️ puppeteer + chromium 會讓 functions image 從 ~50MB → ~280MB。**冷啟動會多 3-5 秒**。建議單獨切出 `generateCertificates` 用獨立 region/runtime config（Gen2 + 2GB + 540s timeout），不影響其他 callable。

**Phase 4 驗收**：
- 切換 dashboard 與舊版資料一致（KPI 對得起來）
- 0 / 1 / 1000 筆資料都能渲染
- 評分 50 隊流暢
- 名牌 + 證書 PDF 可下載並列印
- 「我的撥款」placeholder 顯示「Phase 6 後啟用」
- RWD 三尺寸正常

**修改檔案**：[`public/index.html`](public/index.html)（v-admin / renderAdminHome / aDash 全重做 + 評分子模組 + 證書子模組）/ [`functions/index.js`](functions/index.js)（+10 callable）/ [`functions/package.json`](functions/package.json)（+4 deps）/ [`firestore.indexes.json`](firestore.indexes.json)（+ `members(school, compId)` for ranking）/ [`firestore.rules`](firestore.rules)（certTemplates rule）

**Commit**：`phase 4a/4b/4c: admin sidebar + dashboard 6-tab + scoring + cert PDF`

---

### Phase 5 — 活動設定 6-Tab + 模板化 Wizard（8-10 天）

**目標**：[`aEditComp()`](public/index.html:4257) 改 6 水平 tabs + 320px 右側欄 + 模板化建立。

#### Phase 5a — 6 水平 tabs（4-5 天）

| Tab | 對應現有 | 元件 |
|---|---|---|
| 01 基本資料 | `sec-sys` + 名稱 / 日期 / 類別 / 組別 | `.tg-row` toggle + form |
| 02 組別 & 場次 | groups + 年齡規則 + sessions | `.grp-list / .grp-item`（drag / inline / 啟用 toggle）|
| 03 報名表單 | 學員 / 老師欄位 + 自訂問題 | `.field-grid + .fchip`（picker + ★必填）+ `.cq-list / .cq-item` |
| **04 收款 & 費用** | **Phase 6 後重寫** | 報名費 + **銀行帳戶**（取代 PAYUNI 設定）|
| 05 通知 & Email | Email 範本 + 自動發信 | 範本列表 + 編輯器 |
| 06 進階設定 | 規章 PDF + 海報 + metadata | 上傳 + AI 解析 |

`_settingsDirty` → 搬 `RM.evtSet.dirty`。

#### Phase 5b — 320px 右側欄（2 天）
- 狀態區塊（活動狀態 / 開放天數 / 已收幾隊）
- 即時預覽 + 報名網址 + QR Code（沿用 [`showQR`](public/index.html:1641)）
- **海報範本**按鈕（產 1080×1080 jsPDF 含 QR）
- **上線檢查清單** 7 項：
  1. 基本資料完整（名稱+日期+組別 ≥ 1）
  2. 場次設定 ≥ 1
  3. 規章 PDF 上傳
  4. 報名表單 ≥ 中文姓名 + Email
  5. **銀行帳戶設定（Phase 6 後）**
  6. Email 範本 ≥ 1 自訂
  7. 海報上傳
- AI 智慧建議（點「採納」直接更新欄位）

#### Phase 5c — 模板化建立 Wizard（2-3 天）
取代現 `mNewComp` 的 4-eventType 簡單選單。

5-step：選模板 → 基本資訊 → 報名表單 → 收費/名額 → 確認上線

8 模板（每個預填 eventType / groups / studentFields / customQuestions / paymentMethods）+ 「從空白開始」：

| 模板 | eventType |
|---|---|
| 競賽 / 比賽 | team_coach |
| 研討會 / 講座 | single_no_coach |
| 運動賽事 | team_no_coach |
| 課程 / 工作坊 | single_no_coach |
| 社交活動 / 聚會 | single_no_coach |
| 招募 / 徵件 | single_no_coach |
| 售票活動 | single_no_coach |
| 夏令營 / 冬令營 | team_no_coach |
| 從空白開始 | （沿用原選單）|

**新後端 callable（3 個）**：
```javascript
exports.getCompetitionTemplates = callable(async () => { /* 9 個 hardcoded 模板 */ });
exports.getEventChecklist = compAuthCallable(async (data) => { /* 7 項 done/todo/warn */ });
exports.getEventSettingsAISuggestions = compAuthCallable(async (data) => {
  // 包 askAdminAI prompt → 3-5 條建議含 fieldKey + 建議值
});
```

模板 wizard 寫的活動，與手動建立完全相容（共用 [`createCompetition`](functions/index.js:431)）。

**驗收**：每 tab 都能存讀 + 切 tab dirty 提示 + 上線檢查清單即時 + AI 建議能採納 + 模板預填正確

**修改檔案**：[`public/index.html`](public/index.html)（aEditComp 重做 + 取代 mNewComp）/ [`functions/index.js`](functions/index.js)（+3 callable）

**Commit**：`phase 5a/5b/5c: event settings 6-tab + sidebar + template wizard`

---

### Phase 6 — **PAYUNI 平台統收**（5-7 天，新架構變更）

**目標**：取消每活動自接 PAYUNI；全站金流走平台單一商號；強制 production；新增 commission + payout 流程。

#### 6.1 後端：廢除每活動 PAYUNI（1 天）
- [`createRegistrationPayment`](functions/index.js:2868) 重寫：
  ```javascript
  // 舊：if (!cfg.payuniEnabled || !cfg.payuniMerID || !cfg.payuniHashKey) ...
  // 新：讀 system salesConfig 的 payuniMerID / HashKey / HashIV
  const sales = (await db.collection("config").doc("salesConfig").get()).data();
  if (!sales.payuniMerID) return { success: false, message: "平台金流尚未設定" };
  ```
- [`payuniRegNotify`](functions/index.js:2911) webhook 重寫：用 sales 的 HashKey 解密所有 reg orders
- 強制 production：
  ```javascript
  // 移除 const prefix = cfg.payuniMode === "t" ? "https://sandbox-" : "https://";
  const prefix = "https://";   // ALWAYS production
  ```
- 移除 [`saveCompetitionConfig`](functions/index.js:499) 對 `payuniMerID/HashKey/HashIV/Mode` 的接受（保留欄位但 ignore；不主動刪 doc）
- [functions/index.js:544](functions/index.js:544) 的 boolean fields list 也移除 `payuniMerID/HashKey/HashIV/Mode`

#### 6.2 後端：commission（手續費）機制（1 天）
- salesConfig 加 `commissionRate`（預設 1%；system role 可改）
- 每筆 createRegistrationPayment 計算：
  ```javascript
  const grossAmount = totalFee;
  const commission = Math.round(grossAmount * sales.commissionRate);
  const netAmount = grossAmount - commission;
  // regOrders doc 加：grossAmount, commission, netAmount, organizerUsername
  ```
- [`payuniRegNotify`](functions/index.js:2911) callback 成功時，建立 payout 記錄（見下）

#### 6.3 後端：payout 撥款流程（2 天）

**新 collection** `payouts/{payoutId}`：
```
{
  orderId: "RM-XXXX",
  compId: "comp-XXX",
  organizerUsername: "chen",
  grossAmount: 1200,
  commission: 12,
  netAmount: 1188,
  status: "pending" | "processing" | "paid" | "failed",
  bankAccount: { bank: "中國信託(822)", accountName: "陳俊宏", accountNo: "012345678901" },
  scheduledAt: serverTimestamp,
  paidAt: serverTimestamp | null,
  failureReason: string | null,
  processedBy: "system_admin_username"
}
```

**新 cfg 欄位** `bankAccount`（活動設定 04 tab 蒐集）：
```
cfg.bankAccount: { bank, accountName, accountNo }
```
> ⚠️ 主辦方第一次建活動沒 bankAccount → payout 是 `pending` 狀態 + 警告「請設定收款帳戶」

**新 callable**：
```javascript
exports.getPayoutsByOrganizer = authCallable(["system","competition"], async (data, request) => {
  // 主辦方看自己的 payouts
});
exports.listAllPayouts = authCallable(["system"], async ({ status }) => {
  // system role 看全站；可依 status filter
});
exports.processPayout = authCallable(["system"], async ({ payoutIds, action, note }) => {
  // action: 'mark_processing' | 'mark_paid' | 'mark_failed'
  // 改 status + paidAt + processedBy + failureReason
});
exports.getPayoutSummary = authCallable(["system"], async () => {
  // 統計：本月 pending 總額 / 已撥款總額 / 平台手續費收入
});
```

#### 6.4 前端：活動設定 04 tab 改寫（1 天）
- 移除 PAYUNI MerID / HashKey / HashIV / Mode UI（[index.html:4456-4470](public/index.html:4456)）
- 改顯示：
  - 「啟用線上付款」toggle（仍是 `cfg.payuniEnabled`，但意義變為「使用平台金流」）
  - 收款銀行帳戶欄位（bank / accountName / accountNo）
  - 平台手續費說明（讀 sales.commissionRate）
  - 預估撥款週期說明（如「每月 5 日撥款上月款項」）

#### 6.5 前端：主辦方「我的撥款」tab（0.5 天）
Phase 4a 預留的入口接通：
- 列出該帳號的所有 payouts（依 status 分組：待撥款 / 處理中 / 已撥款 / 失敗）
- 點開看明細（金額、手續費、淨額、銀行帳戶、撥款日）
- 匯出 CSV（自家對帳用）

#### 6.6 前端：system「PAYUNI 商家設定」tab（0.5 天）
- 在 [`system-settings.html`](public/system-settings.html) 加新 tab
- 唯一可設定 MerID / HashKey / HashIV 的地方
- **移除** Mode 切換（強制 production）
- 加 commissionRate 設定（百分比）

#### 6.7 前端：system「批次撥款處理」tab（0.5 天）
- 新 tab：列出所有 pending payouts
- 多選 + 批次操作：
  - 「標記處理中」（避免重複處理）
  - 「標記已撥款」（手動匯款後回填，含上傳匯款證明 base64）
  - 「標記失敗」（含失敗原因）
- 匯出格式化 CSV 給銀行批次匯款用

#### 6.8 一次性資料 migration（0.5 天）
寫 [`functions/index.js`](functions/index.js) 一個 `migratePayuniToplatform`（system role only，one-shot）：
```javascript
exports.migratePayuniToPlatform = authCallable(["system"], async () => {
  // 1. 把所有 cfg.payuniMerID/HashKey/HashIV/Mode 設成空字串
  // 2. 不刪欄位（保留向後相容讀取）
  // 3. 回傳影響的 doc 數
});
```
emulator 第一次 import 後跑一次，上線 deploy 後也跑一次。

**Phase 6 驗收**：
- 主辦方建新活動，活動設定 04 tab 看不到 MerID/HashKey 欄位
- 報名者付款走平台 PAYUNi（前端 redirect 到平台 MerID 的頁面）
- order doc 含 commission / netAmount
- payouts collection 有對應 doc
- system role 在 system-settings 看到 PAYUNI 商家設定 + 批次撥款處理 tab
- 主辦方 sidebar「我的撥款」看得到自己的 payout 清單

**修改檔案**：
- [`functions/index.js`](functions/index.js)（重寫 createRegistrationPayment + payuniRegNotify + 4 個新 payout callable + migration）
- [`public/index.html`](public/index.html)（活動設定 04 tab 改寫 + sidebar「我的撥款」 tab + 確認支付 modal）
- [`public/system-settings.html`](public/system-settings.html)（PAYUNI 商家設定 + 批次撥款處理 2 個新 tab）
- [`firestore.rules`](firestore.rules)（payouts 規則：主辦方只能讀自己的；system 全權限）
- [`firestore.indexes.json`](firestore.indexes.json)（+ `payouts(organizerUsername, status)`、`payouts(status, scheduledAt)`）

**Commit**：`phase 6: payuni platform consolidation + commission + payouts`

---

### Phase 7 — 帳戶設定 + 進階功能（5-6 天）

**目標**：補齊設計稿 system.html#p4 全部進階功能（v2 plan 缺漏的 5 項）。

> 拆 7a / 7b / 7c 三波。

#### Phase 7a — 個人資料 + 通知偏好 + 危險區域（2 天）

**新 collection** `userProfiles/{username}`：
```
{ avatar, language, displayNameOverride, bio,
  notifications: { dailyDigest: bool, instantNotify: 'line+email'|'line'|'email'|'off',
                   capacityAlert: bool, productUpdates: bool },
  pendingDeletion: serverTimestamp | null,
  createdAt, updatedAt }
```

**新 callable（3 個）**：
```javascript
exports.getUserProfile = authCallable(["system","competition"], async (data, request) => {...});
exports.updateUserProfile = authCallable(["system","competition"], async (data, request) => {...});
exports.requestAccountDeletion = authCallable(["competition"], async (data, request) => {
  // 設 pendingDeletion = serverTimestamp + 7 days
  // 寄確認信
});
```

新 cron（補進 [`checkDeadlines`](functions/index.js:2990) 模式）：
```javascript
exports.processPendingDeletions = onSchedule("every 24 hours", async () => {
  // 找 pendingDeletion < now 的 accounts
  // 真刪除：accounts + competitions(creator=user) + members + teams
  // 寄確認信
});
```

#### Phase 7b — 2FA / TOTP（2 天）

**新 npm 套件**：`speakeasy`（~50KB 純 Node）+ `qrcode`（已有 vendor）

**新 callable（3 個）**：
```javascript
exports.setupTotp = authCallable(["system","competition"], async (data, request) => {
  // 1. speakeasy.generateSecret(32)
  // 2. otpauth_url 給前端產 QR
  // 3. 暫存 secret 到 accounts.{username}.totpSecretPending（用驗證後才確認）
});
exports.verifyTotp = authCallable(["system","competition"], async ({ code }, request) => {
  // 1. speakeasy.totp.verify(secret, code, window=1)
  // 2. 把 totpSecretPending 移到 totpSecret + 產 8 組 backup codes（hash 後存）
});
exports.disableTotp = authCallable(["system","competition"], async ({ code }, request) => {
  // 驗證後移除 totpSecret
});
```

`loginAccount` 改：若帳號有 totpSecret，回 `requiresTotp: true` + tempToken；前端跳轉到 `#otp-totp` 輸入；補 callable `loginCompleteTotp(tempToken, code)`。

> **TOTP secret 安全註記**（Phase 11 deploy 前必處理）：
> - 本次先 plaintext 存於 accounts doc
> - **TODO v3**：用 GCP Secret Manager 或 Firebase Functions environment 存加密 key，secret 用 AES-GCM 加密落地

#### Phase 7c — API key + 協作者 + LINE Notify（1.5 天）

**API key（新 collection `apiKeys/{keyId}`）**：
```javascript
exports.generateApiKey = authCallable(["competition"], async ({ name }, request) => {
  // 1. crypto.randomBytes(32) → secret
  // 2. SHA-256 hash secret 存 doc
  // 3. 回傳 { keyId, secret } 給前端（**只顯示一次**）
});
exports.listApiKeys = authCallable(["competition"], async (data, request) => {
  // 回 [{keyId, name, last4, createdAt, lastUsedAt}]，不含 secret
});
exports.revokeApiKey = authCallable(["competition"], async ({ keyId }, request) => {...});
```
> **本次只做金鑰 CRUD**；API 認證 middleware（讓第三方真的能用 key 打）留 v3。

**協作者邀請（新 collection `collaborators/{compId}_{username}`）**：
```javascript
exports.inviteCollaborator = compAuthCallable(async ({ email, role }, request) => {
  // role: 'editor' | 'viewer'
  // 寄邀請信含 token；落 collaboratorInvites doc
});
exports.acceptCollaboration = callable(async ({ token }) => {...});
exports.listCollaborators = compAuthCallable(async (data) => {...});
exports.removeCollaborator = compAuthCallable(async ({ username }) => {...});
```
**修改 `compAuthCallable` middleware**：除 `creator` 外，`collaborators[role]` 也允許讀寫（依 role 決定能不能 write）。

**LINE Notify**（最簡單版，每 user 自己用 LINE Notify token）：
```javascript
exports.linkLineNotify = authCallable(["competition"], async ({ lineToken }, request) => {
  // 驗證 token 可用 → 存 userProfiles.{username}.lineToken
});
exports.unlinkLineNotify = authCallable(["competition"], async (data, request) => {...});
```
- 內部用：報名通知時若 user 有 lineToken，呼叫 LINE Notify API 推送（`https://notify-api.line.me/api/notify`）
- 設計稿的「LINE Bot」需要 messaging API → 留 v3

**Phase 7 驗收**：個人資料 / 通知偏好 / 2FA 設置與登入 / API key 產生與顯示一次 / 協作者邀請收信 / LINE Notify 推送都通

**修改檔案**：
- [`public/account.html`](public/account.html)（新檔，~1000 行，多 sub-page）
- [`public/index.html`](public/index.html)（topbar 加「⚙ 帳戶設定」連 `/account.html`）
- [`functions/index.js`](functions/index.js)（+15 callable）
- [`functions/package.json`](functions/package.json)（+`speakeasy`）
- [`firestore.rules`](firestore.rules)（userProfiles / apiKeys / collaborators / collaboratorInvites）
- [`firestore.indexes.json`](firestore.indexes.json)（collaborators 相關）

> **檔案策略選擇**：v3 plan 提案拆 [`account.html`](public/account.html) 新檔；v2 plan 留在 system-settings.html。**v4 折衷：account.html 給「報名者 + 主辦方」共用的個人帳戶設定（個資 / 2FA / 通知 / API key）；system-settings.html 留給 system role 的「平台層」設定（授權碼 / PAYUNI / 撥款 / Audit）**。職責清楚分離。

**Commit**：`phase 7a/7b/7c: account settings (profile + 2FA + API key + collaborators + LINE)`

---

### Phase 8 — System-settings + Plans + Feedback（3-4 天）

**目標**：[`system-settings.html`](public/system-settings.html) 套樣 + 補上 Phase 6/7 新增的 tabs + Feedback dedicated。

#### 8.1 9 個原 tab 套新樣式
- 用 design tokens 重整 CSS（不動 JS）
- sys-tab 改 `.cfg-tab` 樣式

#### 8.2 已新增的 tabs（Phase 6/7 已建）
- PAYUNI 商家設定（Phase 6.6）
- 批次撥款處理（Phase 6.7）

#### 8.3 新 tab：方案分級訂閱頁（純展示）
- 對應 design `system.html#p1`
- 4 plan card（Free / Starter / Pro / Team）含月付/年付切換、用量條
- **純 hardcoded HTML 不寫 cfg**（避免資料模型混淆；訂閱真要做留 v3）

#### 8.4 意見回饋改版
- 沿用 [`submitFeedback`](functions/index.js:3054)，UI 改 `system.html#p5` 樣式
- 5 星評分 + 截圖（base64）+ 分類

**Phase 8 驗收**：smoke pass + 11 個 tab 都能切

**修改檔案**：[`public/system-settings.html`](public/system-settings.html)

**Commit**：`phase 8: system-settings styling + plans display + feedback redesign`

---

### Phase 9 — i18n 完整稽核（1 天）

#### 9.1 grep 全站寫死中文
```bash
grep -nP '>[一-鿿]+<' public/index.html public/auth.html public/my.html public/account.html public/system-settings.html | wc -l
```

#### 9.2 i18n key naming convention
建 [`_test/i18n-convention.md`](_test/i18n-convention.md)：
```
prefix.section.element.subkey
例：
auth.login.email_label
auth.login.email_placeholder
dash.kpi.total
dash.kpi.total_delta
my.list.empty_state
account.security.totp_button
payment.method.bank_transfer
```

#### 9.3 補齊 EN
- 既有 [I18N 表](public/index.html:1269) 確認每 key 都有 zh + en
- 新增的 key 全部加 EN 版

#### 9.4 動態字串
- JS 內 `toast('已...')` / `showConfirm('確定...')` 改 `LANG === 'en' ? '...' : '...'` 或 `L('key')`

#### 9.5 驗收標準
- `?lang=en` 開站
- 跑端到端：建活動 → 報名 → 付款 → 主辦看 dashboard → 領撥款
- **不應出現任何中文 UI 字串**（使用者輸入的隊名 / 自訂問題 / 公告內文 / 銀行戶名除外）

**Commit**：`phase 9: i18n full audit (zero hardcoded zh in UI)`

---

### Phase 10 — RWD 三檔 + 跨瀏覽器（2 天）

#### 10.1 RWD breakpoint
- **480 px**：sidebar → hamburger drawer；KPI 4→1 欄；mgroup 全 1 欄；step-num 縮小；reg-list 1 欄；payment 單欄
- **768 px**：sidebar 收起；KPI 4→2 欄；雙欄 main+side → 純單欄
- **1024 px**：右 sidebar 改主內容上方 collapsible accordion

#### 10.2 跨瀏覽器
- Chrome / Safari / Firefox / Edge

#### 10.3 圖表 / 攝影機 / cert canvas 在小螢幕
- Chart.js container max-width
- jsQR scanner（QR 報到）在 mobile 確認 getUserMedia 能轉前置 / 後置鏡頭
- Cert canvas 縮放預覽

**Commit**：`phase 10: RWD three breakpoints + cross-browser`

---

### Phase 11 — 最終 QA + 一次性上線（4-5 天）

#### 11.1 全站端到端跑 5 次（2 天）
- 情境 A：新主辦方註冊（OTP）→ 建活動（模板 wizard）→ 設銀行帳戶 → 開放報名 → 報名者報名（平台 PAYUNI 付款）→ 主辦方查 dashboard → 看撥款 → 匯出 CSV
- 情境 B：老主辦方密碼登入 → 編輯既有活動 → 啟用 2FA → 邀請協作者 → 改組別 → 看待付款列表 → 寄催繳
- 情境 C：報名者 my.html OTP 登入 → 跨活動歷史報名 → 重寄確認信 → 補付款
- 情境 D：system 登入 → PAYUNI 商家設定 → 看全站 payouts → 批次處理 → 寄系統信
- 情境 E：賽事日完整流程 → QR 報到 → 評分 → 列印名牌+證書

#### 11.2 i18n / RWD / 跨瀏覽器（0.5 天）

#### 11.3 上線前 final checklist
- [ ] [`public/js/emulator-config.js`](public/js/emulator-config.js) 在 firebase.json hosting.ignore（**deploy 不含此檔**）
- [ ] `_emu_data/` / `_gcs_export/` 在 .gitignore（已驗證 ✅）
- [ ] [serviceAccountKey.json](serviceAccountKey.json) 在 .gitignore（已驗證 ✅）
- [ ] 沒有 `console.log("DEBUG")` 殘留
- [ ] PAYUNI 強制 production 已驗（沒有 sandbox- prefix 殘留）
- [ ] `firestore.rules` 全面 review（新增 collection 都有 rule）
- [ ] `firestore.indexes.json` 全面 review（新增 query 都有 index）
- [ ] 跑 `migratePayuniToPlatform` 一次（emulator → production）
- [ ] [pdfkit / archiver / puppeteer-core / @sparticuz/chromium / speakeasy] 都在 functions/package.json
- [ ] git tag `v1-final`（pre-deploy snapshot）
- [ ] 上線時間：**週日凌晨 2:00**（用戶最少）

#### 11.4 一次性部署 Runbook → 詳見第 5 節

#### 11.5 上線後 7 天觀察
- 每天看 `logClientError` / Functions logs / `feedback` collection
- 監控指標：
  - `logClientError` 平均 < 2 件 / hr
  - `submitRegistration` 成功率 > 95%
  - `loginAccount` 成功率 > 90%
  - `feedback` 差評（< 3 星）< 5 件 / 天
  - PAYUNi callback 失敗率 < 1%
  - payout pending 件數每天清

**Commit**：`phase 11: e2e QA + final checklist`

---

## 4. 工時與里程碑

| Phase | 天 | 累計 |
|---|---|---|
| 0 — 基礎建設 | 4-5 | 1 週 |
| 1 — 公開頁面 | 4-5 | 2 週 |
| 2 — Auth（沿用既有 OTP）| 4-5 | 3 週 |
| 3 — 報名者個人中心 | 5-6 | 4 週 |
| 4 — Sidebar + Dashboard + 證書 | 10-14 | 6.5 週 |
| 5 — 活動設定 + 模板 wizard | 8-10 | 8 週 |
| **6 — PAYUNI 平台統收** | **5-7** | **9 週** |
| 7 — 帳戶設定 + 進階功能 | 5-6 | 10 週 |
| 8 — System + Plans + Feedback | 3-4 | 10.5 週 |
| 9 — i18n 稽核 | 1 | 10.7 週 |
| 10 — RWD + 跨瀏覽器 | 2 | 11 週 |
| 11 — 最終 QA + 上線 | 4-5 | 11.5 週 |

**估計**：**11-12 週**（含 buffer），solo dev 白天工時。

---

## 5. 一次性上線 Runbook（同 v2 plan Section 6，補 PAYUNi migration）

### D-1（上線前一天）
```bash
# 1. Backup production Firestore
gcloud config set project regmaster-pro
gcloud firestore export gs://regmaster-backup/pre-v2-launch-$(date +%Y%m%d)

# 2. 跑 final smoke
gsutil -m cp -r gs://regmaster-backup/pre-v2-launch-XXXXXXXX ./_gcs_final
firebase use dev
firebase emulators:start --import=./_gcs_final
# 跑 _test/smoke.md 全 21 項

# 3. Tag v1
git checkout main
git tag v1-final
git push origin v1-final
```

### D-day（週日凌晨 2:00）
```bash
# 1. 切到 production project
firebase use default   # = regmaster-pro

# 2. 部署 functions（含 puppeteer / chromium，~3-5 分鐘）
firebase deploy --only functions
# 確認 deploy 成功後

# 3. 部署 firestore rules / indexes
firebase deploy --only firestore:rules,firestore:indexes
# 等 indexes building 完成（可能 5-15 分鐘，看資料量）

# 4. 跑 PAYUNi migration
# 在 emulator 已驗過；production 跑前再 dry-run 一次
firebase functions:shell
# > migratePayuniToPlatform({ dryRun: true })
# 確認影響 N 個 doc 後
# > migratePayuniToPlatform({ dryRun: false })

# 5. 部署 hosting（~30 秒）
firebase deploy --only hosting

# 6. 立刻 incognito 跑 5 個情境腳本（同 11.1）

# 7. 監控 logs
firebase functions:log --tail
```

### Rollback
詳見 v2 plan Section 6 三情境（hosting only / functions only / data restore）。

### D+1 ~ D+7
- 每天看 logs / payouts pending / feedback
- 收 5 位 early user 主動 feedback
- 預留每天 18:00-20:00 hotfix slot

---

## 6. 向後相容（不動的 contracts）

### 6.1 Firestore collection
**全部保留**：accounts / competitions / teams / members / licenses / orders / regOrders / scores / pdfChunks / posters / notifications / auditLogs / feedback / coupons / announcements / emailTemplates / visitors / accountRequests / config/* / mail / regPayments / feedbackFiles

**新增**：otps（auth）/ participantOtps（my.html）/ userProfiles（Phase 7）/ certTemplates（Phase 4c）/ apiKeys（Phase 7c）/ collaborators / collaboratorInvites（Phase 7c）/ payouts（Phase 6）/ funnelEvents（v3 deferred）

### 6.2 Cloud Functions API
- 既有 97 個 callable 全保留
- 新增約 33 個（Phase 2: 1 / Phase 3: 4 / Phase 4: 10 / Phase 5: 3 / Phase 6: 5 / Phase 7: 15 / 後加遷移：1）

### 6.3 URL & Cookie
- `?id=COMP_ID` 報名連結相容
- `regmaster_session`（6h）保留
- 不新增 client-side OTP cookie（OTP 永遠 server-side）

### 6.4 已有欄位
- 學員 `organization` / `jobTitle`：已存在 [public/index.html:1234](public/index.html:1234)，新版 `.fchip` field picker 沿用
- 老師 `organization`（原「任職學校」）/ `jobTitle`：[public/index.html:1255](public/index.html:1255)
- cfg.payuniMerID/HashKey/HashIV/Mode：保留欄位但 Phase 6 之後 ignore

---

## 7. 風險（補 v4 特有）

| 風險 | 衝擊 | 機率 | 緩解 |
|---|---|---|---|
| **PAYUNi 平台帳號設錯（HashKey/IV）→ 全站收款失敗** | 🔴 嚴重 | 低 | Phase 6 system-settings PAYUNi 商家設定加「測試 webhook」按鈕；上線前在 dev project 跑通 1 筆完整付款 |
| **既有活動的 cfg.payuniMerID 還在用 → 主辦方付款進錯帳戶** | 🔴 嚴重 | 中 | Phase 6.8 migration 強制清空所有 cfg PAYUNi 欄位；上線當天必跑 |
| **Puppeteer cold start 5 秒以上** | 🟡 中 | 高 | generateCertificates 用獨立 Functions runtime config（2GB / 540s）；前端顯示「最多需 30 秒，請稍候」 |
| **Members.email index 還在 building 時 my.html 查詢失敗** | 🟡 中 | 中 | 上線前 D-1 deploy index，等 building 完才正式上線 |
| **協作者中介層改了 compAuthCallable 影響既有 callable** | 🔴 嚴重 | 中 | 修改後跑現有所有後台功能 smoke 一遍；creator 角色行為必須 100% 同前 |
| **TOTP secret 明文存** | 🟡 中 | — | 文件記錄為 known issue / TODO v3；不影響 v2 上線 |
| **LINE Notify token 過期（90 天）** | 🟡 低 | 高 | 寄信時 token 失效，捕捉 401 自動 unlinkLineNotify 並通知 user 重新綁定 |
| **regmaster-pro-dev 與 regmaster-pro 資料 drift** | 🟡 中 | 高 | 每個 phase 重新 import production snapshot；Phase 11 final smoke 用最新快照 |

既有風險（從 v2 plan）：海報/PDF 預覽 / `<style>body{}</style>` 注入 / 全域變數衝突 / Sidebar RWD — 沿用 v2 plan 8.2 的緩解。

---

## 8. v4 新增 Cloud Functions（依 Phase）

```
Phase 2 (Auth):
  resendOtp(username, purpose)

Phase 3 (My):
  requestParticipantOtp(email)
  getMyRegistrations(email, otpCode)
  getMyRegistrationDetail(teamId, otpToken)
  resendRegistrationEmail(teamId, otpToken)

Phase 4 (Dashboard):
  getRecentActivity(compId)
  getRegistrationFunnel(compId)         // 第一版 3-stage
  getRegistrationHeatmap(compId)
  getSchoolRanking(compId)
  getUrgentItems(compId)
  generateBadges(compId, template, teamIds)
  generateCertificates(compId, template, teamIds)
  getCertTemplates(compId)
  saveCertTemplate(compId, template)
  deleteCertTemplate(compId, templateId)

Phase 5 (Settings):
  getCompetitionTemplates()
  getEventChecklist(compId)
  getEventSettingsAISuggestions(compId)

Phase 6 (PAYUNi):
  getPayoutsByOrganizer()
  listAllPayouts(status?)
  processPayout(payoutIds, action, note)
  getPayoutSummary()
  migratePayuniToPlatform(dryRun)        // one-shot

Phase 7 (Account):
  getUserProfile()
  updateUserProfile(profile)
  requestAccountDeletion()
  setupTotp()
  verifyTotp(code)
  disableTotp(code)
  loginCompleteTotp(tempToken, code)
  generateApiKey(name)
  listApiKeys()
  revokeApiKey(keyId)
  inviteCollaborator(compId, email, role)
  acceptCollaboration(token)
  listCollaborators(compId)
  removeCollaborator(compId, username)
  linkLineNotify(lineToken)
  unlinkLineNotify()
```

合計 **約 33 個新增 callable**（與 v3 plan 的 13 個比，多 20 個是因為加了 PAYUNi payout 5 個 + 進階帳戶 16 個）。

---

## 9. v4 新增 npm 套件（functions/package.json）

```json
{
  "dependencies": {
    "pdfkit": "^0.14.0",                  // Phase 4c 名牌
    "archiver": "^6.0.0",                 // Phase 4c zip
    "puppeteer-core": "^21.0.0",          // Phase 4c 證書
    "@sparticuz/chromium": "^120.0.0",    // Phase 4c puppeteer 用
    "speakeasy": "^2.0.0"                 // Phase 7b TOTP
  }
}
```

> **不新增** nodemailer（沿用 mail collection / Trigger Email Extension）

---

## 10. design tokens 對照表（同 v2 plan Section 9.4，rad 修正）

| 設計稿 | 既有 | 處理 |
|---|---|---|
| `--pri / --pri2 / --accent` | 同 | ✅ 不動 |
| `--pri3 #1573CC` | （無）| ➕ 新增 |
| `--ink #0B1220` | `--txt #0f172a` | ➕ alias `--ink: var(--txt)` |
| `--ink2 #1E293B` | `--txt2 #475569` | ➕ alias |
| `--muted` | `--txt2` | ➕ alias |
| `--muted2 #94A3B8` | `--txt3 #94a3b8` | ➕ alias |
| `--line` | `--border` | ➕ alias |
| `--bg / --surface` | 同 | ✅ 不動 |
| `--purple* / --info*` | （無）| ➕ 新增 |
| `--radius` 14 | 16 | ⚠️ **不動**（避免 .card 視覺跳動；只影響 .card 一處，無實質好處）|

---

## 11. Git 策略

```
main                  ─ v1 production
└── v2-dev            ─ V2 開發主線（直接 commit）
    ├── tag: phase-0-done
    ├── tag: phase-1-done
    ├── ...
    └── tag: v2-rc1   ─ Phase 11 最終 candidate
        → merge to main
        → tag: v2.0.0
```

**不**用 phase-per-branch（solo dev、串行做，branch 只增加 merge 衝突）。每 phase 結束 commit 後加 tag，rollback 用 `git reset --hard <tag>`。

---

## 12. 動工前 checklist

- [x] 6 大決策 + PAYUNi 平台統收 + 進階功能拍板
- [x] 還原點與備份建立（[`_backup/2026-05-05_pre-redesign/`](_backup/2026-05-05_pre-redesign/) + tag `v1-pre-redesign`）
- [x] `.gitignore` 強化（serviceAccountKey.json、firestore-debug.log、_backup/）
- [ ] Java JDK 11+ 已裝
- [ ] gcloud CLI 已裝
- [ ] 申請 `regmaster-pro-dev` Firebase project
- [ ] 練習 `firebase use --add` 切換 project
- [ ] 取得 PAYUNi 平台 sandbox merchant ID（dev 用）
- [ ] 確認 PAYUNi production merchant ID（上線用）
- [ ] **確認 Phase 6 撥款流程的法務 / 稅務含義**（平台代收主辦方款項，可能需要金流牌照或第三方支付登記，請與會計 / 律師確認）
- [ ] 確認 LINE Notify 申請流程（每個 user 自己用 LINE 帳號到 https://notify-bot.line.me/zh_TW/ 拿 token）
- [ ] confirm v4 計畫，下指令進入 Phase 0

---

## 13. 待您拍板的 3 項（或可在 Phase 進行中再決定）

1. **PAYUNI 撥款週期**：每月 1 號 / 每月 5 號 / 每週五 / T+7 / 手動觸發。建議**手動觸發**（system role 在批次撥款處理 tab 主動勾選）。
2. **PAYUNI 手續費抽成基準**：固定 1% / 依方案分級（Free 5% / Starter 1% / Pro 0.5%）/ 固定金額 + 比例。建議**第一版固定 1%**（system 可改），分級留 v3。
3. **撥款最低門檻**：例如 NT$500 才撥款，避免每筆都撥手續費吃掉。建議**有最低門檻 NT$500**，不到累積到下次。

> 不卡進度。三項預設值：手動觸發 / 1% / NT$500。Phase 6 動工後再依您回應微調。

---

## 14. 結語

V4 = V2 plan（您）+ V3 corrections（我）+ PAYUNi 統收（新）+ 進階帳戶（補）。

優勢：
- 程式碼乾淨（no V2/V1 並存 if-branch）
- 一次補齊缺漏功能（2FA / API / 協作 / LINE / 刪除 / 撥款）
- PAYUNi 商業模式清晰（你拿手續費，主辦方拿淨額）

代價：
- 11-12 週開發時間（比 v2 plan 多 1-2 週）
- 上線當日壓力集中（用 D-1 backup + 三情境 rollback 緩解）
- PAYUNi 統收涉及金流合規（**動工前必先諮詢律師 / 會計**）

**起手式**：Phase 0.1 安裝 JDK 11 + 申請 regmaster-pro-dev project + `firebase emulators:start` 跑得起來。

— END v4 —
