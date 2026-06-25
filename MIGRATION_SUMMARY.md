# RegMaster V3 → 正式機上線遷移 Summary

> **日期**：2026-06-25　**執行帳號**：rockjonce@gmail.com
> 把測試站 **regmaster-v3** 的完整程式碼與資料庫，搬入並覆蓋正式機 **regmaster-pro**（原 V1 已備份後清除）。
> **全程對 regmaster-v3 唯讀，未更動 v3 任何資料或程式碼。**

---

## 1. 專案對應（`.firebaserc`）

| alias | project | 角色 |
|---|---|---|
| `default` / `v3` | **regmaster-v3** | 測試 / staging（也是這次遷移的 source of truth，未被更動） |
| `prod` | **regmaster-pro** | **正式機**（本次上線目標） |

部署正式機請用 `--project regmaster-pro`（或 `-P prod`）。

## 2. 遷移內容與數據

| 元件 | 做法 | 結果 |
|---|---|---|
| **Firestore** | 雙 Admin SDK：讀 v3、寫 pro（先清空 pro 全集合再寫入） | **2,130 docs / 28 collections**，逐集合比對 **0 不符** |
| `mail` 集合 | **刻意略過**（避免 firestore-send-email 擴充重寄信） | pro 寄信佇列留空 |
| **Storage** | v3 app bucket 本就空（檔案存在 Firestore），pro V1 殘檔已清 | pro app bucket 空，與 v3 一致 |
| **Hosting** | `firebase deploy --only hosting -P prod`（本機 `public/`） | **194 檔**上線，含 ~958MB 教學影片（zh+en），取代舊 V1 catch-all 站 |
| **Functions** | `firebase deploy --only functions -P prod --force` | **228 個**（= v3）；CPU 配額瞬間超標致 29 個失敗，分批重試後全數補齊 |
| pro 獨有舊函式 | `productionReset` | 已刪除 |
| 錄影後門 `recordingTool` | 不存在於程式碼 | 已確認 pro 無此函式 |
| **Rules + Indexes** | `firebase deploy --only firestore:rules,firestore:indexes,storage -P prod` | 已部署 v3 版規則/索引 |

驗證：pro 函式數 = v3（228）；pro `/`、`/tutorials/`、`/events/`、`/admin/` 皆 200；關鍵函式（loginAccount/createAccount/saveCompetitionConfig/verifyAccount）存在；教學影片/縮圖線上 200。

## 3. 憑證（為何 functions 在 pro 可直接運作）

所有外部服務金鑰都存在 **Firestore**，已隨資料一起搬到 pro，無需另設環境密鑰：
- **PayUNI**：各競賽 `config`（payuniHashKey / HashIV / MerID）
- **Gemini AI**：`config/gemini` 文件
- **報到 QR HMAC**：`appSecrets/checkinHmac`
- **Email**：`firestore-send-email` 擴充功能維持 pro 既有 SMTP 設定（未動）

## 4. 備份（回滾依據）

- **`V1_backup/`** = regmaster-pro V1 完整快照（時間戳 `2026-06-25_104900`）：Firestore 受管匯出 + JSON dump、Storage 兩桶、code（git bundle + 工作目錄）、functions、rules、config。
- 一鍵還原：`V1_backup/RESTORE.bat`（細節見 `V1_backup/README.md`）。
- 雲端冗餘：`gs://regmaster-pro-v2/__V1_backup_export__/2026-06-25_104900`。

## 5. 目錄結構（整理後）

| 路徑 | 內容 | git |
|---|---|---|
| `public/` `functions/` `firebase.json` `.firebaserc` `firestore.rules` `storage.rules` `firestore.indexes.json` `package.json` | **部署中的 app，與 firebase v3 一致** | 追蹤 |
| `_archive/` | 開發歷史文件（見下），本機參考用 | **gitignored** |
| `教學影片/` | 影片製作管線 + 來源素材（6.9 GB） | gitignored |
| `outputs/` | 錄影/暫存產出 | gitignored |
| `V1_backup/` | 正式機 V1 備份 | gitignored |
| `_dev/` | 開發腳本與文件 | 部分追蹤 |

`_archive/` 分類：
- `audits-and-reviews/` — 資安稽核、攻擊劇本、弱點/漏洞報告、code review、上線前稽核與修復指南（**含敏感內容，刻意不入 git**）
- `ux-reports/` — 第四～第十輪 UX 測試報告
- `cowork-prompts/` — cowork 任務提示詞（含英文教學影片製作提示）
- `planning/` — UI 改版規劃

## 6. 待辦 / 注意事項

1. **撤銷用過的 service account keys**：本次遷移用過 2 把 regmaster-v3 金鑰（`...77a4ff22fa`、`...aa1b39e5ee`），本機檔已刪但 **GCP 端可能仍有效** → 到 Console / IAM 撤銷。
2. **repo 根 `serviceAccountKey.json`** 是 **regmaster-pro 正式環境管理員金鑰**（gitignored），躺在磁碟上 → 建議移出 repo 或撤銷。
3. **LINE 登入 callback / 自訂網域**：屬 Firebase 以外設定；若 pro 有自訂網域或 LINE/PayUNI return URL 綁定，請確認指向正式站。
4. **mail 佇列**：pro 為空（刻意），新信件正常運作；歷史寄信紀錄未搬。
5. **教學影片**：zh+en 影片在 pro hosting 上但 gitignored（本機 `public/tutorials/videos/`）→ 任何環境重新 `deploy hosting` 前，務必先把影片補回該目錄，否則會把線上影片刪除。
6. **regmaster-v3** 維持為測試/staging，未受影響；之後改版可先在 v3 驗證再 `-P prod` 上線。

---
*本檔為本次上線遷移的對照與回滾參考；資料層面的回滾走 `V1_backup/`，程式層面 v3 仍為對照基準。*
