# Noto Sans TC subset 重產腳本
# 用途：Phase 4c 證書 PDF 生成的中文字型來源
#
# 使用：
#   cd functions\fonts
#   .\subset.ps1
#
# 前置作業：
#   python -m pip install --user fonttools brotli

$ErrorActionPreference = "Stop"
$pyftsubset = "C:\Users\rockj\AppData\Roaming\Python\Python314\Scripts\pyftsubset.exe"

if (-not (Test-Path $pyftsubset)) {
    Write-Error "pyftsubset 不存在於 $pyftsubset。請先執行：python -m pip install --user fonttools brotli"
    exit 1
}

# Step 1: 下載原始 OTF
Write-Host "[1/3] 下載原始 Noto Sans CJK TC OTF（各 ~16 MB）..." -ForegroundColor Cyan
$urlReg = "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Regular.otf"
$urlBold = "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Bold.otf"
Invoke-WebRequest -Uri $urlReg -OutFile "NotoSansTC-Regular.ttf"
Invoke-WebRequest -Uri $urlBold -OutFile "NotoSansTC-Bold.ttf"

# Step 2: subset
Write-Host "[2/3] Subset Regular..." -ForegroundColor Cyan
$ranges = "U+0020-007F,U+00A0-00FF,U+2000-206F,U+2070-209F,U+2100-214F,U+2190-21FF,U+25A0-25FF,U+3000-303F,U+3100-312F,U+31A0-31BF,U+3400-4DBF,U+4E00-9FFF,U+FF00-FFEF"
# Note: U+3400-4DBF (CJK Extension A) added for rare Taiwanese name characters (e.g. 喆/淼/彧/珺)
# Without Extension A, ~2-3% of Taiwan names would render as tofu (□)

& $pyftsubset NotoSansTC-Regular.ttf `
  --output-file=NotoSansTC-Regular.subset.ttf `
  --unicodes="$ranges" `
  --layout-features='*' --no-hinting --desubroutinize `
  --drop-tables+=DSIG,GSUB,GPOS

Write-Host "[2/3] Subset Bold..." -ForegroundColor Cyan
& $pyftsubset NotoSansTC-Bold.ttf `
  --output-file=NotoSansTC-Bold.subset.ttf `
  --unicodes="$ranges" `
  --layout-features='*' --no-hinting --desubroutinize `
  --drop-tables+=DSIG,GSUB,GPOS

# Step 3: 清理原檔
Write-Host "[3/3] 刪除原始 ttf..." -ForegroundColor Cyan
Remove-Item NotoSansTC-Regular.ttf, NotoSansTC-Bold.ttf

# 結果
Write-Host ""
Write-Host "=== 完成 ===" -ForegroundColor Green
Get-ChildItem NotoSansTC-*.subset.ttf | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  $($_.Name): $sizeMB MB"
}
