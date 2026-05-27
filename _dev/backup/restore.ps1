# =============================================================================
# RegMaster — 一鍵還原腳本 (restore.ps1)
# =============================================================================
# 把專案還原到 snapshot 建立時的狀態（5 層）：
#   1. Git: checkout 對應 tag
#   2. Firestore: import 從 GCS backup
#   3. Cloud Storage: cp 回 firebasestorage.app
#   4. Firebase Auth: import 使用者
#   5. Redeploy: firebase deploy --only hosting,functions
#
# Usage:
#   # 互動式（每層詢問）：
#   .\_dev\backup\restore.ps1 -SnapshotId pre-v3-upgrade-2026-05-27
#
#   # 跳過所有確認（全部 yes）：
#   .\_dev\backup\restore.ps1 -SnapshotId pre-v3-upgrade-2026-05-27 -All
#
#   # 只列出會做什麼、不執行：
#   .\_dev\backup\restore.ps1 -SnapshotId pre-v3-upgrade-2026-05-27 -DryRun
#
# 警告：
#   - Layer 2 (Firestore import) 會「覆寫」所有 collection 的資料
#   - Layer 3 (Storage cp) 會「覆寫」同名檔案
#   - 執行前請先停掉 production 寫入流量（cfg.maintenance: true）
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$SnapshotId,

    [string]$Project = "regmaster-pro",
    [string]$BackupBucket = "regmaster-pro-v2",

    [switch]$All,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $ProjectRoot

$LogFile = "_dev/backup/RESTORE_LOG_$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
$AuthFile = "_dev/backup/auth-$SnapshotId.json"
$FsExportPath = "gs://$BackupBucket/$SnapshotId/firestore/"
$StorageBackupPath = "gs://$BackupBucket/$SnapshotId/storage/competitions/"

# Output to both console and log
function Log {
    param([string]$Msg, [string]$Color = "White")
    Write-Host $Msg -ForegroundColor $Color
    Add-Content -Path $LogFile -Value "[$(Get-Date -Format 'HH:mm:ss')] $Msg"
}

function Confirm-Step {
    param([string]$Question)
    if ($All) { return $true }
    if ($DryRun) { return $true }
    $ans = Read-Host "$Question (Y/n)"
    return ($ans -eq "" -or $ans -eq "y" -or $ans -eq "Y")
}

function Invoke-RestoreStep {
    param([string]$Label, [scriptblock]$Action, [string]$Question)
    Log ""
    Log "================================================" Cyan
    Log " $Label" Cyan
    Log "================================================" Cyan

    $proceed = Confirm-Step $Question
    if (-not $proceed) {
        Log "  [SKIPPED by user]" Yellow
        return $false
    }

    if ($DryRun) {
        Log "  (dry-run: would execute)" Yellow
        return $true
    }

    & $Action
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        Log "  FAILED (exit $LASTEXITCODE)" Red
        throw "Restore step failed: $Label"
    }
    Log "  [OK]" Green
    return $true
}

# -----------------------------------------------------------------------------
# Banner
# -----------------------------------------------------------------------------
Log ""
Log "==========================================================" Cyan
Log " RegMaster RESTORE: $SnapshotId" Cyan
Log " Project: $Project" Cyan
Log " Backup bucket: gs://$BackupBucket/$SnapshotId/" Cyan
Log " Log file: $LogFile" Cyan
if ($DryRun) { Log " [DRY RUN MODE - no commands will execute]" Yellow }
if ($All)    { Log " [ALL MODE - skipping all per-step confirmations]" Yellow }
Log "==========================================================" Cyan

if (-not $DryRun -and -not $All) {
    Log ""
    Log "WARNING: This will overwrite production data + redeploy." Red
    Log "Make sure cfg.maintenance is true before continuing." Yellow
    $confirm = Read-Host "Type 'RESTORE' to continue"
    if ($confirm -ne "RESTORE") {
        Log "Aborted by user." Red
        exit 1
    }
}

# -----------------------------------------------------------------------------
# Layer 1: Git checkout
# -----------------------------------------------------------------------------
Invoke-RestoreStep `
    -Label "[1/5] Git: checkout tag $SnapshotId" `
    -Question "Checkout git tag '$SnapshotId'? (this changes your working tree)" `
    -Action {
        git stash push -u -m "auto-stash-before-restore-$SnapshotId" 2>&1 | Out-String | Write-Host
        git checkout $SnapshotId
    } | Out-Null

# -----------------------------------------------------------------------------
# Layer 2: Firestore import
# -----------------------------------------------------------------------------
Invoke-RestoreStep `
    -Label "[2/5] Firestore: import from $FsExportPath" `
    -Question "Restore Firestore data? (THIS OVERWRITES PRODUCTION DATA)" `
    -Action {
        # Find the actual export metadata file (firestore export creates a timestamp subfolder)
        $metaPath = gcloud storage ls --recursive $FsExportPath --project=$Project 2>&1 |
            Select-String -Pattern "overall_export_metadata$" |
            Select-Object -First 1
        if (-not $metaPath) {
            throw "Cannot find overall_export_metadata under $FsExportPath"
        }
        $metaUri = $metaPath.Line.Trim()
        Log "  Importing from: $metaUri" White
        gcloud firestore import $metaUri --project=$Project
    } | Out-Null

# -----------------------------------------------------------------------------
# Layer 3: Cloud Storage
# -----------------------------------------------------------------------------
Invoke-RestoreStep `
    -Label "[3/5] Cloud Storage: cp $StorageBackupPath -> gs://$Project.firebasestorage.app/competitions/" `
    -Question "Restore Cloud Storage files? (overwrites existing files)" `
    -Action {
        gcloud storage cp --recursive `
            $StorageBackupPath `
            "gs://$Project.firebasestorage.app/" `
            --project=$Project
    } | Out-Null

# -----------------------------------------------------------------------------
# Layer 4: Firebase Auth import
# -----------------------------------------------------------------------------
Invoke-RestoreStep `
    -Label "[4/5] Firebase Auth: import $AuthFile" `
    -Question "Restore Firebase Auth users? (merges with existing)" `
    -Action {
        if (-not (Test-Path $AuthFile)) {
            Log "  WARNING: $AuthFile not found, skipping" Yellow
            return
        }
        firebase auth:import $AuthFile --project=$Project --hash-algo=STANDARD_SCRYPT
    } | Out-Null

# -----------------------------------------------------------------------------
# Layer 5: Redeploy
# -----------------------------------------------------------------------------
Invoke-RestoreStep `
    -Label "[5/5] Firebase deploy: hosting + functions from restored code" `
    -Question "Deploy restored code to production? (hosting + functions)" `
    -Action {
        firebase deploy --only hosting,functions --project=$Project
    } | Out-Null

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
Log ""
Log "==========================================================" Cyan
Log " RESTORE COMPLETE: $SnapshotId" Green
Log " Log: $LogFile" Cyan
Log ""
Log " Post-restore checklist:" Cyan
Log "  [ ] Set cfg.maintenance = false in Firestore" White
Log "  [ ] Verify a sample page loads at https://regmaster-pro.web.app" White
Log "  [ ] Spot-check one registration's data" White
Log "  [ ] Notify users / customer service if applicable" White
Log "==========================================================" Cyan
