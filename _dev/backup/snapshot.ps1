# =============================================================================
# RegMaster — 建立還原點快照 (snapshot.ps1)
# =============================================================================
# Usage:
#   .\_dev\backup\snapshot.ps1 -SnapshotId pre-v3-upgrade-2026-05-27
#
# 建立 5 層快照：
#   1. Git tag
#   2. Firestore export → gs://regmaster-pro-v2/<snapshotId>/firestore/
#   3. Cloud Storage backup → gs://regmaster-pro-v2/<snapshotId>/storage/
#   4. Firebase Auth export → _dev/backup/auth-<snapshotId>.json
#   5. Deploy state record → _dev/backup/SNAPSHOT.md (appended)
#
# 全程對 production 零影響（純讀取）。
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$SnapshotId,

    [string]$Project = "regmaster-pro",
    [string]$BackupBucket = "regmaster-pro-v2",

    [switch]$SkipFirestore,
    [switch]$SkipStorage,
    [switch]$SkipAuth,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $ProjectRoot

$Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"
$AuthFile = "_dev/backup/auth-$SnapshotId.json"
$FsExportPath = "gs://$BackupBucket/$SnapshotId/firestore/"
$StorageBackupPath = "gs://$BackupBucket/$SnapshotId/storage/"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " RegMaster Snapshot: $SnapshotId" -ForegroundColor Cyan
Write-Host " Timestamp: $Timestamp" -ForegroundColor Cyan
Write-Host " Project: $Project" -ForegroundColor Cyan
Write-Host " Backup bucket: gs://$BackupBucket/$SnapshotId/" -ForegroundColor Cyan
if ($DryRun) { Write-Host " [DRY RUN MODE - no commands will execute]" -ForegroundColor Yellow }
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

function Invoke-Step {
    param([string]$Label, [scriptblock]$Action)
    Write-Host ">>> $Label" -ForegroundColor Green
    if ($DryRun) {
        Write-Host "    (dry-run: skipped)" -ForegroundColor Yellow
        return
    }
    & $Action
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        throw "Step failed: $Label (exit $LASTEXITCODE)"
    }
}

# -----------------------------------------------------------------------------
# Layer 2: Firestore export (async)
# -----------------------------------------------------------------------------
if (-not $SkipFirestore) {
    Invoke-Step "Layer 2: Firestore export -> $FsExportPath" {
        gcloud firestore export $FsExportPath --project=$Project --async
    }
} else {
    Write-Host ">>> Layer 2: Firestore export SKIPPED" -ForegroundColor Yellow
}

# -----------------------------------------------------------------------------
# Layer 3: Cloud Storage backup
# -----------------------------------------------------------------------------
if (-not $SkipStorage) {
    Invoke-Step "Layer 3: Cloud Storage backup -> $StorageBackupPath" {
        gcloud storage cp --recursive `
            "gs://$Project.firebasestorage.app/competitions" `
            $StorageBackupPath `
            --project=$Project
    }
} else {
    Write-Host ">>> Layer 3: Cloud Storage backup SKIPPED" -ForegroundColor Yellow
}

# -----------------------------------------------------------------------------
# Layer 4: Firebase Auth export
# -----------------------------------------------------------------------------
if (-not $SkipAuth) {
    Invoke-Step "Layer 4: Firebase Auth export -> $AuthFile" {
        firebase auth:export $AuthFile --project=$Project
    }
} else {
    Write-Host ">>> Layer 4: Auth export SKIPPED" -ForegroundColor Yellow
}

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Snapshot $SnapshotId triggered." -ForegroundColor Green
Write-Host ""
Write-Host " Next steps:" -ForegroundColor Cyan
Write-Host "  1. Firestore export runs async. Check status with:" -ForegroundColor White
Write-Host "       gcloud firestore operations list --project=$Project" -ForegroundColor Gray
Write-Host "  2. Layer 1 (Git tag) and Layer 5 (deploy state record) are handled" -ForegroundColor White
Write-Host "     externally (by the orchestrator that runs this script)." -ForegroundColor White
Write-Host "  3. Auth file: $AuthFile (not committed; in .gitignore)" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
