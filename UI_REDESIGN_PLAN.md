# RegMaster v2 升級計畫書 — v6（嚴格審閱版）

> **版本**：v6（整合 v5 + P0/P1/P2 全部修正）
> **日期**：2026-05-06
> **公司**：Kuang-Tien International CO., Ltd.
> **策略**：Localhost-first emulator 全程開發 → 一次性 production 上線

---

## 0. v6 與 v5 差異一覽

| # | 級別 | 項目 | v5 狀態 | v6 修正 |
|---|---|---|---|---|
| P0-1 | 🔴 嚴重 | `_argMap` 同步 | 完全沒提 | 每 Phase 修改檔案清單**強制加 `_argMap`** + Phase 11.3 加 grep 對應檢查 |
| P0-2 | 🔴 嚴重 | emulator-config.js 404 | 靜態 `<script>` tag | **動態 inject**（只在 localhost 才注入） |
| P0-3 | 🔴 嚴重 | rateLimits race + window bug | read-then-write + 重設 windowStart | **transaction + window 過期才重設** + Firestore TTL policy 註記 |
| P0-4 | 🔴 嚴重 | 證書 PDF 中文字型 | 完全沒提 | Phase 4c 加**字型打包**章節（Noto Sans TC base64 inline） |
| P0-5 | 🔴 嚴重 | 退款 commission 處理 | 沒拍板 | **拍板方案 C**：退全額 + 主辦方下次撥款扣全額（不退 commission） |
| P0-6 | 🔴 嚴重 | D-day deploy 順序 | functions 先 / hosting 中段 | **重排**：indexes 先（等 building） → rules → functions → migration → hosting |
| P0-7 | 🔴 嚴重 | scoringCategories 介面 | 沿用單筆 saveScore | 補 `saveBatchScores` callable |
| P1-1 | 🟡 重要 | refund partial transaction | 描述「cap」但無 atomic | processRefund 內用 `db.runTransaction` |
| P1-2 | 🟡 重要 | 報名者退款入口 | 列舉 'participant' 但無 callable | **方案 A**：V2 不做自助退款，my.html 顯示「聯繫主辦方」 |
| P1-3 | 🟡 重要 | collaborator middleware test | manual smoke | 補 `_test/middleware.test.js`（4 角色 × 5 callable） |
| P1-4 | 🟡 重要 | dev PAYUNi 商號污染 | 沒處理 | §0.5 import 後立刻覆寫 salesConfig 為 sandbox |
| P1-5 | 🟡 重要 | dev 寄信誤觸 production user | 沒處理 | dev project 不部署 Trigger Email Extension |
| P2-1~15 | 🟢 小幅 | 15 項小修補 | 散落 | §13 集中列表 |

---

## 1. v6 拍板決議（最終版）

### 1.1 基本決策
| # | 議題 | 決定 |
|---|---|---|
| 1 | 字級 | 19px，三檔 RWD（≤1024 / ≤768 / ≤480）|
| 2 | 報名 wizard | 保留 5 步 |
| 3 | Dashboard 漏斗 / 熱點 / 排行 | 都做；funnel 第一版 3 階段 |
| 4 | system-settings.html | 一併套樣 + 4 個新 tab（PAYUNI 商家 / 撥款 / 對帳 / 退款）|
| 5 | i18n | 全 UI 中英可切；Phase 9 4-grep 稽核 |
| 6 | Logo | 沿用 `favicon.png` |
| 7 | 部署 | localhost 全程；最後一次 deploy |
| 8 | 安全 | 還原點與備份已建（[`_backup/2026-05-05_pre-redesign/`](_backup/2026-05-05_pre-redesign/) + tag `v1-pre-redesign`）|
| 9 | 進階帳戶 | 2FA / API key / 協作 / LINE / 自助刪除全做 |
| 10 | PAYUNI | 取消每活動自接，全站走平台單一商號，強制 production |

### 1.2 商業決策

**手續費（plan-based）**：

| 主辦方方案 | 啟用金流時 | 不啟用金流 |
|---|---|---|
| 免費版 Free | **3%** | 0% |
| 入門版 Starter | 1% | 0% |
| 專業版 Pro | 0.5% | 0% |
| 團隊版 Team | 0.3% | 0% |

**撥款週期**：每月 1 / 15 日 10:00 自動標記 + 14/30/31 日寄信通知 + system 手動匯款後標記 paid。

**最低門檻**：NT$1,000；低於累積；90 天未達寄信詢問。

**退款政策（v6 P0-5 拍板，方案 C）**：

報名者要求退款時，`processRefund` 行為：
- ✅ PAYUNI Refund API 退**完整 grossAmount** 給原信用卡
- ✅ 主辦方下次撥款 `payoutAdjustment = -grossAmount`（**不是 -netAmount**）
- ❌ commission **不退還**主辦方（活動辦不成主辦方吸收）
- ✅ 平台從本筆 commission 中收取手續費（業界標準）

**範例**：報名費 NT$1,000 → commission NT$30（Free）/ netAmount NT$970 → 主辦方原本可拿 NT$970。退款後：
- 報名者拿回 NT$1,000
- 主辦方下次撥款扣 NT$1,000（淨損 NT$1,000，commission 已支付不退）
- 平台保留 NT$30 commission

寫進 [`public/EULA.html`](public/EULA.html) 退費條款明示，避免事後爭議。

---

## 2. PAYUNI 架構（v6）

### 2.1 流程圖

```
┌─────────────────────────────────────────────────────────────┐
│  Platform PAYUNI（唯一商號，Kuang-Tien 擁有）              │
│  → 授權碼購買 ✅（沿用 salesConfig）                        │
│  → 報名費收款 ✅（強制 production）                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼ 報名者付款（含 plan-based 手續費）
┌──────────────────────────────────────────────┐
│  regOrders collection                        │
│  + grossAmount / commission / netAmount      │
│  + organizerUsername / organizerPlan         │
│  + status: pending / paid / refunded         │
└──────────────────┬───────────────────────────┘
                   │
                   ├─ webhook 失敗 → reconcilePendingOrders cron 補救
                   │
                   ▼ 1 / 15 號 cron 自動結算
┌──────────────────────────────────────────────┐
│  payouts collection                          │
│  → 達 NT$1,000 才產生 pending payout         │
│  → system 手動匯款後標記 paid                 │
│  → 退款時 payoutAdjustment（負值）抵扣        │
└──────────────────────────────────────────────┘
                   │
                   ▼ 退款（主辦方發起 / system 介入）
┌──────────────────────────────────────────────┐
│  refundRequests collection                   │
│  → PAYUNI Refund API 退全額                  │
│  → 主辦方撥款扣全額（commission 不退）        │
└──────────────────────────────────────────────┘
```

### 2.2 主辦方 / system 體驗（同 v5 §2.2 / §2.3）

---

## 3. 執行階段（共 11 個 Phase，估 13-14 週）

### Phase 0 — 基礎建設（4-5 天）

#### 0.1 環境工具
- [x] Node.js 20+ / Firebase CLI
- [ ] **Java JDK 11+**（emulator 必需）
- [ ] **gcloud CLI**

#### 0.2 雙 project 設置
```bash
firebase projects:create regmaster-pro-dev
firebase use --add   # alias dev / default
firebase use dev
```
> ⚠️ dev 用 PAYUNI sandbox merchant；production 用正式 Kuang-Tien 商號（**絕不 sync**）

#### 0.3 emulator 啟動
- [x] [`firebase.json:21-29`](firebase.json:21) emulators 已設好（hosting:5000, functions:5001, firestore:**8085**, auth:9099, ui:4000）
- [ ] npm script：`"emu": "firebase emulators:start --import=./_emu_data --export-on-exit"`

#### 0.4 emulator detection（**P0-2 修正：動態 inject**）

放在 [`public/js/emulator-config.js`](public/js/emulator-config.js)（內容同 v5）：
```javascript
(function(){
  if (typeof firebase === "undefined") return;
  try {
    firebase.functions().useEmulator("localhost", 5001);
    firebase.firestore().useEmulator("localhost", 8085);
    firebase.auth().useEmulator("http://localhost:9099");
    console.log("[RegMaster] Connected to local emulators");
  } catch(e){ console.warn("[RegMaster] emulator hook failed:", e); }
})();
```

**[`public/index.html`](public/index.html) Firebase init 之後動態 inject**：
```html
<!-- 緊接 firebase init 之後 -->
<script>
  (function(){
    var h = location.hostname;
    if (h === "localhost" || h === "127.0.0.1") {
      var s = document.createElement("script");
      s.src = "/js/emulator-config.js";
      document.head.appendChild(s);
    }
  })();
</script>
```

[`firebase.json`](firebase.json) hosting.ignore：
```json
"hosting": {
  "public": "public",
  "ignore": ["firebase.json", "**/.*", "**/node_modules/**", "**/js/emulator-config.js"]
}
```

> **效果**：production 完全不會發出 `/js/emulator-config.js` request → 0 個 404。emulator 自動載入。

#### 0.5 生產資料快照匯入 + **PAYUNi 商號淨化**（P1-4 修正）

```bash
gcloud config set project regmaster-pro
gcloud firestore export gs://regmaster-backup/baseline-v1-$(date +%Y%m%d)
gsutil -m cp -r gs://regmaster-backup/baseline-v1-XXXXXXXX ./_gcs_export
firebase use dev
firebase emulators:start --import=./_gcs_export --export-on-exit=./_emu_data
```

**Import 後立刻在 emulator UI Firestore tab 覆寫** `config/salesConfig`：
```
payuniMerID:    "S_SANDBOX_MERCHANT_ID"   (PAYUNi sandbox)
payuniHashKey:  "...sandbox key..."
payuniHashIV:   "...sandbox iv..."
```

或寫成 dev 自動腳本 [`_dev/sanitize-imported-data.sh`](_dev/sanitize-imported-data.sh)：
```bash
#!/bin/bash
# emulator REST API 直接覆寫
curl -X PATCH "http://localhost:8085/v1/projects/regmaster-pro-dev/databases/(default)/documents/config/salesConfig" \
  -H "Content-Type: application/json" \
  -d '{"fields":{"payuniMerID":{"stringValue":"S_SANDBOX_ID"},...}}'
```

寫進 [`_test/disaster-recovery.md`](_test/disaster-recovery.md) 為 import 後**強制例行步驟**。

**Backup-restore 演練**：
1. dev project export → cp → emulator import 一次
2. **Sanitize PAYUNi credentials**（必做）
3. emulator 中操作幾筆資料
4. `firebase emulators:export` 倒回 dev project
5. 確認資料完好

#### 0.6 design tokens
- 新增 [`public/shared.css`](public/shared.css)（zip + base font 19px + spacing × 1.357）
- 新增 [`public/css/legacy-shim.css`](public/css/legacy-shim.css)
- `--radius` 維持 16px

#### 0.7 RM 命名空間
```javascript
window.RM = window.RM || {
  core: {}, evtSet: {}, dash: {}, auth: {},
  my: {}, tools: {}, payment: {}, refund: {}
};
```

#### 0.8 lint / format hook
husky + lint-staged + eslint + prettier；pre-commit 跑 lint check on staged

#### 0.9 dev project 寄信防誤觸（**P1-5 修正**）

⚠️ **不在 `regmaster-pro-dev` 部署 Firebase Trigger Email Extension**。

開發中寄信路徑：
- emulator 寫入 `mail` collection → **不會真寄**（沒 extension 處理）
- 在 emulator UI Firestore tab 直接看 `mail` collection 內容驗證寄信邏輯
- 若需驗證 SMTP 真寄：本機跑 Mailhog（`docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog`），dev script 走 Mailhog SMTP

production：`regmaster-pro` 已部署 Trigger Email Extension（既有）

#### 0.10 _test/ 文件建立
- [`_test/smoke.md`](_test/smoke.md)
- [`_test/migration-checklist.md`](_test/migration-checklist.md)
- [`_test/disaster-recovery.md`](_test/disaster-recovery.md)
- [`_test/i18n-convention.md`](_test/i18n-convention.md)
- [`_test/middleware.test.js`](_test/middleware.test.js)（Phase 7c 用，先建空檔）

**Phase 0 驗收**：emulator 跑通 + tokens 都有值 + husky 擋 lint + smoke 全綠 + DR 演練成功 + dev sanitize 成功

**修改檔案**：[`firebase.json`](firebase.json) / [`.gitignore`](.gitignore) / [`.firebaserc`](.firebaserc) / [`public/index.html`](public/index.html)（含動態 inject）/ [`public/shared.css`](public/shared.css)（新）/ [`public/css/legacy-shim.css`](public/css/legacy-shim.css)（新）/ [`public/js/emulator-config.js`](public/js/emulator-config.js)（新）/ [`_dev/sanitize-imported-data.sh`](_dev/sanitize-imported-data.sh)（新）/ [`.eslintrc.js`](.eslintrc.js)（新）/ [`_test/`](_test/)（新目錄）

**Commit**：`phase 0: emulator + tokens + RM ns + lint + DR drill + dev sanitization`

---

### Phase 1 — 公開頁面（4-5 天）

> 同 v5。重點：[`_showInModal`](public/index.html:6174) / [`_toBlobUrl`](public/index.html:6191) 加 DO NOT DELETE 註解。

**修改檔案**：[`public/index.html`](public/index.html) — **CSS + v-home/v-comp/v-form HTML + showRegForm()**

**Commit**：`phase 1: redesign hub + competition + wizard 5-step visuals`

---

### Phase 2 — Auth 現代化（4-5 天）

#### 2.1 [`public/auth.html`](public/auth.html) 6 sub-page
`#login` / `#signup` / `#otp` / `#forgot` / `#reset` / `#eula`（4 tab）

**`#login` 對 2FA 用戶處理（P2-10 修正）**：
```javascript
// loginAccount 成功後
if (res.requiresTotp) {
  // 跳 #otp-totp，前端持 res.tempToken
  // 6 位 TOTP 或 backup code 完成登入
}
```

#### 2.2 沿用既有 OTP 後端 + 新增 1 個
- 註冊 → [`requestAccount`](functions/index.js:833)
- 驗證 → [`verifyAccount`](functions/index.js:933)
- 忘記密碼 → [`resetAdminPassword`](functions/index.js:873)
- 一般登入 → [`loginAccount`](functions/index.js:155)
- 新增 `resendOtp(username, purpose)`

**修改 [`loginAccount`](functions/index.js:155)**：若帳號有 `totpSecret`，回 `{ requiresTotp: true, tempToken }` 而非完成登入。

#### 2.3 OTP rate limiting（**P0-3 修正：transaction**）

新 collection `rateLimits/{key}`：

```javascript
async function checkOtpRateLimit(email, ip) {
  const ipKey = "otp_ip_" + (ip || "unknown").replace(/[^\w]/g, "_");
  const ipRef = db.collection("rateLimits").doc(ipKey);

  return await db.runTransaction(async (t) => {
    const doc = await t.get(ipRef);
    const now = Date.now();
    let count = 1, windowStart = now;

    if (doc.exists) {
      const d = doc.data();
      if (now - d.windowStart < 60000) {
        // 仍在 window 內
        if (d.count >= 5) {
          return { ok: false, msg: "請求過於頻繁，請稍後再試" };
        }
        count = d.count + 1;
        windowStart = d.windowStart;  // ⚠️ 不重設！
      }
      // else: window 已過期，count/windowStart 取新值
    }

    t.set(ipRef, { count, windowStart, lastSeen: now });
    return { ok: true };
  });
}
```

**Email-based rate limit** 同樣改 transaction 形式（key 用 `otp_email_<email>`，window 60s 限 1 次）。

> ⚠️ Cloud Functions callable 取 IP：v2 用 `request.rawRequest.ip`；v1 用 `context.rawRequest.ip`。functions/index.js 大多 v2 → 用 `request.rawRequest.ip`。

**Firestore TTL policy 設定**（emulator 不支援，需在 Production Firebase Console 手動）：
1. Firestore → TTL → Add policy
2. Collection: `rateLimits`
3. Field: `lastSeen`
4. TTL: 1 hour

寫進 [`_test/migration-checklist.md`](_test/migration-checklist.md)，上線前手動到 Console 設定。

#### 2.4 寄信
沿用 `db.collection("mail")` + Firebase Trigger Email Extension（**production only**）。dev 不寄。

#### 2.5 密碼強度（純前端）4 段條
8+ / 含字母 / 含數字 / 含符號 / 12+

#### 2.6 修改 [`index.html`](public/index.html)
移除 5 modal；topbar 連 `/auth.html#login`

**修改檔案**：
- [`public/auth.html`](public/auth.html)（新 ~700 行）
- [`public/index.html`](public/index.html) — **含 _argMap 加 1 行**：`resendOtp:["username","purpose"]`
- [`functions/index.js`](functions/index.js)（+1 callable + 改 loginAccount 支援 TOTP gate）
- [`firestore.rules`](firestore.rules)（rateLimits 規則）

**Commit**：`phase 2: auth dedicated page + EULA 4-tab + transaction rate limit`

---

### Phase 3 — 報名者個人中心（5-6 天）

> 同 v5。重點：members.email index + sessionStorage 跳轉 + my.html 顯示主辦方 email（P1-2 取代自助退款）

#### 3.x 退款說明（**P1-2 修正：方案 A**）

my.html 詳情頁加說明卡：
```html
<div class="info-banner">
  <b>需要退款？</b>
  本次活動主辦方：<b>{compConfig.organizerDisplayName}</b><br>
  聯絡 Email：<a href="mailto:{compConfig.contactEmail}">{compConfig.contactEmail}</a><br>
  <small>請依退款政策直接聯繫主辦方處理。</small>
</div>
```

報名者**不能在 V2 自助發起退款**；以避免身份冒用爭議。

新 callable（4 個）：`requestParticipantOtp` / `getMyRegistrations` / `getMyRegistrationDetail` / `resendRegistrationEmail`

**修改檔案**：
- [`public/my.html`](public/my.html)（新 ~900 行）
- [`public/index.html`](public/index.html) — **_argMap + 4 行**：
  ```javascript
  requestParticipantOtp:["email"],
  getMyRegistrations:["email","otpCode"],
  getMyRegistrationDetail:["teamId","otpToken"],
  resendRegistrationEmail:["teamId","otpToken"],
  ```
- [`functions/index.js`](functions/index.js)（+4 callable）
- [`firestore.indexes.json`](firestore.indexes.json)（+1 index `members(email, compId)`）
- [`firestore.rules`](firestore.rules)（participantOtps）

**Commit**：`phase 3: participant my-page + members.email index`

---

### Phase 4 — Admin Sidebar + Dashboard（**11-15 天**，比 v5 多 1 天，含 P0-4 + P0-7）

#### Phase 4a — Sidebar（2 天）
> 同 v5。

#### Phase 4b — Dashboard hero + 6 vertical tabs 骨架（3-4 天）
> 同 v5。

#### Phase 4c — 元件補完 + 評分 + 證書（**6-9 天**，比 v5 多 1 天）

##### 4c.1 KPI / 趨勢 / 進度條 / urg-card / act-list / 最近報名 / funnel(3-stage) / heatmap

5 個新 callable：`getRecentActivity` / `getRegistrationFunnel` / `getRegistrationHeatmap` / `getSchoolRanking` / `getUrgentItems`

##### 4c.2 評分介面（**P0-7 修正：batch API**）

`cfg.scoringCategories` schema：`[{name, max, weight?}]`，read fallback `[{name:'總分', max:100}]`

**新增 batch callable**：
```javascript
exports.saveBatchScores = compAuthCallable(async ({ compId, teamId, scores, user }) => {
  // scores = [{item, score, rank, comment}]
  // 用 Firestore batch write 寫 N 筆
  const batch = db.batch();
  for (const s of scores) {
    const q = db.collection("scores")
      .where("compId", "==", compId)
      .where("teamId", "==", teamId)
      .where("item", "==", s.item).limit(1);
    const snap = await q.get();
    const ref = snap.empty ? db.collection("scores").doc() : snap.docs[0].ref;
    batch.set(ref, {
      compId, teamId, item: s.item,
      score: s.score, rank: s.rank || "", comment: s.comment || "",
      user, time: fmtNow()
    }, { merge: true });
  }
  await batch.commit();
  return { success: true, savedCount: scores.length };
});
```

**保留** [`saveScore`](functions/index.js:1484) 單筆（向後相容）；新介面 UX：使用者按「儲存」才打 `saveBatchScores`。

##### 4c.3 名牌 / 證書 PDF（**P0-4 修正：中文字型**）

新 npm：`pdfkit` / `archiver` / `puppeteer-core` / `@sparticuz/chromium`

**字型方案（P0-4，選項一：打包）**：

```
functions/
├── fonts/
│   ├── NotoSansTC-Regular.ttf   (~12 MB，subset 後 ~3 MB)
│   ├── NotoSansTC-Bold.ttf
│   └── README.md                 (字型來源 + 授權)
└── certificates/
    ├── badge-template.html        (puppeteer 用)
    └── cert-template.html
```

從 [Google Fonts Noto Sans TC](https://fonts.google.com/noto/specimen/Noto+Sans+TC) 下載 ttf（OFL 授權，可商用）。

**Subset 縮小**（避免 functions image 增加 30+ MB）：
```bash
# pyftsubset 從 fonttools；只保留中文常用 + Latin
pyftsubset NotoSansTC-Regular.ttf \
  --output-file=NotoSansTC-Regular.subset.ttf \
  --unicodes="U+0020-007F,U+4E00-9FFF,U+3000-303F,U+FF00-FFEF" \
  --layout-features='*' --no-hinting
```

**HTML template 內 inline @font-face**：
```javascript
const fs = require('fs');
const fontRegular = fs.readFileSync('./fonts/NotoSansTC-Regular.subset.ttf').toString('base64');
const fontBold = fs.readFileSync('./fonts/NotoSansTC-Bold.subset.ttf').toString('base64');

function buildCertHtml(data) {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head><meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Noto Sans TC';
    src: url('data:font/ttf;base64,${fontRegular}') format('truetype');
    font-weight: 400;
  }
  @font-face {
    font-family: 'Noto Sans TC';
    src: url('data:font/ttf;base64,${fontBold}') format('truetype');
    font-weight: 700;
  }
  body { font-family: 'Noto Sans TC', serif; }
  .recipient { font-size: 32px; font-weight: 700; }
  /* ... 其他樣式 ... */
</style></head>
<body>
  <h1>獲 獎 證 書</h1>
  <div class="recipient">${data.recipientName}</div>
  <p>於 ${data.eventName} 獲得 ${data.rankZh}，特此證明。</p>
</body></html>`;
}
```

> 預期 functions image 增加 ~6-8 MB（subset 後 2 個 ttf）。Cold start 影響可控。

**generateCertificates** 用 puppeteer-core + chromium（獨立 region/runtime config 2GB / 540s），`generateBadges` 用 pdfkit（簡單 layout，1-2s 完成）。

5 個新 callable：`getCertTemplates` / `saveCertTemplate` / `deleteCertTemplate` / `generateBadges` / `generateCertificates`

##### 4c.4 Functions image 隔離

`generateCertificates` 含 chromium 280MB，會拖累 cold start。建議拆獨立 runtime：

```
functions/
├── index.js              (主 entry，含絕大多數 callable)
├── certs/
│   ├── index.js          (cert callable 獨立 entry)
│   ├── package.json      (chromium / puppeteer-core only)
│   └── fonts/, certificates/
```

deploy 時 `firebase deploy --only functions:certs`（如果 firebase 支援多 entry）；否則沿用單一 entry 但接受 cold start 影響。**建議第一版仍走單一 entry，視效能再拆**。

**修改檔案**：
- [`public/index.html`](public/index.html) — **_argMap + 11 行**：
  ```javascript
  getRecentActivity:["compId"],
  getRegistrationFunnel:["compId"],
  getRegistrationHeatmap:["compId"],
  getSchoolRanking:["compId"],
  getUrgentItems:["compId"],
  saveBatchScores:["compId","teamId","scores","user"],
  generateBadges:["compId","template","teamIds"],
  generateCertificates:["compId","template","teamIds"],
  getCertTemplates:["compId"],
  saveCertTemplate:["compId","template"],
  deleteCertTemplate:["compId","templateId"],
  ```
- [`functions/index.js`](functions/index.js)（+11 callable）
- [`functions/package.json`](functions/package.json)（+pdfkit / archiver / puppeteer-core / @sparticuz/chromium）
- [`functions/fonts/`](functions/fonts/)（新）
- [`functions/certificates/`](functions/certificates/)（新）
- [`firestore.indexes.json`](firestore.indexes.json)（+ `members(school, compId)`）
- [`firestore.rules`](firestore.rules)（certTemplates）

**Commit**：`phase 4a/4b/4c: admin sidebar + dashboard + batch scoring + cert PDF with NotoSansTC`

---

### Phase 5 — 活動設定 6-Tab + 模板 Wizard（8-10 天）

> 同 v5。

**修改檔案**：
- [`public/index.html`](public/index.html) — **_argMap + 3 行**：
  ```javascript
  getCompetitionTemplates:[],
  getEventChecklist:["compId"],
  getEventSettingsAISuggestions:["compId"],
  ```
- [`functions/index.js`](functions/index.js)（+3 callable）

**Commit**：`phase 5a/5b/5c: event settings 6-tab + sidebar + template wizard`

---

### Phase 6 — PAYUNI 平台統收（**8-10 天**，比 v5 多 1 天，含 P1-1 transaction）

#### 6.1 後端：廢除每活動 PAYUNI（1 天）
> 同 v5

#### 6.2 後端：plan-based commission（1 天）
> 同 v5

#### 6.3 後端：payouts collection（1 天）

`payouts/{payoutId}` schema 加 `createdAt` / `updatedAt`（**P2-1 修正**）：
```
{
  payoutId, orderId, compId, organizerUsername,
  grossAmount, commission, netAmount,
  status: 'pending'|'processing'|'paid'|'failed',
  bankAccount: { bank, accountName, accountNo },
  scheduledAt, paidAt, failureReason, processedBy,
  payoutAdjustment: number,
  createdAt: serverTimestamp,
  updatedAt: serverTimestamp
}
```

4 callable：`getPayoutsByOrganizer` / `listAllPayouts` / `processPayout` / `getPayoutSummary`

#### 6.4 前端：活動設定 04 tab 改寫（0.5 天）
> 同 v5

#### 6.5 主辦方「我的撥款」UX（1 天）
> 同 v5 + 月底 corner case helper（**P2-2 修正**）：

```javascript
function getNextPayoutDate() {
  const now = new Date();
  const day = now.getDate();
  const candidate = day < 1 ? 1 : (day < 15 ? 15 : null);
  let next;
  if (candidate === 1) {
    next = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (candidate === 15) {
    next = new Date(now.getFullYear(), now.getMonth(), 15);
  } else {
    // > 15 號，下次是下月 1 號
    next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  const daysUntil = Math.ceil((next - now) / (1000 * 60 * 60 * 24));
  return { date: next, daysUntil };
}
```

#### 6.6 system「PAYUNI 商家設定」tab（0.5 天）
> 同 v5

#### 6.7 system「批次撥款處理」tab（0.5 天）

累積撥款設計（**P2-13 拍板**）：
- **保持多 doc**（每筆 order 一個 payout doc）；不合併
- system 全選後一鍵批次處理
- 同一 organizer 多筆撥款 = 1 次匯款動作（system 自己加總）

#### 6.8 一次性 migration 加 backup（0.5 天）

**P2-7 補：firestore.rules 範例**：
```
match /competitions/{compId} {
  allow read: if isAuth();
  allow write: if isOwnerOrCollab() &&
    !request.resource.data.diff(resource.data).affectedKeys().hasAny(['_legacyPayuni']);
}
```

> migration 由 functions 寫入（admin SDK 繞過 rules）；frontend 永遠不能寫 `_legacyPayuni`。

#### 6.9 退款流程（**P0-5 + P1-1 修正**，1.5 天）

`refundRequests/{refundId}` schema 加 `createdAt` / `updatedAt` / `assignedTo`：

```
{
  refundId, orderId, teamId, compId, organizerUsername,
  requestedBy: 'organizer' | 'system',     // ⚠️ 'participant' 移除（V2 不做自助）
  reason, amount, originalAmount, refundedSoFar,
  status: 'requested'|'approved'|'processing'|'refunded'|'rejected'|'failed',
  approvedBy, refundedAt, payoutAdjustment, assignedTo,
  createdAt, updatedAt
}
```

**`processRefund` 用 transaction（P1-1）**：
```javascript
exports.processRefund = authCallable(["system"], async ({ refundId }, request) => {
  return await db.runTransaction(async (t) => {
    const refundRef = db.collection("refundRequests").doc(refundId);
    const refundDoc = await t.get(refundRef);
    if (!refundDoc.exists) throw new Error("退款請求不存在");
    const refund = refundDoc.data();
    if (refund.status !== "approved") throw new Error("狀態錯誤");

    const orderRef = db.collection("regOrders").doc(refund.orderId);
    const orderDoc = await t.get(orderRef);
    const order = orderDoc.data();

    // P0-5 方案 C：cap 用 grossAmount（不是 netAmount）
    const newRefundedTotal = (order.refundedSoFar || 0) + refund.amount;
    if (newRefundedTotal > order.grossAmount) {
      throw new Error("退款累積超過原訂單金額");
    }

    // 1. 呼叫 PAYUNI Refund API（事務外，因為是 HTTP；但失敗時 status='failed'）
    // 2. transaction 內更新狀態與 payouts
    t.update(refundRef, {
      status: "refunded",
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      payoutAdjustment: -refund.amount,   // P0-5 方案 C: 主辦方扣全額
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    t.update(orderRef, {
      refundedSoFar: newRefundedTotal,
      status: newRefundedTotal === order.grossAmount ? "refunded" : "partial_refund"
    });

    // 建立負撥款記錄（抵扣下次）
    const adjustmentRef = db.collection("payouts").doc();
    t.set(adjustmentRef, {
      payoutId: adjustmentRef.id,
      orderId: refund.orderId,
      compId: refund.compId,
      organizerUsername: refund.organizerUsername,
      grossAmount: -refund.amount,
      commission: 0,                       // 退款不退 commission（P0-5 方案 C）
      netAmount: -refund.amount,
      status: "pending",
      relatedRefundId: refundId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  });
});
```

實際 PAYUNI Refund API 呼叫（`payuniRefundCall(orderId, amount)` helper）會在 transaction 之前先呼叫；若 PAYUNI 退款失敗 → 直接更新 refund.status='failed' 不進 transaction。

4 callable：`requestRefund` / `approveRefund` / `processRefund` / `listRefundRequests`

#### 6.10 PAYUNI Notify 失敗對帳 cron（0.5 天）

**P2-3 修正：limit 50 內加分批延遲**：
```javascript
exports.reconcilePendingOrders = onSchedule({
  schedule: "every 30 minutes",
  timeZone: "Asia/Taipei"
}, async () => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  const snap = await db.collection("regOrders")
    .where("status", "==", "pending")
    .where("createdAt", "<", cutoff)
    .limit(50).get();

  for (const doc of snap.docs) {
    try {
      const result = await queryPayuniOrder(doc.data().orderId);
      // ... process ...
    } catch (e) {
      console.error("reconcile error", doc.id, e);
    }
    await new Promise(r => setTimeout(r, 200));  // PAYUNI API 限頻 5/秒緩衝
  }
});
```

#### 6.11 自動撥款 cron（0.5 天）
> 同 v5：`runScheduledPayouts` + `notifyUpcomingPayout`

**修改檔案**：
- [`functions/index.js`](functions/index.js)（重寫 createRegistrationPayment / payuniRegNotify + 14 callable + 3 cron + migration + queryPayuniOrder helper + payuniRefundCall helper）
- [`public/index.html`](public/index.html) — **_argMap + 12 行**（payouts 4 + refund 4 + migration + reconcile + 2 helper）
- [`public/system-settings.html`](public/system-settings.html)（4 個新 tab）
- [`firestore.rules`](firestore.rules)（payouts / refundRequests / `_legacyPayuni` 防寫）
- [`firestore.indexes.json`](firestore.indexes.json)（payouts / refundRequests / regOrders status+createdAt）

**Commit**：`phase 6: payuni platform + plan commission + payouts + refund (option C, transaction)`

---

### Phase 7 — 帳戶設定 + 進階功能（6-7 天）

#### Phase 7a — 個人資料 / 通知偏好 / 危險區域（2 天）
> 同 v5。

`userProfiles/{username}.notifications.instantNotify` 下拉**標「需先綁 LINE Notify」灰底**（P2-9 修正）若 user 還沒綁定 LINE。

#### Phase 7b — 2FA / TOTP（2.5 天）

新 npm：`speakeasy`

6 callable（含 backup code 登入 + admin 救援）：
- `setupTotp / verifyTotp / disableTotp`
- `loginCompleteTotp / loginCompleteWithBackupCode`
- `adminDisableUserTotp`

speakeasy `verify` 用 `window: 2`（P2-1 #1）

**TOTP 全用完 backup code 又失手機（P2-14）**：UI 加「請用 [意見回饋表單] 聯繫客服」連到 mFeedback modal。

#### Phase 7c — API key / 協作者 / LINE Notify（**1.5 天 + middleware 測試 0.5 天**）

**API key**（**P2-8 修正：限額 5 組**）：
```javascript
exports.generateApiKey = authCallable(["competition"], async ({ name }, request) => {
  // 先查 active key 數量
  const snap = await db.collection("apiKeys")
    .where("ownerUsername", "==", request.authUser.username)
    .where("revokedAt", "==", null)
    .get();
  if (snap.size >= 5) {
    return { success: false, message: "已達上限 5 組，請先 revoke 舊金鑰" };
  }
  // ... 產生流程
});
```

`listApiKeys` 加 `lastUsedAt` 顯示，> 30 天加灰色 hint。

**協作者**：`collaborators/{compId}_{username}` schema（**P2-12 補**）：
```
{ compId, username, role: 'editor'|'viewer',
  invitedBy, invitedAt, acceptedAt }
```

**修改 `compAuthCallable` middleware** + **加 unit test（P1-3 修正）**：

[`_test/middleware.test.js`](_test/middleware.test.js)：
```javascript
// 用 Firebase Emulator + jest 跑
const test = require("firebase-functions-test")();
describe("compAuthCallable role enforcement", () => {
  // 4 角色 × 5 representative callable = 20 cases
  const roles = ['creator', 'editor', 'viewer', 'stranger'];
  const callables = [
    'getCompetitionConfig',  // read
    'saveCompetitionConfig', // write
    'deleteCompetition',     // delete
    'createLicense',         // system-only
    'getRegistrationBundle'  // public
  ];
  // expected matrix...
});
```

> 0.5 天工作量，避免上線爆。

**LINE Notify** 同 v5（含 401 handling）

**修改檔案**：
- [`public/account.html`](public/account.html)（新 ~1100 行）
- [`public/index.html`](public/index.html) — **_argMap + 18 行**：所有 Phase 7 callable
- [`functions/index.js`](functions/index.js)（+18 callable + middleware 改）
- [`functions/package.json`](functions/package.json)（+speakeasy）
- [`firestore.rules`](firestore.rules)（userProfiles / apiKeys / collaborators / collaboratorInvites）
- [`_test/middleware.test.js`](_test/middleware.test.js)

**Commit**：`phase 7a/7b/7c: account + 2FA + backup + admin rescue + collab middleware test + LINE`

---

### Phase 8 — System-settings + Plans + Feedback（4-5 天）

#### 8.1 9 + 4 + 1 = 14 tabs UI 排版（**P2-5 修正**）

system-settings.html 14 個 tab（9 既有 + 4 PAYUNI 新 + 1 方案管理）：

**改用分組摺疊**：
```
[基本] 帳戶 / 通知 / 系統參數
[商務] 方案管理 / 授權碼 / 對帳
[金流] PAYUNI 商家 / 批次撥款 / 退款審核 / 對帳工具
[進階] 操作日誌 / 財務分析 / Cron 觸發（dev only）/ AI 設定 / 系統重置
```

或 ≤768px 改下拉 select。

#### 8.2 已建 tabs（Phase 6 帶入）
PAYUNI 商家 / 批次撥款 / 退款審核 / 對帳工具

#### 8.3 方案分級頁（同 v5）

#### 8.4 意見回饋
沿用 [`submitFeedback`](functions/index.js:3054)

**修改檔案**：[`public/system-settings.html`](public/system-settings.html)

**Commit**：`phase 8: system styling 14-tab grouping + plans + feedback`

---

### Phase 9 — i18n 完整稽核（1 天）

#### 9.1 5 條 grep（**P2-6 補第 5 條**）

```bash
# 1. HTML inner text
grep -nP '>[一-鿿][^<]*<' public/*.html

# 2. JS string literals
grep -nP "['\"][一-鿿][^'\"]*['\"]" public/*.html | grep -v 'data-i=' | grep -v '//'

# 3. HTML attributes
grep -nP '(placeholder|title|alt|aria-label)="[一-鿿]' public/*.html

# 4. Template literals
grep -nP '`[^`]*[一-鿿][^`]*`' public/*.html

# 5. 字串拼接（'已選 ' + n + ' 筆'）
grep -nP "['\"][^'\"]*[一-鿿][^'\"]*['\"]" public/*.html | grep -v 'data-i=' | grep -v '//'
```

#### 9.2-9.4 同 v5

**Commit**：`phase 9: i18n 5-condition grep audit`

---

### Phase 10 — RWD + 跨瀏覽器（2 天）

> 同 v5。

**Commit**：`phase 10: RWD three breakpoints + cross-browser`

---

### Phase 11 — 最終 QA + 一次性上線（4-5 天）

#### 11.1 全站端到端跑 6 次（情境 A-F）

A-E 同 v5；**F 退款流程**（部分退款 → payout 已撥 → payoutAdjustment 抵下次）

#### 11.2 i18n / RWD / 跨瀏覽器（0.5 天）

#### 11.3 上線前 final checklist（**P0-1 + P2-4 + P2-11 補強**）

- [ ] [`public/js/emulator-config.js`](public/js/emulator-config.js) 在 `firebase.json hosting.ignore`
- [ ] **`_argMap` 與新 callable 對應檢查（grep 比對）**：
  ```bash
  # 列出所有 exports.X = ...
  grep -oP "^exports\.\w+" functions/index.js | sort -u > /tmp/exports.txt
  # 列出 _argMap 內 keys
  grep -oP "^\s*\w+:\[" public/index.html | sort -u > /tmp/argmap.txt
  diff /tmp/exports.txt /tmp/argmap.txt
  # 應該只有 helper / 內部 function 不在 argmap，所有 callable 都該對得起來
  ```
- [ ] `_emu_data/` / `_gcs_export/` 在 `.gitignore`
- [x] `serviceAccountKey.json` 在 `.gitignore`
- [ ] 沒有 `console.log("DEBUG")` 殘留
- [ ] PAYUNI 強制 production 已驗（`grep sandbox- functions/index.js` 全空）
- [ ] `firestore.rules` review（新 collection 都有 rule + `_legacyPayuni` 防寫）
- [ ] `firestore.indexes.json` review
- [ ] 跑 `migratePayuniToPlatform({dryRun:true})` 一次（emulator）→ 確認影響數
- [ ] **PAYUNI sandbox 已實際跑通 1 筆完整付款**（含 webhook 接收 + payout 建立）
- [ ] **PAYUNI sandbox 已實際跑通 1 筆退款**（P2-11 補）
- [ ] **LINE Notify 至少 1 user 推送驗證**（P2-4 補）
- [ ] **Cloud Scheduler 已啟用** 6 個 cron
- [ ] **Firestore TTL policy 已設**：`rateLimits.lastSeen` TTL = 1 hour（P0-3 補）
- [ ] `mail` collection 寄信驗證
- [ ] `_legacyPayuni` 備份欄位確認寫入正常
- [ ] sample organizer 的 `accounts.plan` 有值（預設 'free'）
- [ ] commissionRates 4 階都正確 hardcode 進 salesConfig
- [ ] `[pdfkit / archiver / puppeteer-core / @sparticuz/chromium / speakeasy]` 在 `functions/package.json`
- [ ] `functions/fonts/NotoSansTC-Regular.subset.ttf` 與 Bold 已就位（P0-4 補）
- [ ] git tag `v1-final`
- [ ] 上線時間：**週日凌晨 2:00**

#### 11.4 一次性部署 Runbook → 詳見第 4 節（**P0-6 重排順序**）

#### 11.5 D+1 ~ D+7 觀察
> 同 v5

**Commit**：`phase 11: e2e QA (incl. refund + LINE) + final checklist`

---

## 4. 一次性上線 Runbook（**P0-6 重排**）

### D-1（上線前一天）
```bash
# Backup production
gcloud config set project regmaster-pro
gcloud firestore export gs://regmaster-backup/pre-v2-launch-$(date +%Y%m%d)

# Final smoke 用最新快照
gsutil -m cp -r gs://regmaster-backup/pre-v2-launch-XXXXXXXX ./_gcs_final
firebase use dev
firebase emulators:start --import=./_gcs_final
# 跑 _test/smoke.md 全 21 項 + 情境 F 退款

# Tag v1
git checkout main && git tag v1-final && git push origin v1-final
```

### D-day（週日凌晨 2:00）

**正確順序（P0-6 修正）**：

```bash
firebase use default   # = regmaster-pro

# Step 1. firestore indexes 先 deploy（讓它先 building）
firebase deploy --only firestore:indexes

# Step 2. 等 indexes building 完成 ⏳ 5-15 分鐘
# 在 Firebase Console > Firestore > Indexes 看狀態
# ⚠️ 不能跳過此步直接 deploy functions
# 這是 BLOCKING 步驟

# Step 3. firestore rules（瞬間生效）
firebase deploy --only firestore:rules

# Step 4. functions deploy（含 puppeteer / chromium，~3-5 分鐘）
firebase deploy --only functions

# Step 5. PAYUNi migration
firebase functions:shell
# > migratePayuniToPlatform({ dryRun: true })   # 確認影響數
# > migratePayuniToPlatform({ dryRun: false })  # 正式跑

# Step 6. Firestore TTL policy（一次性手動設定，已存在則 skip）
# Firebase Console > Firestore > TTL > Add policy
# Collection: rateLimits, Field: lastSeen, TTL: 1 hour

# Step 7. hosting deploy（最後，因為 emulator-config.js 自動排除）
firebase deploy --only hosting

# Step 8. 立刻 incognito 跑 6 個情境腳本（A-F）

# Step 9. 監控
firebase functions:log --tail
```

### Rollback（同 v5 三情境 + PAYUNI revert）

PAYUNi 額外 rollback：寫一支臨時 `revertPayuniMigration` callable，從 `_legacyPayuni` 還原 `cfg.payuniMerID` 等欄位。

### D+1 ~ D+7
每天看 logs / payouts pending / refundRequests / feedback；每天 18:00-20:00 hotfix slot。

---

## 5. 向後相容（同 v5）

新增 collections：otps / participantOtps / userProfiles / certTemplates / apiKeys / collaborators / collaboratorInvites / **payouts** / **refundRequests** / rateLimits / interestedUsers

---

## 6. 風險（v6 補強）

| 風險 | 衝擊 | 機率 | 緩解 |
|---|---|---|---|
| **`_argMap` 漏一行 → 該 callable 全壞** | 🔴 嚴重 | 高 | Phase 11.3 grep diff 自動比對；每 Phase commit 前自查 |
| **emulator-config.js 在 production 404** | 🟡 中 | 高 | P0-2 動態 inject，0 個 production request |
| **rateLimits race / window bug** | 🔴 嚴重 | 高 | P0-3 transaction + 不重設 windowStart |
| **證書 PDF 中文字型方塊** | 🔴 嚴重 | 100% | P0-4 字型打包 + subset |
| **退款後 commission 爭議** | 🔴 嚴重 | 中 | P0-5 拍板方案 C + EULA 退費條款明示 |
| **D-day index 還在 building** | 🔴 嚴重 | 中 | P0-6 重排順序；index 必須先 deploy 等完才 functions |
| **多評分 saveScore API spam** | 🟡 中 | 中 | P0-7 saveBatchScores |
| **退款 partial 同時兩筆 over-refund** | 🟡 中 | 低 | P1-1 transaction |
| **報名者自助退款身份冒用** | 🟡 中 | — | P1-2 V2 不做，明示聯繫主辦方 |
| **collaborator middleware 改動影響 60+ callable** | 🔴 嚴重 | 中 | P1-3 unit test 4 角色 × 5 callable |
| **dev project 用到 production PAYUNi 商號** | 🟡 中 | 高 | P1-4 import 後立即 sanitize |
| **dev 寄信誤觸 production user** | 🔴 嚴重 | 中 | P1-5 dev 不部署 Trigger Email Extension |
| **PAYUNi 商家帳號設錯** | 🔴 嚴重 | 低 | system-settings 加「測試 webhook」+ dev 跑通 |
| **既有 cfg PAYUNi 還在用 → 進錯帳戶** | 🔴 嚴重 | 中 | Phase 6.8 migration 強制清空 + `_legacyPayuni` 可逆 |
| **PAYUNi webhook 失敗** | 🟡 中 | 中 | reconcilePendingOrders cron + system 手動對帳 |
| **Puppeteer cold start 5+ 秒** | 🟡 中 | 高 | 獨立 Functions runtime；前端「最多 30 秒」提示 |
| **TOTP secret 明文存** | 🟡 中 | — | TODO v3：KMS 加密 |
| **TOTP 救援被濫用** | 🟡 中 | 低 | adminDisableUserTotp 必寫 audit log + 寄信 + 雙重驗證 |
| **LINE Notify token 過期** | 🟡 低 | 高 | 寄推送 catch 401 自動 unlink |
| **OTP email bombing** | 🟡 中 | 中 | IP-based + email-based rate limit（transaction）|

---

## 7. v6 新增 Cloud Functions（最終，**52 個 callable** + 3 cron）

```
Phase 2 (Auth):                       1 callable
  resendOtp

Phase 3 (My):                          4 callable
  requestParticipantOtp / getMyRegistrations / getMyRegistrationDetail / resendRegistrationEmail

Phase 4 (Dashboard):                  11 callable  (P0-7 +1: saveBatchScores)
  getRecentActivity / getRegistrationFunnel / getRegistrationHeatmap / getSchoolRanking
  getUrgentItems / generateBadges / generateCertificates
  getCertTemplates / saveCertTemplate / deleteCertTemplate
  saveBatchScores

Phase 5 (Settings):                    3 callable
  getCompetitionTemplates / getEventChecklist / getEventSettingsAISuggestions

Phase 6 (PAYUNi):                     12 callable + 3 cron
  Payouts:    getPayoutsByOrganizer / listAllPayouts / processPayout / getPayoutSummary
  Refund:     requestRefund / approveRefund / processRefund / listRefundRequests
  Migration:  migratePayuniToPlatform
  Reconcile:  reconcilePendingOrdersManual / manualReconcileOrder
  (Helpers:   queryPayuniOrder / payuniRefundCall  [內部，非 callable])
  Cron:       reconcilePendingOrders / runScheduledPayouts / notifyUpcomingPayout

Phase 7 (Account):                    18 callable
  Profile:    getUserProfile / updateUserProfile / requestAccountDeletion
  TOTP:       setupTotp / verifyTotp / disableTotp / loginCompleteTotp
              loginCompleteWithBackupCode / adminDisableUserTotp
  API key:    generateApiKey (限 5 組) / listApiKeys / revokeApiKey
  Collab:     inviteCollaborator / acceptCollaboration / listCollaborators / removeCollaborator
  LINE:       linkLineNotify / unlinkLineNotify

Cron from Phase 7:                                  1 cron
  processPendingDeletions

Dev only:                              1 callable
  devTriggerCron
```

合計：**52 個新 callable + 3 個 cron + 1 dev cron**

每個 callable 都需在 [`public/index.html` `_argMap`](public/index.html:22) 加對應條目（**P0-1 強制檢查**）。

---

## 8. v6 新增 npm 套件

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

> **不引入** nodemailer

---

## 9. design tokens（同 v5 §9）

`--radius` 維持 16px。

---

## 10. Git 策略（同 v5 §10）

```
main                  ─ v1 production
└── v2-dev            ─ V2 開發主線（不開 phase branch）
    ├── tag: phase-0-done ... phase-11-done
    └── tag: v2-rc1   ─ Phase 11 最終 candidate
        → merge to main  → tag: v2.0.0
```

---

## 11. Cron 在 emulator 不跑（同 v5 §11）

`devTriggerCron` 提供手動觸發 6 個 cron 的入口；system-settings dev-only tab。

---

## 12. 動工前 checklist（最終版）

- [x] 6 大決策 + PAYUNi 平台統收 + 進階功能拍板
- [x] 手續費（plan-based）+ 撥款週期 + 最低門檻拍板
- [x] **退款政策方案 C 拍板（P0-5）**
- [x] 還原點與備份建立（`_backup/2026-05-05_pre-redesign/` + tag `v1-pre-redesign`）
- [x] `.gitignore` 強化
- [ ] Java JDK 11+
- [ ] gcloud CLI
- [ ] 申請 `regmaster-pro-dev` Firebase project
- [ ] 練習 `firebase use --add`
- [ ] 取得 PAYUNi 平台 sandbox merchant ID
- [ ] 確認 PAYUNi production merchant ID（Kuang-Tien）
- [ ] **取得 PAYUNI Query Order API 規格**（Phase 6.10）
- [ ] **取得 PAYUNI Refund API 規格**（Phase 6.9）
- [ ] **下載 Noto Sans TC ttf + 學會 pyftsubset 縮小**（Phase 4c P0-4）
- [ ] 確認 Cloud Scheduler 在 production 已啟用
- [ ] 確認 `mail` collection + Trigger Email Extension **僅在 production**（dev 不裝）
- [ ] 確認 LINE Notify 申請流程
- [ ] 確認 sales 業務 email：`sales@kuangtien.com.tw`
- [ ] **更新 EULA.html 加退費條款方案 C 明示**
- [ ] confirm v6 計畫，下指令進入 Phase 0

---

## 13. P2 小幅疏漏修正清單（一次列舉）

| # | P2 項目 | 處理位置 |
|---|---|---|
| P2-1 | refundRequests / payouts 缺 createdAt/updatedAt | §Phase 6.3 / 6.9 schema |
| P2-2 | 撥款日「N 天後」月底 corner case | §Phase 6.5 helper |
| P2-3 | PAYUNI Query API 限頻 | §Phase 6.10 cron 加 sleep |
| P2-4 | LINE Notify 推送驗證 | §Phase 11.3 checklist |
| P2-5 | system-settings 14 tab 排版 | §Phase 8.1 分組 |
| P2-6 | i18n grep 第 5 條（字串拼接）| §Phase 9.1 |
| P2-7 | `_legacyPayuni` firestore rule | §Phase 6.8 |
| P2-8 | API key 限 5 組 | §Phase 7c.generateApiKey |
| P2-9 | instantNotify 'line' 灰底「需先綁」| §Phase 7a UI |
| P2-10 | #login 對 2FA 用戶處理 | §Phase 2.1 / 2.2 |
| P2-11 | 退款 e2e checklist | §Phase 11.3 |
| P2-12 | collaborators schema | §Phase 7c |
| P2-13 | 累積撥款 多 doc 並行 | §Phase 6.7（拍板：保持多 doc） |
| P2-14 | TOTP 全失救援 | §Phase 7b 連 mFeedback |
| P2-15 | Functions size +280MB 影響 | §Phase 4c.4 獨立 region 評估 |

---

## 14. 工時里程碑（v6）

| Phase | 天 | 累計 |
|---|---|---|
| 0 — 基礎建設（含 DR + sanitize）| 4-5 | 1 週 |
| 1 — 公開頁面 | 4-5 | 2 週 |
| 2 — Auth（含 transaction rate limit）| 4-5 | 3 週 |
| 3 — 報名者個人中心 | 5-6 | 4 週 |
| **4 — Sidebar + Dashboard + 字型 + batch scoring** | **11-15** | **6.7 週** |
| 5 — 活動設定 + 模板 wizard | 8-10 | 8 週 |
| **6 — PAYUNI（含對帳 / 退款方案 C transaction）** | **8-10** | **9.7 週** |
| 7 — 帳戶設定（含 middleware test 0.5 天）| **6.5-7.5** | **10.7 週** |
| 8 — System + Plans + Feedback | 4-5 | 11.5 週 |
| 9 — i18n 5-grep 稽核 | 1 | 11.7 週 |
| 10 — RWD + 跨瀏覽器 | 2 | 12 週 |
| 11 — 最終 QA + 上線 | 4-5 | 13 週 |

**估計**：**13-14 週**（solo dev，含 buffer；比 v5 多 1 週吸收 P0-3/4/7 + P1-1/3 工作量）

---

## 15. 結語

V6 = V5 + P0×7 + P1×5 + P2×15 修正 + 退款政策方案 C 拍板。

**從 V5 到 V6 主要變動**：
1. 每 phase 強制 `_argMap` 同步（漏一行就壞）
2. 字型打包進 functions（中文證書必需）
3. 退款方案 C 拍板（commission 不退，主辦方下次撥款扣全額）
4. D-day deploy 順序重排（indexes 先，hosting 最後）
5. 評分介面 saveBatchScores（避免 API spam）
6. emulator-config.js 動態 inject（0 個 production 404）
7. rateLimits transaction + 不重設 windowStart（修 race + sliding window bug）
8. dev project PAYUNi 商號淨化 + 不部署 mail extension
9. collaborator middleware 加 unit test
10. 13 風險條目 + 15 P2 修正 + 22 動工前 checklist

**動工順序**：
1. **Phase 0**：基礎建設（含 DR 演練 + dev sanitize）
2. **Phase 1-5**：UI 重構（風險低，每 phase 獨立驗證）
3. **Phase 6**：PAYUNi 變更（核心業務變更，最謹慎）
4. **Phase 7-11**：補齊功能 + QA + 上線

**起手式**：Phase 0.1 安裝 JDK 11 + gcloud CLI + 申請 regmaster-pro-dev project。

— END v6 —
