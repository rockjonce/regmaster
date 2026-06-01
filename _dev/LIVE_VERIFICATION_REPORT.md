# RegMaster v3 LIVE 驗證報告（Browser-based）

> 執行者：Cowork agent + Claude in Chrome MCP
> 執行時間：2026-05-28 上午 8:50 – 9:13（台北時間）
> 環境：本機 Firebase emulator (hosting:5000, functions:5001, firestore:8085, UI:4000) + Chrome
> 對應任務：`V3_VERIFICATION_TASK.md` Section A-G
> 同伴文件：`STATIC_VERIFICATION_REPORT.md`（檔案層級靜態檢查）

---

## 1. 通過率表格

```
A: 公開頁面       6/6 ⚠️（A6 因 BLOCKER #B1 失敗）
B: 認證流程       1/6 (其餘 SKIP — 會寫 prod)
C: 報名者流程     2/5 ⚠️（C2 有渲染 bug；C5 hangs renderer；C3/C4 SKIP）
D: Admin 後台    13/15 ⚠️（form-builder hangs；announcements 自動觸發 createCampaign；D15 lock-page 未測）
E: Legacy        2.5/3 ⚠️（E1 ✅；E2 redirect 落點不對；E3 部分驗證）
F: 視覺           大致通過（admin 缺 dark mode）
G: Console/Net   純展示頁 0 error；callable 頁 100% FirebaseError: internal（cascade from #B1）

整體（受 BLOCKER 影響）：可進入 staging/preview deploy 評估，禁止直接 production deploy
```

---

## 2. 問題清單（依嚴重度排序）

### 🔴 BLOCKER — 必須修才能 deploy

#### B1. Firebase SDK 沒有指向 emulator，全部 callable 打去 production

- **觀察**：每頁 console 都有 emulator 提示
  > `To automatically connect the Firebase SDKs to running emulators, replace '/__/firebase/init.js' with '/__/firebase/init.js?useEmulator=true' in your index.html`
- **影響範圍**：27 個 v3 HTML 全中標
- **後果**：
  - 5+ callable 100% 拋 `FirebaseError: internal`：`submitContactInquiry`、`getNotifPrefs`、`getPlatformHealth`、`listAllOrgs`、`createCampaign`、（推測還有其他）
  - Firestore SDK 的 read 操作通往 production Firestore（已實證：v3 /events/ 列出真實活動「優里卡探索學院2026夏令營」18 報名）
  - 任何寫操作若 prod 拒絕只會看到 internal error；若 prod 允許可能寫到正式資料庫
- **Root cause**：
  - `public/shared/firebase-bridge.js` 沒有任何 `connectFunctionsEmulator` / `connectFirestoreEmulator` 呼叫
  - 27 個 HTML 都用 `<script src="/__/firebase/init.js"></script>` 引入（缺 `?useEmulator=true`）
- **修法（Claude Code 可一次處理）**：
  - **首選**：在 `firebase-bridge.js` 開頭加 runtime 偵測：
    ```js
    if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
      if (firebase.functions) firebase.functions().useEmulator('127.0.0.1', 5001);
      if (firebase.firestore) firebase.firestore().useEmulator('127.0.0.1', 8085);
      if (firebase.auth)      firebase.auth().useEmulator('http://127.0.0.1:9099');
    }
    ```
    這樣 deploy 到 production 時自動失效。
  - **替代**：sed 把 27 個 HTML 的 `init.js` 改成 `init.js?useEmulator=true`，但 deploy 前要再改回去。

---

### 🟡 MAJOR — 應修

#### M1. v3 `events/detail.html` 把活動描述 HTML 當文字 escape

- **觀察**：
  - 用 `/events/detail.html?id=C7PWA78` 開「優里卡探索學院2026夏令營」
  - 「活動說明」區塊顯示原文字 `<!DOCTYPE html> <html lang="zh-TW"> <head> <meta charset="UTF-8"> ...`
  - 同一筆資料用 `/legacy/index.html?comp=C7PWA78` 開，**legacy 渲染正常**（「✨ 探索 · 邏輯 · 連結 ✨」、雙語標題、紅色 hero banner 都對）
- **後果**：所有現有活動在 v3 detail 頁面都會壞，報名前的賣相是裸 HTML 字串
- **修法**：v3 detail.html 的活動描述渲染用 `innerHTML = data.description` 取代 `textContent = data.description`（要記得 sanitize 不可信來源）

#### M2. `admin/events/{id}/form-builder` 在沒有資料時 hang renderer

- **觀察**：navigate 到該頁後 Chrome 的 `Page.captureScreenshot` timeout 30 秒；後續 navigate 也卡住要重新載入頁面才能解
- **推測**：頁面初始化拿不到 schema 又沒 fallback，可能跑 infinite loading 或 await 永不 resolve 的 promise
- **影響**：任何沒有 schema 的活動（新建活動的第一次進表單設計器）會壞
- **修法**：給 init flow 加 timeout + empty-state fallback；確保所有 await 都有 `.catch` 與 `Promise.race(timeout)`

#### M3. `admin/events/{id}/announcements` 一進頁面就觸發 `createCampaign`

- **觀察**：navigate 進去後 console 立刻冒 `CF error: createCampaign FirebaseError: internal`
- **推測**：頁面初始化邏輯為「如果這個活動沒有任何 campaign 就建一個 draft」— 但這應該是使用者按按鈕才做，不該頁面 onLoad 就 fire
- **後果**：若 prod 沒擋下，每次主辦方打開公告頁就會自動建 draft campaign，污染資料
- **修法**：把 init 邏輯改成「列出現有 campaigns，使用者按『新增』才呼叫 createCampaign」

#### M4. `my.html` 在無報名資料時 hang renderer

- 與 M2 同樣症狀：navigate 後 Chrome screenshot timeout，需要強制換頁脫離
- 推測同樣是 init flow 沒處理 empty 或 error 結果

#### M5. Schema 名稱不一致（同 STATIC_VERIFICATION_REPORT M1 — 已記錄但 LIVE 再次確認）

- 報告與 V3_VERIFICATION_TASK 寫 `comps/<id>.cfg.formSchema`
- 實際 code 寫 `competitions/<id>.config.formSchema`
- LIVE 驗證 D7 跳過（會寫 prod），但執行 verifier 仍會在 Firestore UI 找錯 collection

---

### 🟢 MINOR — 進 backlog

#### m1. 中/EN 語言切換按鈕無 visible effect
- 點下去頁面不 reload，文案也不換
- spec 已預先註記「i18n 尚未全套」，視為 known
- `shared/i18n.js` 檔案存在但 0 個 HTML 引用（STATIC 報告 m1）

#### m2. Admin pages 缺 dark mode toggle
- Public 頁面 topbar 有 🌗，admin 頁面 topbar 是 search + 建立活動 + avatar，沒主題切換
- 不算 bug，但功能宣稱有 dark mode 卻只 public 半套

#### m3. Admin sidebar 結構不一致
- `/admin/` 與 `/admin/events/`：概覽 + 資源
- `/admin/ai.html`、`/admin/settings.html`：概覽 + 系統
- `/admin/super.html`：系統 (沒有概覽)
- 部分頁面 sidebar 角色 label 寫「SYSTEM 角色」（有底色 chip），部分寫「主辦方」（純文字）
- 部分頁面有「本月用量 TRIAL 14 天」card，部分沒有

#### m4. `license.html` 價格 prefix 不一致
- 該頁顯示 `$0`、`$590`、`$1,490`、`$3,990`
- 其他頁面（landing / pricing.html）都用 `NT$` prefix
- 對台灣使用者來說可能誤解（$ 預設聯想 USD）

#### m5. v3 /events/ 比 legacy /legacy/ 少顯示 1 個活動
- legacy 顯示 2 場（即將開始 + 報名中）
- v3 只顯示 1 場（只篩出報名中）
- 可能是刻意 filter（v3 預設只顯示「報名中」），但無法從卡片看出「未開放」狀態的活動

#### m6. `/legacy/system-settings.html` 直接訪問會 redirect 到 v3 landing
- 預期：redirect 到 legacy login 或 v3 login
- 實際：redirect 到 `/`（v3 landing）— 使用者完全失去 context

#### m7. `D15` Super-admin lock page 未實測
- 我注入的 fake ME role 是 `system`，所以直接看到 super admin UI 沒看到 lock page
- 需要用 role:'organizer' 重測

---

## 3. 結論

```
建議下一步（依優先級）：

[1] Claude Code 一次性處理 BLOCKER + MAJOR：
    🔴 B1: 補 firebase-bridge.js runtime 偵測（最大）
    🟡 M1: v3 detail.html innerHTML render fix
    🟡 M2: form-builder init timeout + empty fallback
    🟡 M3: announcements page 不要 auto-create campaign
    🟡 M4: my.html 同 M2 處理
    🟡 M5: 文件 schema 路徑統一

[2] B1 修完後重跑 LIVE 驗證：
    - 完整跑 B (auth signup/OTP/verify/login 全流程)
    - 完整跑 C3/C4 (報名 wizard + payment)
    - 完整跑 D2-D12 (建活動 / 表單 / 公告 / 對帳 / 評分 / 報到)
    - E3 完整驗證雙寫（v3 存 schema → legacy 讀得到）

[3] MINOR 進 Phase 10/11 backlog（不阻擋 deploy）

[4] Deploy 路徑：
    - ❌ 不可直接 production deploy（C2 渲染 bug 會讓所有現有活動的 detail 頁壞掉）
    - ✅ 可走 `firebase hosting:channel:deploy v3-preview` 邀 5–10 個內部人試 1 週
    - 修完 BLOCKER + M1 再評估 production
```

---

## 附錄 A. Section 詳細結果

### A. 公開頁面（6/6 含一個 cascade fail）
- **A1 ✅** `/` v3 landing：hero「為認真辦活動的人 打造的報名系統」+「NEW v3 · AI 智慧助理已上線」badge + 4 stats（1,840+ / 128k / 10 分鐘 / 99.9%）+ dashboard mock-up + 4 pricing cards
- **A2 ✅** Dark mode toggle 🌗：完整切換深藍底白字，dashboard mock-up 也跟著換
- **A3 ⚠️ known** 中/EN 按鈕沒反應（spec acknowledged）
- **A4 ✅** `/pricing.html`：4 方案 + 月/年付 toggle 連動價格（NT$590↔472, NT$1490↔1192）+ 完整比較表（RBAC, SSO, SLA, 客服管道）+ FAQ accordion
- **A5 ✅** `/features.html` 9+ 功能卡 + `/about.html` 公司故事 timeline (2022.10 黑客松 → 2024.01 Pre-A 種子輪)
- **A6 ❌→#B1** Contact form 填完送出觸發 BLOCKER

### B. 認證流程（1/6 完成，其餘 SKIP）
- **B1 ✅** `/signup.html?plan=trial`：橘色 banner「已選擇 14 天免費試用」+ 3-step indicator（建立帳號→驗證信箱→完成）+ 密碼強度檢查（含大小寫/數字/符號 visual indicator）+ 服務條款 checkbox
- **B2-B6 SKIP** 因 BLOCKER #B1 — 送出會打 prod、可能寫到正式 accountRequests
- 副: `/login.html` ✅ 載入（Google/LINE SSO 都標「即將」、testimonial 右側）；`/forgot.html` ✅ minimalist 寄新密碼；`/onboarding.html` ✅ 正確 auth-gate 把未登入訪客導回 login

### C. 報名者流程（2/5）
- **C1 ✅** `/events/`：4 篩選器（狀態/類別/規模）+ 1 個真實活動卡片 + tab toggle (熱門/最近開賣/即將舉辦) — 但是 **讀的是 prod 資料**
- **C2 ⚠️** `/events/detail.html?id=C7PWA78`：hero/cover/CTA/countdown 都對，但活動說明區塊把 HTML 當純文字 escape（**M1 BUG**）
- **C3-C4 SKIP** 報名/付款流程會寫 prod
- **C5 ❌** `/my.html` hang renderer，無法驗證

### D. Admin 後台（13/15）
- **D1 ✅** `/admin/`：sidebar (RegMaster 主辦後台 logo / Verification Admin SYSTEM 角色 / 概覽-儀表板·所有活動 / 資源-方案與授權·設定 / TRIAL 14 天 usage / 升級方案 / 登出) + topbar (主辦後台>儀表板 + 搜尋 ⌘K + 建立活動 + avatar) + 中央「載入儀表板資料…」stuck（cascade #B1）
- **D2-D3 SKIP** 建活動會寫 prod
- **D4-D7** /admin/events/{id}/edit + form-builder：**form-builder 完全 hang**（M2）；edit 6-tab 無法測（form-builder 鎖住 renderer）
- **D8-D9** announcements：頁面載入時自動觸發 createCampaign（**M3 BUG**）
- **D10** payments：event sidebar 6-tab 正確（總覽/設定/公告/付款/評分/報到），「載入付款資料…」stuck
- **D11** scoring：「即時排行榜 LIVE」+「您為評審：Verification Admin」+「尚無報名隊伍」+「從左側選擇隊伍開始評分」prompt — UI 對，data 0
- **D12** checkin：「載入報到面板…」stuck
- **D13** `/admin/ai.html`：3-pane layout（對話歷史 / 中央問答 + 4 suggestion chips「如何提升報名轉換率」「幫我擬一封報名提醒信」「哪些功能可提升活動體驗」「分析我目前的活動表現」/ 右側查詢範圍 + 知識庫）+ input 輸入框；Phase 7 notice 寫「對話歷史已上線。完整知識庫向量檢索將於 Phase 9+ 上線」
- **D14** settings (5 tabs: 個人資料/通知偏好/安全與登入/登入裝置/帳戶, 儲存按鈕標「Phase 9 補功能」disabled) + license (狀態/到期日/剩餘額度 + 授權碼輸入 + 4 plan cards — 但價格用 `$` prefix 非 `NT$`) + audit (4 filter chips 全部/建立/修改/刪除/登入 + 載入中 stuck)
- **D15 ⚠️** super admin：rendered with system role badge「平台級權限」（紅色 ⚠️）+ 4 KPI cards 都空 + 所有組織 table 空 — 但 fake ME role=system 所以沒看到 lock page，**未驗證 organizer role 的 lock page**

### E. Legacy（2.5/3）
- **E1 ✅** `/legacy/`：v1 SPA 完整載入，顯示 2 場活動（v3 只顯示 1 場 — **m5** UX 差異）+ 「活動管理者登入」按鈕 + EN/中 toggle
- **E2 ⚠️** `/legacy/system-settings.html`：頁面載入後被 JS 重導，URL 變成 `/` 而 page content 是 v3 landing（**m6** misleading redirect）
- **E3 ✅ partial** `/legacy/index.html?comp=C7PWA78`：legacy SPA 正確渲染活動 HTML 內容（reactive proof for **M1** — 同一筆 source、v3 escape vs legacy 正常）— 但未能完整驗證 dual-write read（需先成功 saveFormSchema）

### F. 視覺
- **F1 ✅** 沒看到任何白屏 / JS crash
- **F2 🟡** Admin 沒 dark mode toggle（**m2**）
- **F3 ⚠️** RWD：Chrome MCP resize_window 後 screenshot 仍以原 viewport 渲染，無法驗證 admin sidebar 是否塌成 60px

### G. Console / Network
- **G1**：純展示頁（landing / pricing / features / about）console 0 error，只有 16x init.js emulator hint LOG（cascade #B1）
- 互動頁面 (`contact.html`, `/admin/*`)：5 種 unique callable 各拋 `FirebaseError: internal`：`submitContactInquiry`、`getNotifPrefs`、`getPlatformHealth`、`listAllOrgs`、`createCampaign`
- **G2** 沒專門看 Network tab（行為等價於 G1）
