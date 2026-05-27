# Snapshot: `pre-v3-upgrade-2026-05-27`

> 在 v3 UI 全面升級動工前建立的完整還原點。
> 一個指令還原：`.\_dev\backup\restore.ps1 -SnapshotId pre-v3-upgrade-2026-05-27`

---

## Meta

| 項目 | 值 |
| --- | --- |
| Snapshot ID | `pre-v3-upgrade-2026-05-27` |
| 建立時間 | 2026-05-27 (Asia/Taipei) |
| 建立者 | rockjonce@gmail.com |
| Firebase project | `regmaster-pro` |
| Firestore region | `asia-east1` |
| Firestore database | `(default)` |
| Hosting site | `regmaster-pro.web.app` |
| Backup bucket | `gs://regmaster-pro-v2/pre-v3-upgrade-2026-05-27/` |
| 用途 | v3 設計升級前的還原點，預估保留 3 個月（至 2026-08-27） |

---

## Layer 1 · Git 程式碼

| 項目 | 值 |
| --- | --- |
| Tag name | `pre-v3-upgrade-2026-05-27` |
| Tag commit | （commit + tag 後填入；見 `git show pre-v3-upgrade-2026-05-27`） |
| Branch at snapshot | `main` |
| Parent commit | `36f871356e3426203e28d766ce7f1dacd5ef2e98` ("baseline: pre UI redesign snapshot (2026-05-05)") |

**設定檔 blob hash**（變動偵測用）：

| 檔案 | Git blob SHA |
| --- | --- |
| `firestore.rules` | `c38e3ae32eafbb198d38c24a2057b09ed0ed21fe` |
| `storage.rules` | `d692539f1c07570d5fb15655deaaa4decd694656` |
| `firestore.indexes.json` | `2a89083e5a9ec4c92b1a75dc0eba13989948b416` |
| `firebase.json` | `9c7bedd608288caf54de3162c4d6588b69ce6bfe` |

**還原指令**：
```powershell
git checkout pre-v3-upgrade-2026-05-27
```

---

## Layer 2 · Firestore 資料

| 項目 | 值 |
| --- | --- |
| Export 路徑 | `gs://regmaster-pro-v2/pre-v3-upgrade-2026-05-27/firestore/` |
| 觸發指令 | `gcloud firestore export gs://regmaster-pro-v2/pre-v3-upgrade-2026-05-27/firestore/ --project=regmaster-pro --async` |
| 操作狀態查詢 | `gcloud firestore operations list --project=regmaster-pro` |

涵蓋的 collections（所有，因為是整庫 export）：
- `comps`、`teams`、`orders`、`users`、`sessions`、`audit`、`scores`
- `announcements`、`posterFiles`、`emailTemplates`、`notifications`
- `licenses`、`coupons`、`feedback`、`onboarding`（如有）
- 任何其他 production 中存在的 collection

**還原指令**（已封裝在 restore.ps1 Layer 2）：
```powershell
# 找出 metadata path（export 會建立 timestamp 子資料夾）
gcloud storage ls --recursive gs://regmaster-pro-v2/pre-v3-upgrade-2026-05-27/firestore/ |
  Select-String "overall_export_metadata$"

# Import（替換成上一步的真實 URI）
gcloud firestore import <metadata-uri> --project=regmaster-pro
```

⚠️ Import **會覆寫所有 collection 資料**。執行前先設 `cfg.maintenance = true` 並通知用戶。

---

## Layer 3 · Cloud Storage 備份

| 項目 | 值 |
| --- | --- |
| 來源 bucket | `gs://regmaster-pro.firebasestorage.app/` |
| 備份目的 | `gs://regmaster-pro-v2/pre-v3-upgrade-2026-05-27/storage/` |
| 內容 | `competitions/C202603261406373332/` 內 3 個 PDF（rules_*.pdf） |
| 來源大小 | ~4 MB |

**還原指令**（已封裝在 restore.ps1 Layer 3）：
```powershell
gcloud storage cp --recursive `
  gs://regmaster-pro-v2/pre-v3-upgrade-2026-05-27/storage/competitions/ `
  gs://regmaster-pro.firebasestorage.app/ `
  --project=regmaster-pro
```

備註：`storage.rules` 註解寫的「沒使用 Cloud Storage」與實際情況不一致——此 bucket 內有透過 admin SDK（`uploadRulesPdf` callable）上傳的 PDF。v3 升級期間若有新上傳的檔案，restore 會以快照當下狀態為準（新檔案會遺失）。

---

## Layer 4 · Firebase Auth users

| 項目 | 值 |
| --- | --- |
| 匯出檔 | `_dev/backup/auth-pre-v3-upgrade-2026-05-27.json` |
| 觸發指令 | `firebase auth:export _dev/backup/auth-pre-v3-upgrade-2026-05-27.json --project=regmaster-pro` |
| Git 狀態 | **不 commit**（`.gitignore` 排除 `_dev/backup/auth-*.json`，避免外洩 password hash） |

備註：RegMaster 用自建 sessions（Firestore `sessions` collection、`loginAccount` callable），Firebase Auth users 可能為空或極少。此備份是防護性的。

**還原指令**（已封裝在 restore.ps1 Layer 4）：
```powershell
firebase auth:import _dev/backup/auth-pre-v3-upgrade-2026-05-27.json `
  --project=regmaster-pro --hash-algo=STANDARD_SCRYPT
```

---

## Layer 5 · Deploy 狀態紀錄

### Hosting

| 項目 | 值 |
| --- | --- |
| Site | `regmaster-pro` |
| Live channel URL | `https://regmaster-pro.web.app` |
| Last release time | `2026-04-20 14:15:20` (UTC+8 推估) |
| Expire time | `never` |

說明：Firebase Hosting 自動保留歷史版本，可用 `firebase hosting:clone` 在 1 分鐘內回滾，無須等 restore.ps1。

### Functions

| 項目 | 值 |
| --- | --- |
| Callable 總數 | **95** 個（CLI 計算 `functions:list \| grep -c callable`） |
| Plus onRequest | 2 個（`payuniNotify`、`payuniRegNotify`） |
| Generation | v2（全部） |
| Region | `us-central1` |
| Runtime | nodejs20 |
| Memory | 256 MB（預設） |

說明：所有 callable 程式碼在 `functions/index.js`（git 已涵蓋）。Functions 部署版本由 Firebase 平台保留，restore 流程的 Layer 5 會 `firebase deploy --only functions` 從 git tag 重 deploy。

### 緊急 1 分鐘回滾 Hosting（不用跑 restore.ps1）

```powershell
# 列出最近版本
firebase hosting:releases:list --site=regmaster-pro

# 切回前一版（從上面找 versionName）
firebase hosting:clone <site>:<versionId> regmaster-pro:live
```

---

## 還原使用情境

| 情境 | 建議動作 |
| --- | --- |
| **發現 UI bug、想換回舊樣式** | 用 1-min hosting rollback：`firebase hosting:clone` |
| **發現 schema migration 錯誤、資料壞了** | 跑 `restore.ps1 -SnapshotId ... -SkipAuth -SkipStorage`（只還原 Firestore + Git + 重 deploy） |
| **想完整放棄 v3 升級、回到 2026-05-27** | 跑 `restore.ps1 -SnapshotId pre-v3-upgrade-2026-05-27`（含所有 5 層） |

---

## 不涵蓋

- **PayUni 端的交易狀態**：第三方狀態還原我們碰不到
- **dev 期間 production 累積的新資料**：restore 會覆寫
- **dev 期間發出的 Email / SMS**：不可逆
- **dev 期間累積的 audit logs**：保留（可手動篩選）

---

## 保留期

- **計畫保留至 2026-08-27**（3 個月）
- 過期可刪：
  - GCS：`gcloud storage rm --recursive gs://regmaster-pro-v2/pre-v3-upgrade-2026-05-27/`
  - Auth file：`Remove-Item _dev/backup/auth-pre-v3-upgrade-2026-05-27.json`
  - Git tag：`git tag -d pre-v3-upgrade-2026-05-27`
