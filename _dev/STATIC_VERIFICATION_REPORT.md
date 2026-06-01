# RegMaster v3 静態驗證報告（Static Pass）

> 執行者：Cowork agent（受限：無法啟動本機 emulator、無法替使用者操作 PowerShell 輸入文字）
> 執行時間：2026-05-28
> 範圍：本機檔案層級 + 程式碼存在性驗證（不含 UI / 行為驗證）
> 對應任務：`V3_VERIFICATION_TASK.md` Section A-G

---

## 1. 通過率表格

```
靜態檢查（不需 emulator）

S1: v3 HTML 頁面存在          28/28 ✅ all present
S2: 30 個 callable 函式存在    29/29 ✅ all defined + exported
S3: firebase.json rewrites    10/10 ✅ 全部 destination 都指向實檔
S4: functions/index.js 語法    PASS ✅ node --check exit 0（4329 行）
S5: shared/ scaffolding        3/5 ⚠️ auth.js + components.js 不存在（但無頁面引用，所以不破）
S6: legacy/ 完整保留            ✅ index.html (369KB) + system-settings.html (66KB)
S7: git tag 對齊                ✅ HEAD = de860fe = tag v3-ready-pre-deploy-2026-05-27
S8: 雙寫程式邏輯實作            ✅ saveFormSchema 確實同步寫 formSchema + studentFields/teacherFields/...

需 emulator + 真實瀏覽器
A: 公開頁              ❓ 待驗證
B: 認證流程            ❓ 待驗證
C: 報名者              ❓ 待驗證
D: Admin 後台          ❓ 待驗證（D7 雙寫請見下方注意事項）
E: Legacy 相容性        ❓ 待驗證
F: 視覺檢查            ❓ 待驗證
G: Console / Network    ❓ 待驗證
```

---

## 2. 問題清單（依嚴重度排序）

```
🔴 BLOCKER（必須修才能 deploy）：
  （靜態檢查未發現）

🟡 MAJOR（影響後續驗證或文件正確性）：

  M1. 驗證任務 D7 / 報告 §4 的 schema 路徑寫錯
      - 報告 / 驗證任務說 `comps/<id>.cfg.formSchema`
      - 實際 saveFormSchema 寫到  `competitions/<id>.config.formSchema`
      - 後果：人類 / cowork agent 若照字面在 Emulator UI 找 `comps/<id>`
              會找不到資料，誤判 D7 失敗
      - 修法（擇一）：
          (a) 把 V3_VERIFICATION_TASK.md D7 改為 `competitions/<compId>.config.formSchema`
          (b) 把報告 §4 schema 章節的 collection / 欄位名稱也一併更新
      - 影響範圍：純文件，不需改 code

  M2. 報告聲稱的 shared/auth.js + shared/components.js 不在檔案系統
      - 預期：2 個共用 helper 檔
      - 實際：不存在（grep 也找不到任何頁面引用，所以執行期不會 404）
      - 推測：功能可能已併入 firebase-bridge.js / app-state.js，但 Phase 0 章節
              的描述沒同步更新
      - 修法：把報告 §2 的 shared/ 清單修正為 5 項（移除 auth.js + components.js），
              或補回實檔
      - 影響範圍：文件正確性 / 後續維護指引

🟢 MINOR（記入 backlog）：

  m1. shared/i18n.js 沒有任何 HTML 引用（grep 結果 = 0）
      - 驗證任務 A3 已預先註記「i18n 尚未全套」，所以不算 regression
      - 但檔案存在卻完全沒人載入 → 死碼或忘了 wire
      - 建議：Phase 10 / 11 補上 <script src="/shared/i18n.js"></script> 到至少
              頁首 4 個語言切換看得到的頁面

  m2. shared/admin-layout.css 實際 98 行，報告寫 270 行
      - 純行數差異，不影響功能。可能是後續精簡 / 移到 styles.css
      - 建議：報告 §2 改為「~98 行」

  m3. functions runtime: nodejs20 (firebase.json)
      - 報告稱「Node 24 相容性修補」，實際 deploy target 仍為 Node 20
      - 不算 bug，但若雜訊裡有人解讀為「會 deploy 到 Node 24」會有歧義
      - 建議：報告改為「Node 24 forward-compat patches；deploy 仍鎖 Node 20」
```

---

## 3. 結論

```
建議下一步：

[A] 文件對齊（5 分鐘）：先把 M1 / M2 列出的文件錯誤改掉
    → 否則 cowork agent 跑 D7 / 對照 §4 schema 時會誤判失敗
    → 一旦對齊，下游驗證者不會浪費時間 debug 不存在的問題

[B] 啟動 emulator 進入 live UI 驗證（你本人或我皆可）
    → 受限：我（cowork agent）無法在你的 PowerShell 輸入 `firebase emulators:start`
            因為 computer-use 對 terminal 是 click-only tier，不允許鍵盤輸入
    → 兩個選項：
       (B-1) 你開一個 PowerShell 跑：
             ```
             cd C:\Users\rockj\RegMaster
             firebase emulators:start --only hosting,functions,firestore --project=regmaster-pro
             ```
             看到 "All emulators ready" 後告訴我，我用 Claude in Chrome MCP
             把 A-G 全部跑完，回報三段式 deliverable。
       (B-2) 你自己用瀏覽器跑驗證，照 V3_VERIFICATION_TASK.md 逐項打勾。

[C] 整體狀態評估：
    - 程式碼層面 ✅ 都對齊，沒有 BLOCKER
    - 文件層面 ⚠️ 兩處小錯需修（M1 / M2）
    - UI / 行為 ❓ 沒跑就不知道，靜態檢查無法覆蓋
    - 建議路徑：A → B → 若無 BLOCKER → hosting:channel:deploy v3-preview 1 週
                → 若 channel 沒人回報問題 → production deploy
```

---

## 附錄 A. 詳細靜態檢查證據

### S1 — 28 個 v3 HTML 頁面

全部 28 個檔案存在且非空。完整檔案大小列表（bytes）：

```
public/index.html              45882
public/pricing.html            22075
public/features.html           36079
public/about.html              16552
public/contact.html            19469
public/login.html              12673
public/signup.html             23722
public/forgot.html              7444
public/onboarding.html         27410
public/my.html                 19247
public/events/index.html        (present)
public/events/detail.html       (present)
public/events/register.html     (present)
public/events/payment.html      (present)
public/admin/index.html         (present)
public/admin/ai.html            (present)
public/admin/settings.html      (present)
public/admin/license.html       12365
public/admin/audit.html         (present)
public/admin/super.html         12365
public/admin/events/index.html  (present)
public/admin/events/hub.html    35324
public/admin/events/edit.html   38765
public/admin/events/form-builder.html    42063
public/admin/events/announcements.html   19890
public/admin/events/payments.html        14143
public/admin/events/scoring.html         15205
public/admin/events/checkin.html         13711
```

註：報告 §1 寫「24 個」，實際清單列出 28 個；以實際清單為準。

### S2 — 29 個 callable 全部存在 + exported

`functions/index.js` 中 29 個 callable name 全數出現且都有 `exports.<name> =` 宣告。

### S3 — firebase.json rewrites 10/10

每一條 rewrite 的 destination HTML 都實檔存在（見執行紀錄）。

### S4 — 語法檢查

```
$ node --check functions/index.js
EXIT=0
4329 行
```

### S5 — shared/ 實際清單

```
public/shared/admin-layout.css   8697 bytes   98 lines
public/shared/app-state.js       5274 bytes  145 lines
public/shared/firebase-bridge.js 11766 bytes  285 lines
public/shared/i18n.js             7343 bytes   78 lines
public/shared/styles.css         21239 bytes  681 lines
                                 ──────────
                                 5 files (報告稱 7 個)
```

引用統計：
```
firebase-bridge.js: 25 / 28 頁面引用
app-state.js:       29 / 28 頁面引用（多算的是腳本自我引用）
styles.css:         29 / 28 頁面引用（同上）
admin-layout.css:   13 / 28 頁面引用（只有 admin 子樹引用，符合預期）
i18n.js:             0 / 28 頁面引用 ⚠️  完全沒接上
auth.js:             不存在
components.js:       不存在
```

### S6 — legacy fallback

```
public/legacy/index.html             369193 bytes（mtime: May 8, 與 v1 snapshot 一致）
public/legacy/system-settings.html    66370 bytes
```

### S7 — git state

```
HEAD: de860fe phase 9: polish + legacy migration + cleanup script (PRE-DEPLOY READY)
tag pointing at HEAD: v3-ready-pre-deploy-2026-05-27 ✅
tag also present:     pre-v3-upgrade-2026-05-27       ✅
remote:               none configured (符合「不要 push to remote」)
working tree:         看似 dirty，但 diff stat 顯示
                      8298 insertions / 8298 deletions（完全對等）
                      → 純粹是 CRLF↔LF line-ending 幻覺（Linux sandbox 上跑 git
                      讀 Windows checkout），不是真的修改
```

### S8 — 雙寫實作真實存在

`functions/index.js` line 3994-4055，`exports.saveFormSchema`：

```javascript
const derived = deriveLegacyFromFormSchema(cleanSchema);
const update = {
  'config.formSchema': cleanSchema,
  'config.studentFields': derived.studentFields,
  'config.teacherFields': derived.teacherFields,
  'config.customQuestions': derived.customQuestions,
  'config.memberCount': derived.memberCount,
  'config.teacherCount': derived.teacherCount
};
if (derived.dietaryOptions !== undefined) update['config.dietaryOptions'] = derived.dietaryOptions;
if (derived.tshirtOptions !== undefined) update['config.tshirtOptions'] = derived.tshirtOptions;
await db.collection("competitions").doc(compId).update(update);
```

雙寫策略確實在 code 中落地：新 schema + 反向衍生舊欄位，single update 原子寫入。
**只是寫到的路徑是 `competitions/{id}.config.*`，不是報告/驗證任務寫的 `comps/{id}.cfg.*`** —
請見 M1 finding。

### S8.5 — trial / intendedPlan 補強真實存在

`functions/index.js` line 839-1054（`requestAccount` + `verifyAccount`）：
- ✅ `intendedPlan` 第 6 參數接得到
- ✅ trial/starter/pro 觸發 14 天 license（`trial: true` marker）
- ✅ Email 範本依 intendedPlan 客製文案
- ✅ verifyAccount 回 `{ success, plan, isTrial }`，供前端依方案分流
