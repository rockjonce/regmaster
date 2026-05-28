# RegMaster v3 本機驗證任務

> 對應 Phase 1-9 完整變更報告（見 `V3_PHASE_1_9_REPORT.md`）
> 派發對象：cowork agent 或人類驗證者
> 預估耗時：30–45 分鐘

你是 RegMaster v3 升級的驗證執行者。任務：在 **本機 Firebase emulator** 跑完整 smoke test，**不能 deploy production**，只回報「能用 / 不能用 / 哪裡怪」。

---

## 環境準備

```powershell
# 工作目錄
cd C:\Users\rockj\RegMaster

# 確認版本
git log --oneline -3
# 應該看到 de860fe phase 9... 與 tag v3-ready-pre-deploy-2026-05-27

# 啟動 emulator（需先確定 port 5000/5001/8085/4000 沒被佔用）
firebase emulators:start --only hosting,functions,firestore --project=regmaster-pro
# 等到看到 "All emulators ready" → 在另一個 terminal 操作
```

- 開啟瀏覽器：`http://127.0.0.1:5000/`
- Emulator UI：`http://127.0.0.1:4000/`（看 Firestore 資料）

---

## 驗證項目（請逐項打勾並截圖）

### 🌐 A. 公開頁面（5 頁）

- [ ] **A1** `/` 載入 v3 landing 頁，hero 顯示「為認真辦活動的人」標題、見到 dashboard mock-up、看到 4 個方案卡片
- [ ] **A2** 右上「🌗」按鈕切換暗模式，整頁色票轉成深色
- [ ] **A3** 右上「中/EN」切換英文（會 reload；若文案沒換是正常的，i18n 尚未全套）
- [ ] **A4** 點 nav 連到 `/pricing.html` → 4 方案表 + 月/年付切換 + 比較表
- [ ] **A5** `/features.html`、`/about.html` 載入正常
- [ ] **A6** `/contact.html` 填表單送出 → 看到「✓ 已收到」綠色成功框

### 🔐 B. 認證流程（4 頁）

- [ ] **B1** `/signup.html?plan=trial` → 上方看到「14 天免費試用」橘色 banner
- [ ] **B2** 填完表單（密碼 ≥10 字，含大小寫+數字+符號）送出 → 進到「檢查信箱」OTP 畫面
- [ ] **B3** 從 Emulator UI 的 Firestore 找 `accountRequests/<你輸入的帳號>` doc，複製 `otp` 欄位的 6 位數字
- [ ] **B4** 貼回 OTP 欄位，自動跳格 → 「✓ 驗證成功」綠色畫面
- [ ] **B5** 從 Emulator UI 確認：`accounts/<username>.intendedPlan === 'trial'`、`licenses/RM-XXXX-...trial === true` 且 expiresAt 是 14 天後
- [ ] **B6** 回 `/login.html` 用剛建立的帳密登入 → 跳到 `/admin/`

### 🎟 C. 報名者流程（5 頁）

先用 admin 建立一個假活動（見 D2），然後另開無痕視窗測試：

- [ ] **C1** `/events/` 看到活動卡片 + 篩選器
- [ ] **C2** 點任一卡片進 `/events/detail.html?id=...` → 看到 hero + cover + CTA 卡
- [ ] **C3** 點「立即報名」進 wizard，4 步驟跑完送出 → 看到「✓ 報名成功」+ teamId + 密碼
- [ ] **C4** 點「前往付款」進 `/events/payment.html?id=...&team=...` → 看到付款方式選擇
- [ ] **C5** `/my.html` 輸入報名時用的 email → 看到剛建立的報名紀錄

### 🛠 D. Admin 後台（15 點）

登入後（建議用 `admin / Sysadmin@1234`）：

- [ ] **D1** `/admin/` 載入儀表板，4 個 KPI 卡片不報錯（值可能是 0）
- [ ] **D2** 點「+ 建立活動」→ 填名稱送出 → 自動跳到 `/admin/events/<compId>`（hub）
- [ ] **D3** Hub 頁的 6 個 sub-tab（總覽/設定/報名/公告/評分/報到）都點得進去
- [ ] **D4** 點「設定」進 `/admin/events/<compId>/edit` → 6 tab 都顯示
- [ ] **D5** 點「表單設計器」→ 拖一個欄位類型到 canvas → 看到欄位卡出現
- [ ] **D6** 改欄位 label、加 1 個選項 → 右上「儲存」按鈕變成可點 → 點儲存 → 「✓ 已儲存」訊息
- [ ] **D7** ⭐ 從 Emulator UI 確認：`competitions/<compId>.config.formSchema.sections.length > 0` **AND** `competitions/<compId>.config.studentFields[]` 也被回填（雙寫驗證）<br>　　_(M5 fix 2026-05-28：原本寫 `comps/<compId>.cfg.formSchema...` 是錯的；實際 collection 為 `competitions`、sub-field 為 `config`。)_
- [ ] **D8** 點「公告」→ 「+ 新增 campaign」→ 填主旨 + 內容 → 點「立即發送」→ 「✓ 已發送 N 封 Email」
- [ ] **D9** 從 Emulator UI 確認：`mail/` collection 有新文件
- [ ] **D10** 點「付款」→ 對帳工具列點「執行對帳」（填 4 位數字 1234） → 看到結果
- [ ] **D11** 點「評分」→ 看到 leaderboard（可能是空的） → 隨便選一隊輸入 4 個分數 → 提交 → 排行榜更新
- [ ] **D12** 點「QR 報到」→ 輸入活動的 teamId → 看到「✓ 報到成功」
- [ ] **D13** `/admin/ai.html` → 點「+ 新對話」→ 輸入問題 → 等 5 秒看到 AI 回應（可能說 API key 未設，正常）
- [ ] **D14** `/admin/settings.html` 5 tab、`/admin/license.html`、`/admin/audit.html` 載入無錯誤
- [ ] **D15** `/admin/super.html` → 如果 `me.role` 不是 'system' 會看到友善鎖頁

### 🛡 E. Legacy 相容性（最關鍵 ⚠️）

- [ ] **E1** `/legacy/` 載入舊版 SPA，看到 v1 視覺
- [ ] **E2** `/legacy/system-settings.html` 載入舊系統設定頁
- [ ] **E3** ⭐ **回到 D7 建立的活動 compId**，在無痕視窗開 `/legacy/index.html?comp=<compId>` → 在舊版 SPA 點「報名」→ 跑完報名 → 確認**舊版 SPA 仍能讀取 formSchema 衍生的舊欄位**

### 🌓 F. 視覺檢查（每頁看 5 秒就好）

跑遍所有 24 個 v3 頁面，回報：

- [ ] **F1** 有沒有任何頁面整個白屏 / 報錯
- [ ] **F2** 暗模式有沒有任何頁面看不清楚（紅色 / 黃色字配色錯）
- [ ] **F3** RWD：把瀏覽器寬度拉到 375px、768px、1280px，admin sidebar 在小螢幕應該縮成 60px

### 🔍 G. Console / Network 檢查（Chrome DevTools）

- [ ] **G1** 每頁開 F12，**Console tab 不應該有紅色 error**（warn 可以忽略）
- [ ] **G2** Network tab 沒有 4xx/5xx 請求（除了未登入時故意 401 的 `/admin/*`）

---

## 回報格式

請給我 **3 個 deliverables**：

### 1. 通過率表格

```
A: 公開頁  6/6 ✅
B: 認證    5/6 ⚠️（B6 跳轉到 /admin 但畫面空白）
C: 報名者  5/5 ✅
D: Admin   13/15 ⚠️（D7 找不到 cfg.studentFields；D11 排行榜不更新）
E: Legacy  3/3 ✅
F: 視覺    通過
G: Console 通過
```

### 2. 問題清單（依嚴重度排序）

```
🔴 BLOCKER（必須修才能 deploy）：
- B6: 主辦方登入後 /admin 載入空白（具體截圖、Console 錯誤訊息）

🟡 MAJOR（應修但不一定 block deploy）：
- D7: formSchema 雙寫驗證失敗，cfg.studentFields 沒寫入
- D11: 評分送出後 leaderboard 不會自動 refresh

🟢 MINOR（可進 backlog）：
- 暗模式 /admin/super 頁面卡片邊框看不清楚
- /pricing 月/年付切換時數字閃爍
```

### 3. 結論

```
建議下一步：
[A] BLOCKER 修完才能進 production deploy 評估
[B] 目前狀態可進 hosting:channel:deploy v3-preview，邀請更多人試用 1 週
[C] 完全 OK，可直接走 production deploy 流程
```

---

## 注意事項

- **不要**執行 `firebase deploy`（沒有 hosting/functions/firestore subcommand 都不行）
- **不要**修改任何 `public/`、`functions/`、`firebase.json` 檔案，發現問題只回報不動手
- **不要** push 到 remote git
- 如果 emulator 跑不起來，**先確認 port 沒被佔用**：

  ```powershell
  Get-Process node | Stop-Process -Force
  ```

- 若 Firestore 跨重啟資料消失是正常的，每次測試重新建活動就好
- 整套驗證估計 **30–45 分鐘**
