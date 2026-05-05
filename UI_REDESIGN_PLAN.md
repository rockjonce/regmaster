# RegMaster UI 重新設計規劃書

> 目標：將 Claude Design 提供的三頁設計稿（registration / event-settings / event-info）整合進現有 RegMaster Firebase 應用，建立一致的「Navy + Orange」品牌語彙與 design tokens 系統。
>
> 撰寫日期：2026-05-05
> 版本：v1（規劃階段，尚未動工）

---

## 1. 現況盤點

### 1.1 程式碼資產

| 路徑 | 行數 | 角色 |
| --- | --- | --- |
| `public/index.html` | 6 630 行 | **單檔 SPA**：包含 home / comp / form / success / admin 五個 view、所有 modal、所有業務邏輯（~280 個 JS function）、所有 CSS |
| `public/system-settings.html` | 1 142 行 | 系統管理員專用設定頁 |
| `public/EULA.html`、`Manual.html` | — | 法律文件、操作手冊（modal 內以 iframe 載入） |
| `functions/index.js` | 152 KB | Cloud Functions（所有 callable API） |
| `firebase.json` / `firestore.rules` / `storage.rules` | — | Firebase Hosting + Functions 設定 |

### 1.2 現行五個 view 對應後端

```
v-home     → 公開首頁（活動列表 + 篩選器）
v-comp     → 活動詳情（海報、規則、公告、報名/查詢）
v-form     → 報名 wizard（5 step：隊伍 → 學員 → 指導老師 → 自訂問題 → 確認）
v-success  → 報名成功（編號 + 密碼 + QR + 付款）
v-admin    → 管理後台（renderAdminHome / aEditComp / aDash 三個子畫面）
```

### 1.3 現行 admin 結構（aEditComp）

aEditComp 目前以「**長卷軸 + 上方錨點導覽列**（settings-nav）」呈現約 10 個 card 區塊：
系統開關 → 基本設定 → 隊伍成員 → 附加欄位 → 海報/規章 → 海報設計 → 報名表附加 → 收款設定 → 公告 → 儲存。
aDash 則用 `tabs / sub-tabs` 結構顯示 3 個主 tab × 7 個子 tab。

### 1.4 問題點

1. 視覺風格雜湊：早期 `--pri:#4F46E5` 紫色與後期 `--pri:#0A437A` 海軍藍混雜。
2. 字體大小偏大（body 19px），密度低、scan 困難。
3. admin 後台是**單欄長卷軸**，沒有真正的 sidebar / breadcrumb / 自動儲存提示。
4. 報名 wizard step bar 太陽春、缺少 hero、不分大區塊、無費用即時試算面板。
5. dashboard 的數字呈現用基本的 stat-card，缺 KPI delta、趨勢圖風格不統一。

---

## 2. 設計稿盤點（zip 內 5 檔）

| 檔案 | 用途 | 對應現行 view |
| --- | --- | --- |
| `screens/shared.css`（111 行） | **設計 tokens 唯一真實來源**：色票、陰影、`.btn`、`.card`、`.chip`、`.in`、`.app-top`、`.hub-*` | 全站 |
| `screens/index.html`（117 行） | 「設計交付 hub」首頁，純 demo 用，**不需直接套用** | — |
| `screens/registration.html`（466 行） | 報名者體驗：4-step wizard、hero、學員/指導老師 mgroup、附加問題 chk-grid、檔案上傳、費用試算、確認送出 | `v-form` + `v-success` |
| `screens/event-settings.html`（604 行） | 主辦方設定：左 sidebar + 上 breadcrumb（自動儲存提示）+ 6 個 cfg-tabs + 主內容（sec/sec-hd/sec-bd）+ 右 sidebar（狀態/預覽/checklist/AI 建議） | `v-admin → aEditComp` |
| `screens/event-info.html`（713 行） | 主辦方總覽：sidebar + hero + ev-tabs + 4 KPI + SVG 折線圖 + 組別 bar + 漏斗 + 活動 feed + 24h 熱點 + 學校排行 | `v-admin → aDash` |

### 2.1 Design tokens 摘要（shared.css）

```
色彩：--pri #0A437A / --pri2 #0D5BA8 / --pri3 #1573CC
      --accent #F49121 / --accent2 #FFB34D
      --ok #10B981 / --warn #F49121 / --err #EF4444 / --purple #8B5CF6 / --info #0EA5E9
版面：--radius 14px / --shadow / --shadow-lg / --ring
字體：Outfit + Noto Sans TC + JetBrains Mono；body 14px / line-height 1.6
元件：.btn (pri/accent/ghost/danger/link/lg/sm/block)、.in、.lbl、.field、.card、.chip、.toast、.spinner、.app-top、.brand
```

---

## 3. 整合策略 — 三選一

### 策略 A：**全面整合至既有 SPA**（推薦）✅
- 保留 `public/index.html` 單檔 SPA、所有 callable 名稱與業務邏輯。
- 把設計 tokens 抽出成 `public/shared.css`，重寫 admin / form 兩個 view 的 markup。
- **優點**：最小路由風險，無須改動 Firebase Functions 與 Firestore。
- **缺點**：6 630 行 HTML 會持續肥大。

### 策略 B：拆檔多頁（每 view 一個 .html）
- 拆成 `index.html` / `event/[id].html` / `register/[id].html` / `admin/dashboard.html` / `admin/settings.html`。
- 共用 JS 抽成 `public/js/app.js`、CSS 抽成 `public/shared.css`。
- **優點**：每頁更輕、可獨立 cache、SEO 較好。
- **缺點**：要改 Firebase Hosting rewrites、要拆全域變數（ME、CFG、CUR…）、風險高。

### 策略 C：純美術替換
- 只換色票與字體，不動 markup。
- **優點**：1 天內完成。
- **缺點**：拿不到設計稿的真正價值（sidebar、KPI、checklist、SVG 圖表等都會缺失）。

> **本規劃以策略 A 為主軸推進**，將來如要走 B，已經抽好的 `shared.css` 與業務 JS 模組可平移。

---

## 4. 實作分期（建議 6 個 Phase）

### Phase 0 — 設計 tokens 落地（半天）
- [ ] 把 `screens/shared.css` 複製成 `public/shared.css`，新增 RegMaster 專用補強區段（保留 `--pri-bg #E8F0F8`、`var(--ink)` 等 v1 tokens 的 alias）。
- [ ] 建立 `public/css/legacy-shim.css`：把舊變數（`--surface2`、`--txt2`、`--border` …）map 到新 tokens，避免一次改全站 6 630 行。
- [ ] 在 `index.html` `<head>` 加上 `shared.css` + `legacy-shim.css`（**先於既有 `<style>`**），先不動現有 CSS。
- 風險：font-size 從 19px 降到 14px，會讓現行 admin 看起來縮小，需配合 Phase 1 一起 review。

### Phase 1 — Hub / 公開首頁（v-home + v-comp）（1 天）
- [ ] 將 `.topbar` 重寫為 `.app-top`（sticky、白底、`.brand` 用設計稿的 `R` square logo）。
- [ ] hero-bar 沿用 `registration.html` 的漸層 + radial-gradient 裝飾。
- [ ] `comp-card` 改用 `card / card-hd / card-body` + 設計稿的 chip 規範。
- [ ] 篩選器（homeFilter）改用 `.in / .btn-ghost`。
- 不動：`renderCompCards` / `filterHome` 等資料邏輯。

### Phase 2 — 報名流程（v-form + v-success）（2 天）
- [ ] hero header（`reg-hero`）：競賽標題、日期、地點、截止 → 從 `CFG` 動態填入。
- [ ] step bar：4 步驟（**現行 5 步驟需評估合併**：原 step2 學員 + step3 指導老師 → 設計稿合併為「填寫資料」）。
  - 建議：保留 5 步驟邏輯，但 step bar 視覺顯示 4 步驟（step2 + step3 視為同一個高層步驟、用 `mgroup` 區隔學員與老師）。
- [ ] `mgroup`（`mgroup-hd .num` + `mgroup-bd`）取代既有 `.section h3`。
- [ ] `.row2 / .row3` 取代 `.form-row`。
- [ ] `.chk-grid / .chk-item.on` 取代既有 radio-item / checkbox 樣式。
- [ ] 第 3 步附加問題的卡片化（複用 mgroup）。
- [ ] 第 4 步確認頁套用 `.review-section` 風格。
- [ ] **新增**：右下浮動或底部置底的費用試算 `.fee` 元件（依組別 + 學員人數即時試算，現行只在最後步驟才顯示）。
- [ ] 成功頁 `.success-card` + `.creds`（編號 / 密碼 / QR）。
- 不動：`buildWizard` / `submitForm` / `validateField` / `validateTWID` 等。

### Phase 3 — 活動設定（v-admin → aEditComp）（2-3 天）
重點是**從「長卷軸」改成「sidebar + breadcrumb + 6 tabs + 雙欄」**：

- [ ] 新增 `.cfg-page` grid 容器（240px sidebar / 1fr main）。
- [ ] sidebar：保留現行 6 個快速跳轉（系統 / 成員 / 付款 / 檔案 / 說明 / 公告 / 儲存）+ 「← 所有活動」「Dashboard」入口；用 `nav-i.on` 高亮目前活動。
- [ ] cfg-top：breadcrumb（所有活動 / 活動名稱 / 設定）+ `save-state`（自動儲存時間戳）+ 預覽報名頁按鈕 + 儲存發布按鈕。
- [ ] cfg-hd：大標題 + `pill`（已上線 / 未上線 / 已截止）+ 6 個 cfg-tab：
  ```
  01 基本資料  ← 名稱、類別、開放/截止日期、海報、規章 PDF
  02 組別 & 場次  ← 既有 groups + sessions inline 編輯（用 grp-list / grp-item）
  03 報名表單   ← studentFields + teacherFields chip picker + 自訂問題 sortable
  04 金流 & 費用 ← fee-tbl + 金流商選擇 + 付款期限
  05 通知 & Email ← email templates（現行 dtpl 子 tab）
  06 進階設定   ← isVisible / capacity limit / 自動發信 / EULA / 複製活動 / 刪除
  ```
- [ ] 主內容用 `.sec / .sec-hd / .sec-bd` 取代 `.card / .card h2`。
- [ ] 右 sidebar 320px（>1180px 時顯示）：狀態卡 + 即時預覽 tile + 分享連結 + 上線檢查清單 + AI 助理建議。
- [ ] 把現行 `.toggle-wrap` 換成設計稿的 `.toggle.on`。
- [ ] `aGrps`、`aSF`、`aTF` 改用 `.field-grid + .fchip`（含 `.fchip.req` 必填星號）。
- [ ] 自訂問題（CQ_DATA / SCQ_DATA / TCQ_DATA）改用 `.cq-item / .cq-item-hd / .cq-meta / .cq-opts`。
- 不動：`saveCompetitionConfig` 後端 API、`CFG` 資料結構、`_settingsDirty` 變更追蹤邏輯。
- **資料結構需確認**（4-3 節）：fee-tbl 對應現行哪個欄位？目前 `cfg.basicFee / cfg.extraFees` 是否已存在？若無需擴充。

### Phase 4 — Dashboard（v-admin → aDash）（2 天）
- [ ] 套用同一 sidebar layout（重用 Phase 3 的 `.cfg-page`）。
- [ ] hero（`ev-hero`）：活動標題 + meta + 主要 action（複製連結 / 預覽 / 匯出 CSV）。
- [ ] ev-tabs：對應現行 3 主 tab（總覽 / 趨勢 / 管理）但合併到一條條 tab 列（含 badge 顯示數量）。
- [ ] **總覽**：4 KPI（報名數 / 正取 / 備取 / 待付款）含 delta + footnote → 沿用 `_dashStats`。
- [ ] **趨勢**：`.chart-card` + 既有 Chart.js（`trendChart` / `dailyChart`）；UI shell 換成設計稿風格，圖表庫不變。
- [ ] 組別 bar 改用 `.bar-list / .bar-row`（純 CSS，不需 Chart.js）。
- [ ] **新增**：報名漏斗（funnel）、24h 熱點圖（hm）、最近報名（tbl + av-team）、學校排行——這些**目前後端沒有提供資料**（`getDashboardStats` 沒有時段熱點），需評估：
  - 方案 1：先 mock 假資料展示，後端視需求補；
  - 方案 2：暫時不做，只做 KPI + bar + 趨勢圖，把這些卡片 commented-out 留位。
  - **建議走方案 2**，避免一次改太多後端。
- [ ] **報名管理**子 tab（dt / dtpl / dimp / drec / dsc / dexp / dqr）：UI 換套，邏輯不動。表格用 `.tbl + .av-team`、空狀態 SVG 沿用現行 empty。

### Phase 5 — Modal、Toast、共用元件（半天）
- [ ] 全站 modal（mLogin / mSignup / mDetail / mEmail / mTpl / mNewComp / mConfirm / mLicense / mEula / mManual / mFilePreview / mFeedback 等 14 個）統一用設計稿的 `.card` 內距與 `.btn-pri` 體系。
- [ ] `.toast` 改用設計稿的 toast-wrap + `.toast.ok / err`。
- [ ] `.spinner` / `.spinner-dark`。
- [ ] AI 浮動聊天視窗（chat-fab / chat-panel）配色換成 `--pri2` + `--accent`，現行還是舊紫色。

### Phase 6 — RWD / Polish / 回歸測試（1 天）
- [ ] 設計稿 sidebar 在 ≤1180px 折疊成 hamburger，需自行補（現行 admin 完全沒做這件事）。
- [ ] 表單 step bar、reg hero 在 ≤640px 的 fallback。
- [ ] 圖表在小螢幕上的 responsive。
- [ ] 跑一次端到端 smoke：建立活動 → 報名 → 付款 → admin 確認 → 發信 → 匯出。
- [ ] 確認語言切換（zh / en）所有新文案都進 `I18N` 與 `data-i`。

---

## 5. 風險與待確認事項

### 5.1 資料模型不確定處
- **設定頁 04 金流 & 費用** 的 fee-tbl（基本費 / 加購 / 折扣）：現行 `cfg` 似乎只有單一 `basicFee`，需確認 `cfg.extraFees / discountRules` 是否已存在於 Firestore，否則需設計稿降級為單筆「基本報名費」+「加購項目」雙欄。
- **設定頁 06 進階** 的「候補機制」toggle：現行有 `cfg.allowWaitlist`，但設計稿在 02 組別 sec 內，要確認以哪個位置為準。
- **Dashboard 漏斗 / 熱點 / 學校排行**：getDashboardStats 沒回傳這些資料；建議 Phase 4 先不做，後端開新 callable 後再補 UI。

### 5.2 視覺降級
- 設計稿 body 14px、現行 19px：放在學校老師端可能會嫌字太小。建議 base 設 15px、保留 `--font-lg` token 給特殊區（活動標題 / KPI 數字）。**請使用者確認偏好**。
- sidebar 用 `--ink #0B1220`（近黑色），現行管理後台是淺色。會是視覺最大衝擊處。

### 5.3 範圍邊界
- `system-settings.html`、`EULA.html`、`Manual.html`、`payuni-return.html` 是否一併重寫？
  - 建議：**只在 Phase 5 對 system-settings.html 套同一份 shared.css**；EULA / Manual 維持原樣（純文件型）；payuni-return 是付款 redirect 中繼頁不需動。
- functions/index.js 不在本次重設計範圍。

### 5.4 風險
| 風險 | 影響 | 緩解 |
| --- | --- | --- |
| 6 630 行 HTML 一次重寫易出錯 | 高 | 分 6 Phase commit，每 Phase 自我端到端驗證 |
| 設計 tokens 與舊 CSS 衝突（`--pri` 變數兩邊定義） | 中 | 用 `legacy-shim.css` 將舊變數映射到新 tokens，避免 search-replace 大量檔案 |
| RWD 走樣 | 中 | sidebar 設計稿沒做 ≤1180px 折疊，本次需自行補 |
| 國際化 | 低 | 新文案在 `I18N` 補 zh + en 兩份 |
| 後端漏資料導致 KPI 顯示 0 | 中 | Phase 4 先不做漏斗/熱點，避免阻塞 |

---

## 6. 檔案規劃（建議 commit 結構）

```
public/
├── shared.css            ← 新增（從 zip 複製 + 補強）
├── css/
│   └── legacy-shim.css   ← 新增（舊變數→新 tokens 映射）
├── index.html            ← 重寫五個 view 的 markup（業務 JS 保留）
├── system-settings.html  ← Phase 5 套 shared.css
└── （其他不動）

UI_REDESIGN_PLAN.md       ← 本檔（規劃書）
```

每個 Phase 一個 commit：

```
phase 0: introduce shared design tokens
phase 1: redesign hub & competition page
phase 2: redesign registration wizard & success
phase 3: redesign admin event settings (sidebar + tabs)
phase 4: redesign admin dashboard (KPI + charts)
phase 5: refactor modals, toast, shared components
phase 6: RWD polish & smoke test
```

---

## 7. 工時估計

| Phase | 估時 | 阻塞 |
| --- | --- | --- |
| Phase 0 — tokens | 0.5 day | 需使用者確認字級降到 14-15px |
| Phase 1 — 公開頁 | 1 day | 無 |
| Phase 2 — 報名 | 2 day | 5 vs 4 步驟切法須拍板 |
| Phase 3 — 設定 | 2-3 day | fee 資料模型確認 |
| Phase 4 — Dashboard | 2 day | 漏斗/熱點是否做（建議不做） |
| Phase 5 — modals | 0.5 day | 無 |
| Phase 6 — RWD/test | 1 day | 無 |
| **合計** | **9-10 工作天** | |

---

## 8. 啟動前需要使用者拍板的 4 個決策

1. **字級**：base 維持 19px / 改 15px / 改 14px（設計稿原值）— 影響整站視覺密度。
2. **報名 wizard step 數**：保留 5 步（學員/指導老師分頁）/ 合併為 4 步（學員 + 指導老師同頁）。
3. **Dashboard 新元件**：是否要花後端工開漏斗 / 24h 熱點 / 學校排行的 callable？建議本次不做。
4. **system-settings.html**：本次一併套新樣式 / 暫不動。

> 拍板後即可進入 **Phase 0** 動工。
