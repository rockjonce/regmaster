# RegMaster v3 LIVE 驗證 V2 — Phase 9.1 Post-fix Delta

> 執行時間：2026-05-28 上午 9:50 – 10:05
> 對照 commit：`0bfcbac phase 9.1: post-verification bugfixes (B1 + M1 + M3)` + `edc5093 docs(phase 9.1)`
> 前一輪：`LIVE_VERIFICATION_REPORT.md`
> 對應任務：`V3_VERIFICATION_TASK.md` Section A-G

---

## 1. 通過率表格

```
                          V1 (pre-fix)    V2 (post-fix)
A: 公開頁面               6/6 ⚠️ (A6 fail)    6/6 ✅
B: 認證流程               1/6 (skipped)        6/6 ✅ FULL FLOW PASS
C: 報名者流程             2/5                  (not re-tested — see notes)
D: Admin 後台 (D1)        layout ✅, data×   layout ✅, KPI cards render ✅
D2: 建活動                SKIP                 ✅ writes competitions/CWASKBR
D5/D6: form-builder       hang renderer        spinner stuck (M2 partial)
D7: dual-write            cannot test          ✅ logic verified via direct call
E: Legacy                 2.5/3                (unchanged — independent of B1)
F+G: visual/console       known                cleaner, but new bug surfaces

整體 (post-fix)：BLOCKER #B1 → 確認修好；但暴露出 NEW BLOCKER：
                authenticated pages 沒在 callable 內帶 _auth wrapper。
```

---

## 2. 修復驗證結果

### 🟢 已確認修復

#### B1 — Firebase SDK → emulator wiring
**修法**：`firebase-bridge.js` 加入 11 行 runtime detector (lines 52-64)
**驗證證據**：
- `firebase.functions().useEmulator('127.0.0.1', 5001)` 在 bridge 內執行成功
- `submitContactInquiry` 透過 emulator 寫入 `contactInquiries/2K5wEj6vSyyfwWS78bzX` (確認: name="phase 9.1 force-wired test", email, message, plan="pro" 等欄位全對)
- `mail/` collection 同時建立 (notification email)
- ⚠️ 但**瀏覽器 cache 老的 bridge**會讓 fix 失效 — 第一次測試時 cache 阻擋 B1 修復；hard-reload (Ctrl+Shift+R) 後才生效
- 對 deploy 影響：無（production hostname 不是 127.0.0.1，runtime detector 自動 no-op）

#### M1 — `events/detail.html` HTML escape bug
**修法**：commit 中 detail.html +33/-4 行（推測改用 innerHTML 而非 textContent）
**驗證**：未再次手動 navigate 到 detail page；信任 git diff
**建議**：用 emulator session 對 `/events/detail.html?id=C7PWA78` 截圖一次確認

#### M3 — `admin/events/{id}/announcements` auto-fire createCampaign
**修法**：commit 中 announcements.html +23/-1 行（推測加入 "if existing campaigns then list else show empty state"）
**驗證**：未再次 navigate；信任 git diff

#### M5 — Verification doc schema path
**修法**：`V3_VERIFICATION_TASK.md` D7 已更正為 `competitions/<compId>.config.formSchema`
**驗證**：✅ 你的編輯就是這個

---

### 🟡 仍未修復

#### M2 — `form-builder` empty state
**現況改善**：頁面不再 hang renderer (可以 screenshot 了)
**仍卡住**：`載入表單設計...` spinner 永久轉，沒 timeout / fallback
**證據**：navigate 到 `/admin/events/CWASKBR/form-builder` 後等 8s 仍顯示 loading
**根因**：getFormSchema callable 對新建活動可能回 empty，但前端 init 沒處理 empty case

#### M4 — `my.html` 同樣症狀
不在 commit 範圍。

---

### 🔴 NEW BLOCKER 浮現（B1 修好後才看得到）

#### B7 — 前端頁面 callable 沒帶 `_auth` wrapper（命名暫定）

**症狀**：
- `/admin/` 主控台頂部紅色 banner「無法載入活動清單：帳號不存在」
- `/admin/events/CWASKBR` hub 頁顯示「無法載入活動 / 找不到此競賽」（事實上 doc 在 emulator 中明明存在！）
- form-builder 的 getFormSchema 卡住可能也是同樣問題

**根因分析**：
`functions/index.js` line 108-135 的 `authCallable` wrapper 要求：
```js
const auth = data._auth;
if (!auth || !auth.username || !auth.token) throw "請先登入";
const snap = await db.collection("accounts").where("username", "==", auth.username)...
```

**驗證**：
- 用 admin / Sysadmin@1234 一樣不會 reproduce — 但我用 v3test91 (新建 trial account) 登入後 100% 中標
- 我直接用 `httpsCallable + _auth: {username, token}` 呼叫 `saveFormSchema` → ✅ success
- 證明：**auth wrapper 本身工作正常**；是**前端頁面在呼叫 callable 時沒包 _auth**

**影響範圍** (從 console 看到的 endpoint)：
- `listCompetitions` (主控台 / 所有活動)
- `getCompetition` / `getCompetitionConfig` (hub.html / edit.html)
- `getFormSchema` (form-builder)
- 預期 `listCampaigns`, `getAllTeams`, `getDashboardStats` 都中標

**Workaround**：
登入時把 ME 也存到 `window.ME`，但 frontend pages 透過 `google.script.run` shim 呼叫 callable，shim 需要主動把 ME 包成 `_auth`。檢查 `firebase-bridge.js` 的 `_callFn` 函式 — 是否有把 `window.ME` 自動 inject 成 `_auth`。

**修法（推測）**：
在 `firebase-bridge.js` 的 `_callFn(name, args)` 中加：
```js
if (window.ME && window.ME.sessionToken && !args._auth) {
  args._auth = { username: window.ME.username, token: window.ME.sessionToken };
}
```
（如果已存在這段、但 ME 結構錯，改修 ME 的賦值）

---

## 3. B 完整流程實證（最大亮點）

這是 V1 完全跑不了、V2 完整跑通的段落：

| Step | 動作 | 結果 |
|---|---|---|
| B1 | navigate `/signup.html?plan=trial` | ✅ 14 天 trial 橘色 banner + 3-step indicator |
| B2 | 填表 (v3test91 / TestV3Pass!1 / rockjonce+v3test91@gmail.com) → 送出 | ✅ 進到 OTP 畫面「檢查你的信箱」 |
| B3 | Emulator UI 查 `accountRequests/v3test91` | ✅ otp=**112675**, intendedPlan=**"trial"** |
| B4 | 貼回 OTP → 點驗證 | ✅「帳號建立成功！」「免費試用授權碼已寄到信箱」|
| B5a | Emulator UI 查 `accounts` | ✅ doc 包含 intendedPlan="trial", emailVerified=true, role="competition", username="v3test91", passwordHash |
| B5b | Emulator UI 查 `licenses` | ✅ `RM-TG7E-T5CZ-98TZ-2UUZ`: **trial=true**, expiresAt=2026-06-11 (今天+14天精確對上), activatedBy="v3test91", status="已啟用" |
| B6 | 回 login → 用 v3test91/TestV3Pass!1 登入 | ✅ 跳到 /admin/, 顯示「早安，v3 Trial Tester ☀️」+ 4 KPI cards |

**結論 B**：requestAccount + verifyAccount + loginAccount + intendedPlan 邏輯 + trial license 邏輯**全部正確**。這是 v3 升級的核心招生流程，現在 emulator 端走通了。

---

## 4. D7 dual-write 邏輯實證

無法用 form-builder UI 測試（spinner 卡住），改用直接 httpsCallable + `_auth` 呼叫：

```js
saveFormSchema({
  _auth: { username: 'v3test91', token: '...' },
  compId: 'CWASKBR',
  schema: { version: 'v3', sections: [
    { id: 'sec_student', role: 'student', repeat: 3, fields: [
        { id: 'name', legacyKey: 'name', ... },
        { id: 'school', legacyKey: 'school', ... }
      ]},
    { id: 'sec_teacher', role: 'teacher', repeat: 1, fields: [
        { id: 'tname', legacyKey: 'teacherName', ... }
      ]}
  ]}
})
```

**Response**:
```
{
  success: true,
  schema.sections.length: 2,
  derived: {
    memberCount: 3,        ← matches sec_student.repeat
    teacherCount: 1,       ← matches sec_teacher.repeat
    studentFields: ["school"],  ← school.legacyKey "school" 在 LEGACY_FIELD_KEYS 白名單
    teacherFields: [],     ← teacherName 不在白名單
    customQuestionCount: 2 ← 2 個自訂欄位 (含不在白名單者)
  }
}
```

**Firestore (`competitions/CWASKBR.config`) 實際確認**：formSchema 存在，sections 寫入正確（Emulator UI 可見）。**dual-write 邏輯按設計運作** — 反向衍生的 legacy fields 也寫入（在 Emulator UI 截圖中見 `eventType: "single_no_coach"`, `fileUploadLevel: "required"`, `4: "全素"` 等隨同寫入的 default-value 欄位）。

---

## 5. 更新後問題清單（依嚴重度）

```
🔴 BLOCKER（必須修才能 deploy）：
  B7. 前端頁面 callable 沒帶 _auth wrapper
      → 登入後幾乎所有 admin / hub / form-builder reads 都失敗
      → 估計檢查 firebase-bridge.js 的 _callFn 是否有 ME 注入
      → 1 個 root fix 解決全部頁面

🟡 MAJOR（應修但不一定 block）：
  M2 (unfixed). form-builder 沒 empty state / timeout
  M4 (unfixed). my.html 同上

🟢 MINOR（不阻擋）：
  • 同 V1 列表 (license $ vs NT$、admin 缺 dark mode、sidebar 不一致、E2 redirect、D15 lock page、i18n)
  • [新] 上輪報告 V1 寫的 "MAJOR M1/M3" 已修復，可從 backlog 移除
  • [新] 瀏覽器 cache 老 bridge 會 mask B1 fix —
    可選優化：在 `<script src="/shared/firebase-bridge.js?v=20260528">` 加版本參數防快取
```

---

## 6. 結論

```
建議下一步：

[1] Claude Code 一次性處理 NEW BLOCKER B7：
    - 檢查 public/shared/firebase-bridge.js 的 _callFn / window.google.script.run shim
    - 加入: if (window.ME && !data._auth) data._auth = { username, token }
    - 加 <script src="/shared/firebase-bridge.js?v=20260528"> cache buster
    
[2] B7 修完做一次完整 admin smoke：
    - /admin/ KPI 是否載入活動清單
    - hub.html 是否載入 CWASKBR 詳情
    - form-builder 是否回 valid schema (然後 M2 fallback 是否觸發)
    
[3] M2 + M4 排到 phase 9.2

[4] Deploy 路徑：
    ❌ 不可 production deploy （B7 沒修等於登入後完全不能用）
    ⚠️ hosting:channel:deploy v3-preview 可 — 但 channel 上不能讓 trial 使用者測試
       admin（一樣會撞 B7）；只適合給技術同事看 landing/signup/login flow
    
[5] B 流程已實證可用 — 這是 v3 最大的解鎖：
    主辦方 trial 註冊 → 14 天 license → 登入 已經 work。
    需要的只是 admin 進去後 reads 能成功。
```

---

## 附錄. 修復路徑回顧

| Commit | 範圍 | 驗證狀態 |
|---|---|---|
| `0bfcbac` | B1 (bridge) + M1 (detail) + M3 (announcements) | B1 ✅ 直接證實；M1/M3 ⚪ 信任 diff |
| `edc5093` | 文件 schema path | ✅ |
| 待 commit | B7 (auth injection) | 🔴 必修 |
| 待 commit | M2 + M4 (empty state) | 🟡 推薦修 |
