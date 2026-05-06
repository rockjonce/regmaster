# Cloud Functions 中文字型（Noto Sans TC, subset）

> Phase 4c 證書 PDF 生成用，puppeteer + chromium 預設不含中文字型，必須自帶。

## 目前檔案

| 檔案 | 大小 | 用途 |
|---|---|---|
| `NotoSansTC-Regular.subset.ttf` | ~6.7 MB | 證書內文 |
| `NotoSansTC-Bold.subset.ttf` | ~6.7 MB | 證書標題 / 強調 |

合計約 13.4 MB（原始檔 33 MB → subset 後 13.4 MB，縮 60%）。

**v7 update**：新增 CJK Extension A（U+3400-4DBF, ~6,500 字）涵蓋台灣罕用人名字（如「喆」「淼」「彧」「珺」）。
原本 v6 只含 U+4E00-9FFF（CJK 基本區），約 2-3% 的台灣姓名會出現方塊。

## 授權

- 字型來源：[Noto Sans CJK TC](https://github.com/notofonts/noto-cjk)
- 授權：**SIL Open Font License 1.1**（OFL，**可商用、可嵌入、可分發**）
- 著作權：Copyright 2014-2024 Adobe (http://www.adobe.com/)

OFL 1.1 全文：https://scripts.sil.org/OFL

## Subset 範圍（保留的 Unicode）

```
U+0020-007F   Basic Latin（ASCII）
U+00A0-00FF   Latin-1 Supplement（部分歐元、版權符號）
U+2000-206F   General Punctuation
U+2070-209F   Superscripts and Subscripts
U+2100-214F   Letterlike Symbols（℃、℉、™、® 等）
U+2190-21FF   Arrows
U+25A0-25FF   Geometric Shapes
U+3000-303F   CJK Symbols and Punctuation（、。「」等）
U+3100-312F   Bopomofo（注音符號 ㄅㄆㄇ）
U+31A0-31BF   Bopomofo Extended
U+3400-4DBF   CJK Unified Ideographs Extension A（罕用字，台灣人名常見）
U+4E00-9FFF   CJK Unified Ideographs（中日韓統一漢字基本區，包含繁簡）
U+FF00-FFEF   Halfwidth and Fullwidth Forms（全形 ＡＢＣ）
```

## 重新產生 subset（如需更新版本或調整 unicode 範圍）

### 1. 安裝 fonttools
```powershell
python -m pip install --user fonttools brotli
```

執行檔位置（不在 PATH）：
`C:\Users\rockj\AppData\Roaming\Python\Python314\Scripts\pyftsubset.exe`

### 2. 下載原始 ttf
```bash
cd functions/fonts
curl -sL -o NotoSansTC-Regular.ttf \
  "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Regular.otf"
curl -sL -o NotoSansTC-Bold.ttf \
  "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Bold.otf"
```

### 3. 跑 subset
```powershell
$pyftsubset = "C:\Users\rockj\AppData\Roaming\Python\Python314\Scripts\pyftsubset.exe"
$ranges = "U+0020-007F,U+00A0-00FF,U+2000-206F,U+2070-209F,U+2100-214F,U+2190-21FF,U+25A0-25FF,U+3000-303F,U+3100-312F,U+31A0-31BF,U+4E00-9FFF,U+FF00-FFEF"

& $pyftsubset NotoSansTC-Regular.ttf `
  --output-file=NotoSansTC-Regular.subset.ttf `
  --unicodes="$ranges" `
  --layout-features='*' --no-hinting --desubroutinize `
  --drop-tables+=DSIG,GSUB,GPOS

& $pyftsubset NotoSansTC-Bold.ttf `
  --output-file=NotoSansTC-Bold.subset.ttf `
  --unicodes="$ranges" `
  --layout-features='*' --no-hinting --desubroutinize `
  --drop-tables+=DSIG,GSUB,GPOS

# 完成後刪除原檔
rm NotoSansTC-Regular.ttf, NotoSansTC-Bold.ttf
```

> 完整 script 已存在 `subset.ps1`（同目錄）。

## 在 Cloud Functions 內使用（Phase 4c 證書生成）

```javascript
const fs = require('fs');
const path = require('path');

const FONTS_DIR = path.join(__dirname, 'fonts');
const fontRegular = fs.readFileSync(
  path.join(FONTS_DIR, 'NotoSansTC-Regular.subset.ttf')
).toString('base64');
const fontBold = fs.readFileSync(
  path.join(FONTS_DIR, 'NotoSansTC-Bold.subset.ttf')
).toString('base64');

function buildCertHtml(data) {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head><meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Noto Sans TC';
    src: url('data:font/ttf;base64,${fontRegular}') format('truetype');
    font-weight: 400;
  }
  @font-face {
    font-family: 'Noto Sans TC';
    src: url('data:font/ttf;base64,${fontBold}') format('truetype');
    font-weight: 700;
  }
  body { font-family: 'Noto Sans TC', serif; }
  h1 { font-weight: 700; font-size: 32px; }
  .recipient { font-weight: 700; font-size: 28px; }
</style></head>
<body>
  <h1>獲 獎 證 書</h1>
  <div class="recipient">${data.recipientName}</div>
  <p>於 ${data.eventName} 獲得 ${data.rankZh}，特此證明。</p>
</body></html>`;
}

// puppeteer 用
async function renderToPdf(html) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
  await browser.close();
  return pdf;
}
```

## 注意事項

⚠️ subset 字型已移除 GSUB / GPOS layout tables（高級字型功能如 ligatures），證書這類純展示用途無影響。如需保留進階排版，移除 `--drop-tables+=GSUB,GPOS`，但檔案會大 1-2 MB。

⚠️ Cloud Functions deploy 限制 100MB 總大小；目前 subset 字型 + puppeteer-core + chromium 預估 ~150MB → 需獨立 functions runtime（見 [`UI_REDESIGN_PLAN.md`](../../UI_REDESIGN_PLAN.md) Phase 4c.4）。

⚠️ 範例 HTML 中 inline base64 字型會讓單份 PDF render time 略增（每次都要 parse 14MB base64）。生產用 puppeteer 建議改成檔案載入模式（puppeteer 開啟本機 file:// 字型檔），效能較好。
