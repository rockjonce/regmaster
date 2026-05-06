# RegMaster v2 升級計畫書 — v5（整合 v4 + Addendum）

> **版本**：v5（Final，整合 v4 主檔 + Addendum 修正）
> **日期**：2026-05-06
> **公司**：Kuang-Tien International CO., Ltd.
> **策略**：Localhost-first emulator 全程開發 → 一次性 production 上線
> **架構大變更**：PAYUNI 平台統收（取消每活動自接），含 plan-based 手續費 + 自動撥款 + 退款 + 對帳

---

## 0. v5 與前版差異一覽

| 項目 | v4 | v5（本版）|
|---|---|---|
| 商業決策（手續費 / 撥款 / 門檻） | 預設值未拍板 | **已拍板**：plan-based 手續費 + 1/15 自動撥款 + NT$1,000 門檻 |
| PAYUNI 對帳機制 | 無 | **新增** Phase 6.10 reconcile cron |
| 退款流程 | 無 | **新增** Phase 6.9 完整退款（含部分退款）|
| commissionRate 結構 | 單值 | plan-based table |
| Migration 可逆性 | 不可逆 | 加 `_legacyPayuni` 備份 |
| TOTP backup code 登入 | 產生但無登入流程 | 補完整流程 |
| TOTP admin 救援 | 無 | 補 `adminDisableUserTotp` |
| 協作者邀請（非帳號）| 假設已有帳號 | 補完整 signup-then-join 流程 |
| OTP rate limit | 僅 email-based | 補 IP-based |
| Cron emulator 測試 | 無法測 | 補 `devTriggerCron` |
| 法務前置諮詢 | 列為 TODO | **移除**（合法商業行為，無需特殊諮詢）|
| emulator-config.js 部署排除 | hosting.ignore | **沿用** hosting.ignore（Addendum §1.5 Method A 不可行 — rewrite 無法 serve public/ 外檔案）|
| 工時 | 11-12 週 | **12-13 週**（+1 週吸收 addendum 新增）|

---

## 1. v5 拍板決議（最終版）

### 1.1 基本決策（沿用 v4）

| # | 議題 | 決定 |
|---|---|---|
| 1 | 字級 | 19px，三檔 RWD（≤1024 / ≤768 / ≤480）|
| 2 | 報名 wizard | 保留 5 步 |
| 3 | Dashboard 漏斗 / 熱點 / 排行 | 都做；funnel 第一版 3 階段 |
| 4 | system-settings.html | 一併套樣 + PAYUNI 商家 + 撥款 + 對帳 + 退款 4 個新 tab |
| 5 | i18n | 全 UI 中英可切；Phase 9 專屬稽核 |
| 6 | Logo | 沿用 `favicon.png` |
| 7 | 部署 | localhost 全程；最後一次 deploy |
| 8 | 安全 | 還原點與備份已建（[`_backup/2026-05-05_pre-redesign/`](_backup/2026-05-05_pre-redesign/) + tag `v1-pre-redesign`）|
| 9 | 進階帳戶 | 2FA / API key / 協作 / LINE / 自助刪除全做 |
| 10 | PAYUNI | 取消每活動自接，全站走平台單一商號，強制 production |

### 1.2 商業決策（addendum 拍板）

#### 手續費（plan-based）

| 主辦方方案 | 啟用金流時 | 不啟用金流 |
|---|---|---|
| **免費版 Free** | **3%** | 0% |
| 入門版 Starter | 1% | 0% |
| 專業版 Pro | 0.5% | 0% |
| 團隊版 Team | 0.3% | 0% |

**設計用意**：免費版 3% 誘導升級；訂閱用戶享低費率回收訂閱費。

#### 撥款週期

- **自動撥款**：每月 **1 日** 與 **15 日** 10:00 自動執行
- **手動補發**：system role 在「批次撥款處理」tab 隨時觸發
- 撥款前一日（每月 30/31 日 與 14 日）寄信通知主辦方
- 主辦方 dashboard 顯示「下次撥款日：MM-DD（N 天後）」+「累積待撥金額」

#### 撥款最低門檻

- **NT$1,000**（含）以上才撥款
- 低於門檻 → 累積到下次
- 主辦方 dashboard 顯示「待累積：NT$XXX / NT$1,000」
- **90 天未達門檻**：cron 寄信給主辦方詢問處理方式（領出 / 繼續累積）

---

## 2. PAYUNI 架構（v5 完整版）

### 2.1 流程圖

```
┌─────────────────────────────────────────────────────────────┐
│  Platform PAYUNI（唯一商號，Kuang-Tien 擁有）              │
│  → 授權碼購買 ✅（沿用 salesConfig）                        │
│  → 報名費收款 ✅（強制 production，無 sandbox 切換）       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼ 報名者付款（含 plan-based 手續費）
┌──────────────────────────────────────────────┐
│  regOrders collection                        │
│  + commission（依 organizer.plan 計算）      │
│  + netAmount（淨額）                          │
│  + status: pending / paid / refunded         │
└──────────────────┬───────────────────────────┘
                   │
                   ├─ webhook 失敗 → reconcilePendingOrders cron 補救
                   │
                   ▼ 1 / 15 號 cron 自動結算
┌──────────────────────────────────────────────┐
│  payouts collection                          │
│  → 累積到主辦方銀行帳戶                       │
│  → 達 NT$1,000 才產生 pending payout         │
│  → system 手動匯款後標記 paid                 │
└──────────────────────────────────────────────┘
                   │
                   ▼ 退款流程（隨時可發起）
┌──────────────────────────────────────────────┐
│  refundRequests collection                   │
│  → 主辦方 / system 發起                      │
│  → system 審核 → PAYUNI Refund API           │
│  → 已撥 → 抵下次 payout / 未撥 → 直接扣      │
└──────────────────────────────────────────────┘
```

### 2.2 主辦方體驗

- 活動設定「金流 & 費用」tab：移除 PAYUNI 設定，改為「收款銀行帳戶」+「啟用線上付款」toggle
- sidebar 新入口「我的撥款」：顯示下次撥款日 / 累積金額條 / 歷史記錄
- 「申請退款」按鈕在報名管理單列上

### 2.3 平台主（system）體驗

System-settings 新增 **4 個 tab**：

1. PAYUNI 商家設定（**唯一可設 MerID/HashKey/HashIV 的地方**）
2. 批次撥款處理（cron 標記後手動匯款 + 回填 paid）
3. 退款審核（refundRequests 列表 + 處理）
4. 對帳工具（pending > 30 分鐘的 orders 一鍵查 PAYUNI）

### 2.4 既有資料相容

- 既有 cfg 中 `payuniMerID/HashKey/HashIV/Mode` 透過 migration 移到 `_legacyPayuni`（**可逆**）
- migration 寫進 v5：先 dry-run，確認影響數，再正式跑
- 上線前在 production 跑同樣 migration

---

## 3. 執行階段（共 11 個 Phase，估 12-13 週）

### Phase 0 — 基礎建設（4-5 天）

#### 0.1 環境工具
- [x] Node.js 20+ / Firebase CLI
- [ ] **Java JDK 11+**（emulator 必需）
- [ ] **gcloud CLI**（Firestore export 用）

#### 0.2 雙 project 設置
```bash
firebase projects:create regmaster-pro-dev
firebase use --add   # 加 alias dev / default
firebase use dev
```
> ⚠️ dev 用 PAYUNI sandbox merchant；production 用正式商號（**絕不 sync**）

#### 0.3 emulator 啟動
- [x] [`firebase.json:21-29`](firebase.json:21) emulators 已設好（hosting:5000, functions:5001, firestore:**8085**, auth:9099, ui:4000）
- [ ] npm script：`"emu": "firebase emulators:start --import=./_emu_data --export-on-exit"`

#### 0.4 emulator detection（沿用 hosting.ignore，Addendum Method A 不採用）

放在 [`public/js/emulator-config.js`](public/js/emulator-config.js)：
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

[`firebase.json`](firebase.json) 加 `hosting.ignore`：
```json
"hosting": {
  "public": "public",
  "ignore": [
    "firebase.json",
    "**/.*",
    "**/node_modules/**",
    "**/js/emulator-config.js"
  ]
}
```

> **為何 Addendum §1.5 Method A 不可行**：Firebase Hosting rewrites 的 `destination` 是 `public/` 內的相對路徑，無法 serve `public/` 外的檔案。把檔案放 `_dev/` 然後 rewrite 會 404。`hosting.ignore` 才是 Firebase 官方對「本地開發檔不部署」的標準作法，glob pattern 對任何檔案都有效（不限隱藏檔）。

#### 0.5 生產資料快照匯入 + 演練
```bash
gcloud config set project regmaster-pro
gcloud firestore export gs://regmaster-backup/baseline-v1-$(date +%Y%m%d)
gsutil -m cp -r gs://regmaster-backup/baseline-v1-XXXXXXXX ./_gcs_export
firebase use dev
firebase emulators:start --import=./_gcs_export --export-on-exit=./_emu_data
```

**Backup-restore 演練**（addendum 補項）：
1. 用 dev project 跑：export → cp → emulator import 一次
2. emulator 中操作幾筆資料
3. `firebase emulators:export` 再倒回 dev project（**不是 production**）
4. 確認資料完好
5. 寫進 [`_test/disaster-recovery.md`](_test/disaster-recovery.md)

#### 0.6 design tokens
- 新增 [`public/shared.css`](public/shared.css)（複製 zip + base font 19px + spacing × 1.357）
- 新增 [`public/css/legacy-shim.css`](public/css/legacy-shim.css)（變數 alias）
- `--radius` **不動**維持 16px

#### 0.7 RM 命名空間
```javascript
window.RM = window.RM || {
  core: {}, evtSet: {}, dash: {}, auth: {},
  my: {}, tools: {}, payment: {}, refund: {}
};
```

#### 0.8 lint / format hook
- husky + lint-staged + eslint + prettier
- pre-commit 跑 lint check on staged

#### 0.9 smoke / migration / DR checklist
- [`_test/smoke.md`](_test/smoke.md)
- [`_test/migration-checklist.md`](_test/migration-checklist.md)
- [`_test/disaster-recovery.md`](_test/disaster-recovery.md)
- [`_test/i18n-convention.md`](_test/i18n-convention.md)

**Phase 0 驗收**：emulator 跑通 + tokens 都有值 + husky 擋住 lint 錯誤 + smoke 全綠 + DR 演練成功

**Commit**：`phase 0: emulator + tokens + RM ns + lint hook + DR drill`

---

### Phase 1 — 公開頁面（4-5 天）

> 與 v4 相同。略。

- 1.1 首頁 hero 視覺改版
- 1.2 活動詳情頁 hero 換 reg-hero 版型
- 1.3 報名 wizard 5-step 視覺重做（mgroup / chk-grid / file-up / fee 試算 / review）
- ⚠️ [`_showInModal`](public/index.html:6174) 與 [`_toBlobUrl`](public/index.html:6191) 加 `// DO NOT DELETE` 註解

**Commit**：`phase 1: redesign hub + competition + wizard 5-step visuals`

---

### Phase 2 — Auth 現代化（4-5 天）

#### 2.1 [`public/auth.html`](public/auth.html) 6 sub-page（hash routing）
- `#login` / `#signup` / `#otp` / `#forgot` / `#reset` / `#eula`（4 tab：服務條款 / 隱私 / Cookie / 資料處理）

#### 2.2 沿用既有 OTP 後端
- 註冊發 OTP → [`requestAccount`](functions/index.js:833)（已是 OTP）
- 驗證 → [`verifyAccount`](functions/index.js:933)
- 忘記密碼 → [`resetAdminPassword`](functions/index.js:873)
- 一般登入 → [`loginAccount`](functions/index.js:155)
- **新增** `resendOtp(username, purpose)`（rate limited）

#### 2.3 OTP rate limiting（**addendum 補強**）

新 collection `rateLimits/{key}`，TTL 1 小時：

```javascript
async function checkOtpRateLimit(email, ip) {
  const now = Date.now();
  // IP: 5 次 / 分鐘
  const ipKey = "otp_ip_" + (ip || "unknown").replace(/[^\w]/g, "_");
  const ipDoc = await db.collection("rateLimits").doc(ipKey).get();
  if (ipDoc.exists) {
    const d = ipDoc.data();
    if (now - d.windowStart < 60000 && d.count >= 5) {
      return { ok: false, msg: "請求過於頻繁，請稍後再試" };
    }
  }
  // Email: 1 次 / 60 秒（既有邏輯保留）
  // ...
  await db.collection("rateLimits").doc(ipKey).set({
    windowStart: now,
    count: admin.firestore.FieldValue.increment(1)
  }, { merge: true });
  return { ok: true };
}
```

> ⚠️ Cloud Functions callable 取 IP：`request.rawRequest.ip`（v2 callable）或 `context.rawRequest.ip`（v1）。functions/index.js 大多是 v2，用 `request.rawRequest.ip`。

#### 2.4 寄信
**沿用** `db.collection("mail")` + Firebase Trigger Email Extension。**不引入** nodemailer。

#### 2.5 密碼強度（純前端）4 段條
8+ 字 / 含字母 / 含數字 / 含符號 / 12+ 字

#### 2.6 修改 [`index.html`](public/index.html)
移除 5 個 modal 內容；topbar 連 `/auth.html#login`

**Commit**：`phase 2: auth dedicated page + EULA 4-tab + rate limit`

---

### Phase 3 — 報名者個人中心（5-6 天）

> 與 v4 相同：[`my.html`](public/my.html) 5 sub-page + members.email index + 4 callable

關鍵：報名者 email 在 **`members` collection 獨立 doc**（不在 teams），需先查 members 拿 teamIds 再查 teams。

新 Firestore index（[`firestore.indexes.json`](firestore.indexes.json)）：
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

新 callable（4 個）：`requestParticipantOtp` / `getMyRegistrations` / `getMyRegistrationDetail` / `resendRegistrationEmail`

報名後跳轉用 `sessionStorage`（不暴露 teamId 在 URL）。

**Commit**：`phase 3: participant my-page (5 sub-pages, members.email index)`

---

### Phase 4 — Admin Sidebar + Dashboard（10-14 天）

> 與 v4 相同。拆 4a/4b/4c。

**4a (2 天)**：240px sidebar + 9 個 nav 項（含「我的撥款」placeholder）+ ≤768px hamburger

**4b (3-4 天)**：Dashboard hero + 6 vertical tabs 骨架（總覽 / 報名名單 / 場次組別 / **付款 & 撥款** / 公告 Email / 規章附件）

**4c (5-8 天)**：
- KPI / 趨勢 / 進度條 / urg-card / act-list / 最近報名 / **funnel（第一版 3 階段）** / heatmap
- 5 個新 callable：`getRecentActivity` / `getRegistrationFunnel` / `getRegistrationHeatmap` / `getSchoolRanking` / `getUrgentItems`
- 評分介面新版（多評分項目從 `cfg.scoringCategories` 讀，read fallback `[{name:'總分',max:100}]`）
- **名牌 / 證書 PDF**（pdfkit + puppeteer-core + @sparticuz/chromium + archiver）
  - 5 個新 callable：`getCertTemplates` / `saveCertTemplate` / `deleteCertTemplate` / `generateBadges` / `generateCertificates`
  - 證書用 puppeteer 設 Functions Gen2 2GB / 540s timeout（獨立 region 避免影響其他 callable）

**Commit**：`phase 4a/4b/4c: admin sidebar + dashboard 6-tab + scoring + cert PDF`

---

### Phase 5 — 活動設定 6-Tab + 模板 Wizard（8-10 天）

> 與 v4 相同。拆 5a/5b/5c。

- **5a (4-5 天)**：6 水平 tabs（基本資料 / 組別場次 / 報名表單 / **收款 & 銀行帳戶** / Email / 進階）
- **5b (2 天)**：320px 右側欄（狀態 / 預覽 / 上線檢查清單 7 項 / AI 建議）
- **5c (2-3 天)**：模板化 wizard（9 模板 → 對應 eventType；新 callable `getCompetitionTemplates` / `getEventChecklist` / `getEventSettingsAISuggestions`）

**Commit**：`phase 5a/5b/5c: event settings 6-tab + sidebar + template wizard`

---

### Phase 6 — PAYUNI 平台統收（**7-9 天**，比 v4 多 2 天，含 addendum 新增）

#### 6.1 後端：廢除每活動 PAYUNI（1 天）

- [`createRegistrationPayment`](functions/index.js:2868) 重寫：讀 system salesConfig 的 PAYUNi 商號
- [`payuniRegNotify`](functions/index.js:2911) webhook 重寫：用 sales 的 HashKey 解所有 reg orders
- 強制 production：移除 `prefix = cfg.payuniMode === "t" ? "https://sandbox-" : "https://"`，改 `const prefix = "https://"`
- [`saveCompetitionConfig`](functions/index.js:499) [`functions/index.js:544`](functions/index.js:544) 移除 PAYUNI 4 欄位接受

#### 6.2 後端：plan-based commission（1 天，**addendum 修正**）

`config/salesConfig` schema：
```javascript
{
  // PAYUNI 商號（platform-level）
  payuniMerID: "...", payuniHashKey: "...", payuniHashIV: "...",
  // commissionRate plan-based
  commissionRates: {
    free: 0.03,        // 3%
    starter: 0.01,     // 1%
    pro: 0.005,        // 0.5%
    team: 0.003        // 0.3%
  },
  // 撥款設定
  payoutMinimum: 1000,
  payoutSchedule: {
    fixedDates: [1, 15],     // 每月撥款日
    allowManualPayout: true
  }
}
```

`createRegistrationPayment` 內：
```javascript
const organizerDoc = await db.collection("accounts").doc(cfg.creator).get();
const plan = organizerDoc.data()?.plan || "free";
const rate = sales.commissionRates[plan] ?? sales.commissionRates.free;
const commission = Math.round(grossAmount * rate);
const netAmount = grossAmount - commission;
// regOrders doc 加: grossAmount, commission, netAmount, organizerUsername, organizerPlan
```

`accounts.{username}.plan` 新欄位（`'free' | 'starter' | 'pro' | 'team'`，預設 `'free'`）

#### 6.3 後端：payouts collection（1 天）

```
payouts/{payoutId}: {
  payoutId, orderId, compId, organizerUsername,
  grossAmount, commission, netAmount,
  status: 'pending' | 'processing' | 'paid' | 'failed',
  bankAccount: { bank, accountName, accountNo },
  scheduledAt, paidAt, failureReason, processedBy,
  payoutAdjustment: number  // 退款時可能為負（抵扣）
}
```

新 callable：`getPayoutsByOrganizer` / `listAllPayouts` / `processPayout` / `getPayoutSummary`

#### 6.4 前端：活動設定 04 tab 改寫（0.5 天）

移除 PAYUNI 設定 UI（[`index.html:4456-4470`](public/index.html:4456)），改為：
- 「啟用線上付款」toggle（仍是 `cfg.payuniEnabled`，意義改為「使用平台金流」）
- 收款銀行帳戶（bank / accountName / accountNo）
- 平台手續費說明（依 organizer.plan 動態顯示）
- 撥款週期說明

#### 6.5 前端：主辦方「我的撥款」UX 強化（**addendum 補強**，1 天）

- **下次撥款日：MM-DD（N 天後）** 醒目顯示
- 累積待撥金額條：`NT$XXX / NT$1,000（XX%）`
- 達門檻：橘色 pill「下次撥款日將撥款」
- 未達門檻：灰色「累積中，需再 NT$XXX」
- 歷史 payouts 列表（含 status / 銀行戶 / 撥款日 / 失敗原因）
- 匯出 CSV

#### 6.6 system 「PAYUNI 商家設定」tab（0.5 天）

- 唯一可設定 MerID / HashKey / HashIV 的地方
- 移除 Mode 切換（強制 production）
- **commissionRates 4 行 input**（free / starter / pro / team）
- 撥款最低門檻 input
- 撥款日勾選（1 / 15 / 其他）
- 「測試 webhook」按鈕（dev 工具）

#### 6.7 system 「批次撥款處理」tab（0.5 天）

- 列出所有 pending payouts
- 多選 + 批次操作：標記 processing / paid（含上傳匯款證明 base64）/ failed（含原因枚舉）
- 失敗原因枚舉：`'wrong_account'` / `'bank_rejected'` / `'organizer_unreachable'` / `'other'`（addendum §4 #7）
- 匯出格式化 CSV 給銀行批次匯款

#### 6.8 一次性 migration **加 backup**（**addendum §1.4 修正**，0.5 天）

```javascript
exports.migratePayuniToPlatform = authCallable(["system"], async ({ dryRun = true }) => {
  const snap = await db.collection("competitions").get();
  let affected = 0, skipped = 0;
  const ops = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const cfg = data.config || {};
    if (!cfg.payuniMerID && !cfg.payuniHashKey) { skipped++; continue; }

    const update = {
      "_legacyPayuni": {
        merID: cfg.payuniMerID || "",
        hashKey: cfg.payuniHashKey || "",
        hashIV: cfg.payuniHashIV || "",
        mode: cfg.payuniMode || "",
        archivedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      "config.payuniMerID": "",
      "config.payuniHashKey": "",
      "config.payuniHashIV": "",
      "config.payuniMode": ""
    };
    ops.push({ ref: doc.ref, update });
    affected++;
  }

  if (!dryRun) {
    for (const op of ops) await op.ref.update(op.update);
  }
  return { affected, skipped, dryRun };
});
```

> firestore.rules 必須擋下 `_legacyPayuni` 不能被 frontend 寫入。

#### 6.9 退款流程（**addendum §1.2 新增**，1.5 天）

新 collection `refundRequests/{refundId}`：
```
{
  refundId, orderId, teamId, compId, organizerUsername,
  requestedBy: 'organizer' | 'participant' | 'system',
  reason: string,
  amount: number,                  // 可部分退
  originalAmount: number,
  refundedSoFar: number,           // 累積已退（多次退款用）
  status: 'requested' | 'approved' | 'processing' | 'refunded' | 'rejected' | 'failed',
  approvedBy, refundedAt, payoutAdjustment, assignedTo
}
```

新 callable（4 個）：
- `requestRefund(teamId, amount, reason)` — 主辦方發起
- `approveRefund(refundId, action, note)` — system 審核 approve / reject
- `processRefund(refundId)` — 呼叫 PAYUNI Refund API + 撥款扣抵
- `listRefundRequests(status?)` — system 看列表

撥款連動規則：
- payout `pending` → 直接從待撥扣
- payout `paid` → 產生「負撥款」記錄抵下次（payoutAdjustment 為負）
- 部分退款：累積 `refundedSoFar`，cap = `originalAmount`，超過拒絕

主辦方 UI：報名單列「申請退款」按鈕 + 退款狀態追蹤 + 帳務記錄

system UI：refundRequests 列表 + 處理介面（assignedTo 防多人重複處理）

#### 6.10 PAYUNI Notify 失敗對帳 cron（**addendum §1.1 新增**，0.5 天）

```javascript
exports.reconcilePendingOrders = onSchedule({
  schedule: "every 30 minutes",
  timeZone: "Asia/Taipei"
}, async () => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  const snap = await db.collection("regOrders")
    .where("status", "==", "pending")
    .where("createdAt", "<", cutoff)
    .limit(50)
    .get();

  for (const doc of snap.docs) {
    const order = doc.data();
    const result = await queryPayuniOrder(order.orderId);   // PAYUNI Query Order API
    if (result.tradeStatus === "1") {
      await doc.ref.update({ status: "paid", paidAt: fmtNow() });
      await createPayoutFromOrder(order);
    } else if (result.tradeStatus === "0") {
      // 仍待付，跳過
    } else {
      await doc.ref.update({ status: "failed", reason: "payuni_query_not_found" });
    }
  }
});
```

system 手動對帳 UI（system-settings 加按鈕）：
- 列出 > 30 分鐘 pending 的 orders
- 一鍵「立即對帳」
- 顯示對帳結果

#### 6.11 自動撥款日 cron（**addendum 新增**，0.5 天）

```javascript
exports.runScheduledPayouts = onSchedule({
  schedule: "0 10 1,15 * *",   // 每月 1, 15 號 10:00
  timeZone: "Asia/Taipei"
}, async () => {
  const sales = (await db.collection("config").doc("salesConfig").get()).data();
  const minimum = sales.payoutMinimum || 1000;

  // 1. pending payouts 依 organizer 分組
  // 2. 每 organizer 加總 netAmount
  // 3. >= minimum：批次轉 'processing'，寄通知 system admin
  // 4. < minimum：保持 pending，累積；若 90 天未達 → 寄信給 organizer
  // 5. 寄通知 system admin：「N 個 organizer 待撥款，總額 NT$XXX」
});

exports.notifyUpcomingPayout = onSchedule({
  schedule: "0 9 * * *",
  timeZone: "Asia/Taipei"
}, async () => {
  const today = new Date();
  const dom = today.getDate();
  if (dom !== 14 && dom !== 30 && dom !== 31) return;
  // 寄信給所有有 pending payout >= NT$1000 的 organizer
});
```

> cron 只負責「批次標記為待處理」；**真實匯款是 system admin 手動操作銀行**。

**Phase 6 修改檔案**：
- [`functions/index.js`](functions/index.js)（重寫 createRegistrationPayment / payuniRegNotify + 14 個新 callable + 3 個 cron + migration）
- [`public/index.html`](public/index.html)（活動設定 04 改寫 + 我的撥款 + 退款 UI）
- [`public/system-settings.html`](public/system-settings.html)（4 個新 tab）
- [`firestore.rules`](firestore.rules)（payouts / refundRequests / `_legacyPayuni` 防寫）
- [`firestore.indexes.json`](firestore.indexes.json)（payouts / refundRequests 索引）

**Commit**：`phase 6: payuni platform consolidation + plan commission + payouts + refund + reconcile`

---

### Phase 7 — 帳戶設定 + 進階功能（6-7 天，比 v4 多 1 天，含 addendum 補強）

> [`public/account.html`](public/account.html) 新檔；拆 7a/7b/7c。

#### Phase 7a — 個人資料 / 通知偏好 / 危險區域（2 天）

> 與 v4 相同。`userProfiles` collection + 3 callable + `processPendingDeletions` cron（7 日冷卻）

#### Phase 7b — 2FA / TOTP（**addendum 補強**，2.5 天）

新 npm：`speakeasy` + `qrcode`（已 vendor）

5 callable：
- `setupTotp()` — 產 secret + QR
- `verifyTotp(code)` — 開啟 + 產 8 backup codes（hash 後存）
- `disableTotp(code)` — 關閉
- `loginCompleteTotp(tempToken, code)` — 登入完成
- **`loginCompleteWithBackupCode(tempToken, backupCode)`**（**addendum 新增**）— 用 backup code 登入：
  ```javascript
  // 1. 從 accounts.{username}.backupCodes 找 hash 匹配
  // 2. 標記該 backup code 為 used
  // 3. 完成登入
  // 4. 通知用戶「使用 backup code，剩餘 N 組」
  ```

speakeasy `verify` 用 `window: 2`（容忍 ±60s 時鐘偏移）

UI（`auth.html` `#otp-totp`）：
- 主流程：6 位 TOTP code
- 連結：「裝置不在身邊？使用備用碼」→ 切換 8 字元 backup code 輸入

**TOTP admin 救援**（**addendum 新增**）：
```javascript
exports.adminDisableUserTotp = authCallable(["system"], async ({ username, reason }, request) => {
  // 1. 寫 audit log（敏感操作必記）
  // 2. 移除 accounts.{username}.totpSecret + backupCodes
  // 3. 寄信給該 user：「您的 2FA 已被系統管理員關閉，原因：XXX」
});
```

system-settings「2FA 救援」工具：
- 輸入 user email / 帳號
- system 自己輸入自己的 2FA code 確認操作者身份
- 填理由
- 執行（即時生效）

> ⚠️ **TOTP secret 安全註記**：本次 plaintext 存於 accounts doc。**TODO v3**：用 GCP Secret Manager 或 KMS 加密落地。

#### Phase 7c — API key / 協作者 / LINE Notify（**addendum 補強**，1.5 天）

**API key**：3 callable（`generateApiKey` / `listApiKeys` / `revokeApiKey`）；secret SHA-256 hash 存；**只顯示一次**

API key 列表加 `lastUsedAt` + 「30 天未用」hint（addendum §4 #2）

**協作者邀請（含非帳號 email 流程，addendum §2-7c.1）**：

```javascript
exports.inviteCollaborator = compAuthCallable(async ({ email, role, compId }) => {
  // 1. 產 invite token (24h TTL)
  // 2. 落 collaboratorInvites/{token} doc：{ compId, role, email, expiresAt }
  // 3. 寄信，連結帶 token：
  //    https://regmaster-pro.web.app/auth.html?invite=TOKEN
});

exports.acceptCollaboration = callable(async ({ token }, request) => {
  // 1. 驗 token + expiresAt
  // 2. 已登入：直接建立 collaborators doc
  // 3. 未登入：回 { needSignup: true, prefillEmail: invite.email }
  //    → 前端跳 #signup 並帶 invite token
  // 4. signup 完成（completeSignup）callback 中若帶 invite token，自動建立 collaborators doc
});
```

修改 `compAuthCallable` middleware：除 `creator` 外，`collaborators[role]` 也允許讀寫（依 role）

**LINE Notify**（最簡單版）：
- `linkLineNotify(lineToken)` / `unlinkLineNotify`
- 內部用：寄推送時若 token 失效（401），自動 unlinkLineNotify + 寫 notification + email 通知用戶重綁（addendum §4 #3）

**Commit**：`phase 7a/7b/7c: account settings + 2FA + backup code + admin rescue + collaborators + LINE`

---

### Phase 8 — System-settings + Plans + Feedback（4-5 天，**addendum 升級為實際資料**）

#### 8.1 9 原 tab 套樣
用 design tokens 重整 CSS

#### 8.2 已建 tabs（Phase 6 帶入）
PAYUNI 商家 / 批次撥款 / 退款審核 / 對帳工具

#### 8.3 方案分級頁（**addendum §2-Phase 8.x 升級**）

**從純展示升級為「展示 + accounts.plan 寫入」**：
- `accounts.{username}.plan` 新欄位（已在 Phase 6.2 引入）
- 方案頁「升級」按鈕**不開放自助購買**
- 改為觸發業務聯繫流程

升級按鈕行為（addendum §2-Phase 8.y）：

| 方案 | 按鈕文案 | 行為 |
|---|---|---|
| 免費版（目前）| 「目前使用中」| disabled |
| Starter | 「升級至 Starter」| `mailto:sales@kuangtien.com.tw` 預填模板 |
| Pro | 「升級至 Pro →」| 同上 |
| Team | 「🔔 開放時通知我」| 收集 `interestedUsers/{email}` doc |

mailto 預填內容：
```
您好，我想升級至 Starter
活動類型：__
預估月報名數：__
聯絡電話：__
```

system role 在 system-settings「方案管理」tab 手動把該 user 的 plan 從 'free' 改 'starter' 等。

訂閱期 / 自動續費 / 取消訂閱 → V3。

#### 8.4 意見回饋
沿用 [`submitFeedback`](functions/index.js:3054)；UI 5 星評分 + 截圖 + 分類

**Commit**：`phase 8: system styling + plan-based account.plan + plan upgrade flow`

---

### Phase 9 — i18n 完整稽核（1 天，**addendum §2-Phase 9 擴大 grep**）

#### 9.1 4 條 grep 全跑
```bash
# 1. HTML inner text
grep -nP '>[一-鿿][^<]*<' public/*.html

# 2. JS string literals (排除 data-i 與註解)
grep -nP "['\"][一-鿿][^'\"]*['\"]" public/*.html | grep -v 'data-i=' | grep -v '//'

# 3. HTML attributes
grep -nP '(placeholder|title|alt|aria-label)="[一-鿿]' public/*.html

# 4. Template literals
grep -nP '`[^`]*[一-鿿][^`]*`' public/*.html
```

輸出 → [`_test/i18n-audit.txt`](_test/i18n-audit.txt) 逐項處理。

#### 9.2 Naming convention
[`_test/i18n-convention.md`](_test/i18n-convention.md)：
```
auth.login.email_label
dash.kpi.total
my.list.empty_state
account.security.totp_button
payment.method.bank_transfer
refund.status.processing
```

#### 9.3 EN 補齊 + AI 批量翻
全 zh key 都有 en 版；用 AI 批量翻譯後人工抽查（addendum §4 #4）

#### 9.4 驗收
`?lang=en` 跑端到端，**不應出現任何中文 UI 字串**（使用者輸入除外）。

**Commit**：`phase 9: i18n full audit (4-condition grep, zero hardcoded zh)`

---

### Phase 10 — RWD + 跨瀏覽器（2 天）

> 與 v4 相同。三檔 480/768/1024 + 4 瀏覽器 + 圖表 / 攝影機 / cert canvas 小螢幕 fallback。

報名 wizard step bar 480 px 太擠時改「Step 2 of 5」精簡顯示（addendum §4 #5）

**Commit**：`phase 10: RWD three breakpoints + cross-browser`

---

### Phase 11 — 最終 QA + 一次性上線（4-5 天）

#### 11.1 全站端到端跑 5 次
情境 A-E（同 v4）+ 新增情境 F：退款流程（部分退款 → 已撥 → 抵下次撥款）

#### 11.2 i18n / RWD / 跨瀏覽器（0.5 天）

#### 11.3 上線前 final checklist（**addendum §2-Phase 11 擴充**）

- [ ] [`public/js/emulator-config.js`](public/js/emulator-config.js) 在 `firebase.json hosting.ignore`
- [ ] `_emu_data/` / `_gcs_export/` 在 `.gitignore`
- [x] `serviceAccountKey.json` 在 `.gitignore`
- [ ] 沒有 `console.log("DEBUG")` 殘留
- [ ] PAYUNI 強制 production 已驗（grep `sandbox-` 全空）
- [ ] `firestore.rules` review（新 collection 都有 rule + `_legacyPayuni` 防寫）
- [ ] `firestore.indexes.json` review（所有新 query 都有 index）
- [ ] 跑 `migratePayuniToPlatform` 一次（emulator dry-run → production 正式）
- [ ] PAYUNI sandbox **已實際跑通 1 筆完整付款**（含 webhook 接收 + payout 建立）
- [ ] **Cloud Scheduler 已啟用** 6 個 cron：`runScheduledPayouts` / `notifyUpcomingPayout` / `reconcilePendingOrders` / `processPendingDeletions` / `checkDeadlines` / `checkLicenseExpirations`
- [ ] `mail` collection 寄信驗證（dev project 寄一封到測試信箱）
- [ ] `_legacyPayuni` 備份欄位確認寫入正常
- [ ] sample organizer 的 `accounts.plan` 有值（預設 'free'）
- [ ] commissionRates 4 階都正確 hardcode 進 salesConfig
- [ ] `[pdfkit / archiver / puppeteer-core / @sparticuz/chromium / speakeasy]` 都在 `functions/package.json`
- [ ] git tag `v1-final`
- [ ] 上線時間：**週日凌晨 2:00**

#### 11.4 一次性部署（詳見第 4 節 Runbook）

#### 11.5 D+1 ~ D+7 觀察
- `logClientError` < 2/hr
- `submitRegistration` 成功率 > 95%
- `loginAccount` 成功率 > 90%
- PAYUNI callback 失敗率 < 1%
- payout pending 件數每天清
- refund 處理時間 < 24h

**Commit**：`phase 11: e2e QA + final checklist`

---

## 4. 一次性上線 Runbook

### D-1（上線前一天）
```bash
gcloud config set project regmaster-pro
gcloud firestore export gs://regmaster-backup/pre-v2-launch-$(date +%Y%m%d)

gsutil -m cp -r gs://regmaster-backup/pre-v2-launch-XXXXXXXX ./_gcs_final
firebase use dev
firebase emulators:start --import=./_gcs_final
# 跑 _test/smoke.md 全 21 項

git checkout main
git tag v1-final
git push origin v1-final
```

### D-day（週日凌晨 2:00）
```bash
firebase use default   # = regmaster-pro

# 1. functions（含 puppeteer / chromium，~3-5 分鐘）
firebase deploy --only functions

# 2. firestore rules / indexes（等 indexes building 5-15 分鐘）
firebase deploy --only firestore:rules,firestore:indexes

# 3. 跑 PAYUNi migration
firebase functions:shell
# > migratePayuniToPlatform({ dryRun: true })   # 確認影響數
# > migratePayuniToPlatform({ dryRun: false })  # 正式跑

# 4. 部署 hosting（emulator-config.js 自動排除）
firebase deploy --only hosting

# 5. 立刻 incognito 跑 5+1 個情境腳本

# 6. 監控
firebase functions:log --tail
```

### Rollback（同 v4 三情境：hosting only / functions only / data restore）

PAYUNi 額外 rollback：寫一支臨時 `revertPayuniMigration` callable，從 `_legacyPayuni` 還原 `cfg.payuniMerID` 等欄位。

### D+1 ~ D+7
每天看 logs / payouts pending / refundRequests / feedback；每天 18:00-20:00 hotfix slot。

---

## 5. 向後相容

### 5.1 Firestore collection
**全部保留**：accounts / competitions / teams / members / licenses / orders / regOrders / scores / pdfChunks / posters / notifications / auditLogs / feedback / coupons / announcements / emailTemplates / visitors / accountRequests / config/* / mail / regPayments / feedbackFiles

**新增**：otps / participantOtps / userProfiles / certTemplates / apiKeys / collaborators / collaboratorInvites / **payouts** / **refundRequests** / rateLimits / interestedUsers / funnelEvents（v3 deferred）

### 5.2 Cloud Functions API
- 既有 97 個 callable 全保留
- 新增約 38 個（v4 33 + addendum 5：refund 4 + reconcile 1 + cron 2 + adminDisableUserTotp 1 + loginCompleteWithBackupCode 1，扣除重疊）

### 5.3 cfg 既有欄位
- `payuniMerID/HashKey/HashIV/Mode`：保留欄位（不刪 doc，僅清空 + 備份至 `_legacyPayuni`）

---

## 6. 風險（v5 補強）

| 風險 | 衝擊 | 機率 | 緩解 |
|---|---|---|---|
| **PAYUNi 平台帳號設錯** | 🔴 嚴重 | 低 | system-settings PAYUNi 商家設定加「測試 webhook」按鈕；上線前 dev 跑通 1 筆 |
| **既有活動 cfg PAYUNi 還在用 → 進錯帳戶** | 🔴 嚴重 | 中 | Phase 6.8 migration 強制清空；上線當天必跑；`_legacyPayuni` 可逆 |
| **PAYUNi webhook 失敗率高 → orders 卡 pending** | 🟡 中 | 中 | Phase 6.10 `reconcilePendingOrders` 每 30 分鐘對帳 + system 手動對帳工具 |
| **退款流程 race condition（多筆 partial refund）** | 🟡 中 | 低 | `refundedSoFar` 累積且 cap = `originalAmount`；用 transaction 處理 |
| **Puppeteer cold start 5+ 秒** | 🟡 中 | 高 | generateCertificates 獨立 Functions runtime（Gen2 + 2GB + 540s）；前端「最多 30 秒」提示 |
| **Members.email index building 中** | 🟡 中 | 中 | D-1 deploy index，等 building 完才上線 |
| **協作者中介層改 compAuthCallable 影響既有** | 🔴 嚴重 | 中 | 修改後跑全後台 smoke；creator 行為必 100% 同前 |
| **TOTP secret 明文存** | 🟡 中 | — | 文件記錄 known issue / TODO v3 |
| **TOTP 救援被濫用** | 🟡 中 | 低 | adminDisableUserTotp 必寫 audit log + 寄信給 user + system 自身 2FA 確認 |
| **LINE Notify token 過期** | 🟡 低 | 高 | 寄推送 catch 401 自動 unlink + 通知用戶重綁 |
| **dev/prod project 資料 drift** | 🟡 中 | 高 | 每 phase 重灌 production snapshot；Phase 11 用最新快照 |
| **OTP email bombing** | 🟡 中 | 中 | Phase 2 IP-based rate limit（5/分） + email-based（1/60秒）|

既有風險：海報/PDF 預覽 / `<style>body{}</style>` 注入 / 全域變數衝突 / Sidebar RWD — 沿用 v4 緩解。

---

## 7. v5 新增 Cloud Functions（最終清單）

```
Phase 2 (Auth):                       1 callable
  resendOtp(username, purpose)

Phase 3 (My):                          4 callable
  requestParticipantOtp / getMyRegistrations / getMyRegistrationDetail / resendRegistrationEmail

Phase 4 (Dashboard):                  10 callable
  getRecentActivity / getRegistrationFunnel / getRegistrationHeatmap / getSchoolRanking
  getUrgentItems / generateBadges / generateCertificates
  getCertTemplates / saveCertTemplate / deleteCertTemplate

Phase 5 (Settings):                    3 callable
  getCompetitionTemplates / getEventChecklist / getEventSettingsAISuggestions

Phase 6 (PAYUNi):                     14 callable + 3 cron
  Payouts:    getPayoutsByOrganizer / listAllPayouts / processPayout / getPayoutSummary
  Refund:     requestRefund / approveRefund / processRefund / listRefundRequests
  Migration:  migratePayuniToPlatform
  Reconcile:  reconcilePendingOrdersManual (system 手動觸發版)
  Admin:      manualReconcileOrder
  Helper:     queryPayuniOrder (內部) / payuniRefundCall (內部) [非 callable]
  Cron:       reconcilePendingOrders / runScheduledPayouts / notifyUpcomingPayout

Phase 7 (Account):                    18 callable
  Profile:    getUserProfile / updateUserProfile / requestAccountDeletion
  TOTP:       setupTotp / verifyTotp / disableTotp / loginCompleteTotp
              loginCompleteWithBackupCode / adminDisableUserTotp
  API key:    generateApiKey / listApiKeys / revokeApiKey
  Collab:     inviteCollaborator / acceptCollaboration / listCollaborators / removeCollaborator
  LINE:       linkLineNotify / unlinkLineNotify

Dev only:                              1 callable
  devTriggerCron(name)  // emulator only，production 守衛擋下
```

合計：**51 個新 callable + 3 個 cron**

---

## 8. v5 新增 npm 套件

```json
{
  "dependencies": {
    "pdfkit": "^0.14.0",
    "archiver": "^6.0.0",
    "puppeteer-core": "^21.0.0",
    "@sparticuz/chromium": "^120.0.0",
    "speakeasy": "^2.0.0"
  }
}
```

> **不引入** nodemailer（沿用 mail collection / Trigger Email Extension）

---

## 9. design tokens（同 v4 §10）

`--radius` 維持 16px 不動；其他依 v4 §10 表執行。

---

## 10. Git 策略

```
main                  ─ v1 production
└── v2-dev            ─ V2 開發主線（直接 commit，不開 phase branch）
    ├── tag: phase-0-done
    ├── tag: phase-1-done
    ├── ...
    └── tag: v2-rc1   ─ Phase 11 最終 candidate
        → merge to main
        → tag: v2.0.0
```

---

## 11. Cron 在 emulator 不跑的處理（**addendum §3 新增**）

emulator 不會自動觸發 onSchedule cron。提供 dev-only callable：

```javascript
exports.devTriggerCron = authCallable(["system"], async ({ name }) => {
  if (process.env.FUNCTIONS_EMULATOR !== "true") {
    return { success: false, message: "production blocked" };
  }
  // cron 邏輯抽成 inner function 共用
  switch (name) {
    case "runScheduledPayouts":      return await _innerRunScheduledPayouts();
    case "reconcilePendingOrders":   return await _innerReconcilePending();
    case "processPendingDeletions":  return await _innerProcessDeletions();
    case "notifyUpcomingPayout":     return await _innerNotifyPayout();
    case "checkDeadlines":           return await _innerCheckDeadlines();
    case "checkLicenseExpirations":  return await _innerCheckLicenseExpirations();
    default: return { success: false, message: "unknown cron" };
  }
});
```

system-settings dev-only tab「Cron 手動觸發」（用 `process.env.FUNCTIONS_EMULATOR` 判斷顯示）：列表 + 每個 cron 一個按鈕「立即執行」+ 顯示執行結果。

---

## 12. 動工前 checklist（最終版）

- [x] 6 大決策 + PAYUNi 平台統收 + 進階功能拍板
- [x] 手續費（plan-based）+ 撥款週期 + 最低門檻拍板
- [x] 還原點與備份建立（`_backup/2026-05-05_pre-redesign/` + tag `v1-pre-redesign`）
- [x] `.gitignore` 強化（serviceAccountKey.json + firestore-debug.log + _backup/）
- [ ] Java JDK 11+ 已裝
- [ ] gcloud CLI 已裝
- [ ] 申請 `regmaster-pro-dev` Firebase project
- [ ] 練習 `firebase use --add` 切換
- [ ] 取得 PAYUNi 平台 sandbox merchant ID（dev 用）
- [ ] 確認 PAYUNi production merchant ID（Kuang-Tien 商號）
- [ ] **取得 PAYUNI Query Order API 規格**（Phase 6.10 對帳用）
- [ ] **取得 PAYUNI Refund API 規格**（Phase 6.9 退款用）
- [ ] 確認 Cloud Scheduler 在 production 已啟用
- [ ] 確認 `mail` collection + Trigger Email Extension 在 dev project 也已部署
- [ ] 確認 LINE Notify 申請流程
- [ ] 確認 sales 業務 email：**sales@kuangtien.com.tw**（或您指定的）
- [ ] 確認業務升級 mailto 預填模板文字
- [ ] confirm v5 計畫，下指令進入 Phase 0

---

## 13. 工時里程碑

| Phase | 天 | 累計 |
|---|---|---|
| 0 — 基礎建設（含 DR 演練）| 4-5 | 1 週 |
| 1 — 公開頁面 | 4-5 | 2 週 |
| 2 — Auth（沿用 OTP + IP rate limit）| 4-5 | 3 週 |
| 3 — 報名者個人中心 | 5-6 | 4 週 |
| 4 — Sidebar + Dashboard + 證書 | 10-14 | 6.5 週 |
| 5 — 活動設定 + 模板 wizard | 8-10 | 8 週 |
| **6 — PAYUNI 平台統收（含對帳 / 退款 / 撥款 cron）** | **7-9** | **9.5 週** |
| 7 — 帳戶設定（2FA + backup + 救援 + 協作 + LINE）| 6-7 | 10.5 週 |
| 8 — System + Plans (accounts.plan) + Feedback | 4-5 | 11.5 週 |
| 9 — i18n 4-grep 稽核 | 1 | 11.7 週 |
| 10 — RWD + 跨瀏覽器 | 2 | 12 週 |
| 11 — 最終 QA + 上線 | 4-5 | 12.5 週 |

**估計**：**12-13 週**（solo dev，含 buffer）

---

## 14. 結語

V5 = V4 主檔 + Addendum 修正 + 商業決策拍板。

**完整變更**：
- 程式碼乾淨（no V2/V1 並存 if-branch）
- PAYUNi 商業模式清晰（plan-based 手續費 + 自動撥款 + 完整退款 + 對帳 + 救援機制）
- 進階帳戶補齊（2FA + backup code + admin 救援 + 協作邀請含 signup 流程）
- emulator 完整可測（含 cron 手動觸發）

**動工順序建議**：
1. Phase 0：基礎建設（不影響任何既有功能）
2. Phase 1-5：UI 重構（風險低，每 phase 可獨立驗證）
3. **Phase 6：PAYUNI 變更（核心業務變更，最謹慎）**
4. Phase 7-11：補齊功能 + QA + 上線

**起手式**：Phase 0.1 安裝 JDK 11 + 申請 regmaster-pro-dev project + emulator 跑通。

— END v5 —
