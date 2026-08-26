// EDM v3.2 — 原始碼守門測試（對「真實檔案」斷言，不是對複製出來的模型）
//
// 立案理由：第一輪與第二輪外審各自抓到 4 項與 10 項缺陷，而 test-recipients.js
// 兩次都 100% 全綠。原因是那支測試把後端邏輯「同構複製」成純函式再測，斷言的是
// 「作者心裡想的邏輯對不對」，不是「index.js / announcements.html 真的長這樣」。
// 真實檔案改壞了，同構測試照樣全綠。
//
// 這支的作法相反：把真實檔案當文字讀進來，對「必須存在／必須不存在」的結構下斷言。
// 它抓不到語意錯誤，但能抓到「防護被拿掉了」——正是前兩輪失守的那一類。
const fs = require('fs');
const path = require('path');
// EDM_ROOT 可指向另一份原始碼樹，用來驗證這組守門「真的有牙齒」：
//   對改動前的版本執行，應該大量失敗（見 README 或 npm 說明）
const ROOT = process.env.EDM_ROOT || path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0, fail = 0;
function chk(name, cond, detail) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail !== undefined ? "  ← " + JSON.stringify(String(detail).slice(0, 200)) : "")); }
}
// 取出某個函式的原始碼片段（從標記字串到下一個同層 exports/function 宣告為止）
// 去掉整行註解。斷言「某個舊寫法必須不存在」時一定要用它 —— 否則說明那個舊寫法
// 為何被淘汰的註解本身，會讓斷言誤報。
function stripComments(src) {
  return src.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
}
function slice(src, startMark, endMark) {
  const i = src.indexOf(startMark);
  if (i < 0) return "";
  const j = endMark ? src.indexOf(endMark, i + startMark.length) : -1;
  return j > 0 ? src.slice(i, j) : src.slice(i);
}

const IDX = read('functions/index.js');
const HTML = read('public/admin/events/announcements.html');
const BRIDGE = read('public/shared/firebase-bridge.js');
const I18N = read('public/shared/i18n-admin-events-announcements.js');

console.log("【後端 A：寄送權必須以交易認領（二審 N1）】");
const deliver = slice(IDX, 'async function _deliverCampaign(', '\nexports.sendCampaignNow');
chk("_deliverCampaign 存在且能切出來", deliver.length > 500, deliver.length);
chk("🚨 使用 db.runTransaction 認領", /db\.runTransaction/.test(deliver));
chk("🚨 status:'sending' 在交易內以 tx.update 寫入", /tx\.update\([^)]*\{\s*status:\s*'sending'/.test(deliver));
chk("🚨 交易內重讀 status（不是沿用函式開頭讀到的舊值）", /await\s+tx\.get\(/.test(deliver));
{
  const posTx = deliver.indexOf('runTransaction');
  const posMail = deliver.indexOf('collection("mail")');
  chk("🚨 認領交易必須排在寫入 mail 之前", posTx > 0 && posMail > 0 && posTx < posMail, { posTx, posMail });
}
chk("交易內擋 'sent'", /st === 'sent'/.test(deliver));
chk("交易內擋 'sending'（中斷後不自動重試）", /st === 'sending'/.test(deliver));
{
  // 語意斷言：不數 _release 出現幾次（多寫一個沒作用的呼叫就能騙過），
  // 而是檢查它「寫進去的是什麼」以及「每個提前 return 都經過它」。
  chk("認領後有歸還機制 _release", /const _release\s*=\s*async \(message, transient\)/.test(deliver));
  chk("🚨 _release 的狀態來自 claim.prevStatus，不是寫死 'draft'（三審 F4）",
    /const back = transient \? claim\.prevStatus : 'draft'/.test(deliver) && /status: back/.test(deliver));
  chk("🚨 暫時性失敗才還原排程（確定性失敗必須退 draft，否則 cron 無限重試）",
    /_release\("找不到活動", true\)/.test(deliver) && /_release\("發送準備失敗[\s\S]{0,90}, true\)/.test(deliver) &&
    /_release\("沒有符合條件的收件人[^)]*\)/.test(deliver) && !/_release\("沒有符合條件的收件人[^)]*, true\)/.test(deliver));
  // 認領之後、寫 mail 之前的每一個 return 都必須走 _release，否則卡在 sending
  // 從 _release 定義「結束之後」起算 —— 它自己的函式體裡當然有 return
  const relEnd = deliver.indexOf('};', deliver.indexOf('const _release')) + 2;
  const between = deliver.slice(relEnd, deliver.indexOf('collection("mail")'));
  const bareReturns = (between.match(/return (?!await _release|_release)\s*\{/g) || []).length;
  chk("🚨 認領後至寫 mail 之間沒有繞過 _release 的裸 return", bareReturns === 0, bareReturns);
  chk("準備階段以 try/catch 包住，例外時歸還而非卡在 sending", /catch \(e\)[\s\S]{0,220}_release\(/.test(deliver));
  chk("🚨 認領時寫入可比較的時間戳（fmtNow 是在地化字串，不能拿來算差）",
    /deliveryStartedMs: Date\.now\(\)/.test(deliver));
}

console.log("【後端 B：fail-closed 白名單（一審 #5 / 二審）】");
chk("CAMPAIGN_FILTERS 白名單存在", /const CAMPAIGN_FILTERS = \['all', 'paid', 'unpaid', 'waitlist', 'custom'\]/.test(IDX));
chk("_normCampFilter 以白名單比對", /_normCampFilter\(v\)\s*\{\s*return CAMPAIGN_FILTERS\.indexOf\(v\) >= 0/.test(IDX));
// 注意：`_normCampFilter((camp && camp.recipientFilter) || 'all')` 是合法的——
// `|| 'all'` 在括號「內」，是驗證「前」補預設值。要擋的是把驗證「結果」降級的寫法，
// 因此對兩個實際賦值點下精確斷言，而不是全檔掃 `|| 'all'`。
chk("🚨 createCampaign 的 recipientFilter 未降級（undefined 才給 all，無效值前面已擋）",
  /recipientFilter: payload\.recipientFilter === undefined \? 'all' : _normCampFilter\(payload\.recipientFilter\),/.test(IDX));
chk("🚨 updateCampaign 的 recipientFilter 未降級",
  /update\.recipientFilter = _normCampFilter\(payload\.recipientFilter\);/.test(IDX));
chk("🚨 兩個賦值點都不得有 `) || 'all'` 尾綴",
  !/recipientFilter[:=][^;\n]*_normCampFilter\(payload\.recipientFilter\)\s*\|\|\s*'all'/.test(IDX));
const createC = slice(IDX, 'exports.createCampaign', 'exports.updateCampaign');
const updateC = slice(IDX, 'exports.updateCampaign', 'exports.deleteCampaign');
chk("🚨 createCampaign 對無效 filter 回傳失敗", /recipientFilter !== undefined && !_normCampFilter/.test(createC) && /success: false/.test(createC));
chk("🚨 updateCampaign 對無效 filter 回傳失敗", /recipientFilter !== undefined && !_normCampFilter/.test(updateC) && /success: false/.test(updateC));
chk("_resolveTeams 未知 filter 回 ok:false", /if \(!f\) return \{ ok: false/.test(IDX));
chk("_normCampRoles 以相異值個數判斷全選（一審 #6）", /new Set\(v\.filter\(r => CAMPAIGN_ROLES/.test(IDX));

console.log("【後端 C：信件內容（一審 #3）】");
const campMsg = slice(IDX, 'function _campaignMessage(', '\n// Core campaign delivery');
chk("🚨 emailWrap 的標題有經過 escMail", /emailWrap\(escMail\(fSubj\)/.test(campMsg));
chk("message.subject 維持未逸出的 fSubj（純文字信頭）", /subject: '\[' \+ \(compName \|\| '活動'\) \+ '\] ' \+ fSubj/.test(campMsg));
chk("先代換、再注入追蹤", campMsg.indexOf('fill(camp.body') < campMsg.indexOf('_injectCampaignTracking') + campMsg.length &&
  /_injectCampaignTracking\(fill\(/.test(campMsg));
chk("以函式取代避開 $& / $1 展開", /\.replace\(v\[0\], \(\) =>/.test(campMsg));

console.log("【後端 D：狀態機（一審 #2 / 二審 N3）】");
const sched = slice(IDX, 'exports.scheduleCampaign', 'exports.trackOpen');
chk("🚨 scheduleCampaign 擋 'sent'", /_st === 'sent'/.test(sched));
chk("🚨 scheduleCampaign 擋 'sending'", /_st === 'sending'/.test(sched));
chk("🚨 cron 只撿 status=='scheduled'", /where\("status", "==", "scheduled"\)/.test(IDX));
chk("cron 有明寫 timeoutSeconds", /processScheduledCampaigns[\s\S]{0,200}timeoutSeconds:\s*300/.test(IDX));
chk("🚨 提供人工恢復途徑 resetCampaignDelivery", /exports\.resetCampaignDelivery/.test(IDX));
const reset = slice(IDX, 'exports.resetCampaignDelivery', '// 測試寄送');
chk("resetCampaignDelivery 只接受 'sending'（不得成為繞過守門的後門）", /camp\.status !== 'sending'/.test(reset));
// 門檻必須真的出現在「條件式裡」並導致提前 return —— 只檢查常數有沒有被提到，
// 會被 `if (false) { … CAMPAIGN_STALE_MS … }` 這種語意退化騙過（實測驗證過）。
chk("🚨 resetCampaignDelivery 有活性門檻（三審 F1：未達門檻＝此刻正在寄，退回會造成重寄）",
  /deliveryStartedMs/.test(reset) &&
  /if \([^)]*CAMPAIGN_STALE_MS[^)]*\)\s*\{[\s\S]{0,300}return \{ success: false/.test(reset));
chk("🚨 門檻大於函式逾時上限的兩倍（超過此時間不可能還有活著的執行）",
  /const CAMPAIGN_STALE_MS = 10 \* 60 \* 1000/.test(IDX));
chk("🚨 sendCampaignNow 也要有 timeoutSeconds（三審 F3：只改 cron 等於擲骰子）",
  /_deliverCampaign\(campaignId, request\.authUser\.username\);[\s\S]{0,400}\}, \{ timeoutSeconds: 300 \}\);/.test(IDX));
chk("authCallable / compAuthCallable 支援選配 fnOpts（不影響既有 200+ 呼叫端）",
  /function authCallable\(roles, handler, fnOpts\)/.test(IDX) && /onCall\(Object\.assign\(\{ cors: true \}, fnOpts \|\| \{\}\)/.test(IDX));
// —— 四審回饋：以下斷言針對「防護被反向或弱化」而非「被刪掉」 ——
chk("🚨 活性門檻的比較方向必須是 age < STALE（反向＝正在寄時放行退回）",
  /if \(age < CAMPAIGN_STALE_MS\)/.test(reset));
chk("🚨 門檻常數以計算值判斷 ≥ 600000（不懲罰等價重構）", (function () {
  const m = IDX.match(/const CAMPAIGN_STALE_MS = ([^;]+);/);
  try { return m && eval(m[1]) >= 600000; } catch (e) { return false; }
})());
chk("🚨 saveThen 本體在取得 cid 之後不得再讀 SELECTED", (function () {
  const body = slice(HTML, 'function saveThen(payload, next)', '\n  }');
  const afterCid = body.slice(body.indexOf('SELECTED.id') + 11);
  return body.indexOf('var cid = SELECTED.id') > 0 && afterCid.indexOf('SELECTED') < 0;
})());
chk("🚨 _resolveTeams 的 custom 排除條件存在（拿掉＝自訂名單寄給全部人）",
  /if \(f === 'custom' && !idSet\.has\(d\.id\)\) return;/.test(IDX));
chk("🚨 _normCampRoles 以 out.length（Set 去重後）判斷全選，不是 v.length", (function () {
  const b = slice(IDX, 'function _normCampRoles', '\n}');
  return /out\.length === CAMPAIGN_ROLES\.length/.test(b) && !/v\.length === CAMPAIGN_ROLES\.length/.test(b);
})());
chk("🚨 四審 N1：updateRecipCount 有請求世代守衛（gen）", (function () {
  const b = slice(HTML, 'function updateRecipCount()', '\n  document.getElementById(\'recipFilter\')');
  if (!/var gen = \+\+RECIP_GEN/.test(b)) return false;
  // 檢查必須在「成功回呼內、寫入 LAST_COUNT 之前」，且不是死碼
  const ok = b.indexOf('withSuccessHandler');
  const seg = b.slice(ok, b.indexOf('LAST_COUNT =', ok));
  return /if \(gen !== RECIP_GEN\) return/.test(seg) && !/if \(false\) return/.test(seg);
})());
chk("🚨 四審 N2：updateCampaign 後端擋 sent / sending", (function () {
  const b = slice(IDX, 'exports.updateCampaign', 'exports.deleteCampaign');
  return /'sent'/.test(b) && /'sending'/.test(b) && /success: false/.test(b);
})());
chk("🚨 四審 N2：testSendBtn 也吃 locked", /testSendBtn'\)\.disabled = locked/.test(HTML));
chk("🚨 四審 N3a：resetCampaignDelivery 的檢查與寫入在同一交易", /runTransaction/.test(reset) && /tx\.update/.test(reset) && /await tx\.get/.test(reset));
chk("🚨 四審 N4：scheduleCampaign 的守門與寫入在同一交易", (function () {
  const b = slice(IDX, 'exports.scheduleCampaign', 'exports.trackOpen');
  return /runTransaction/.test(b) && /tx\.update/.test(b);
})());
chk("resetCampaignDelivery 有 requireCompFeature（四審 N5）", /requireCompFeature\(request, "campaigns"\)/.test(reset));
// —— 五審（Fable）三項 ——
chk("🚨 五審 #1：認領之後沒有未受保護的 await（compDoc 讀取必須在 try 內）", (function () {
  const relEnd2 = deliver.indexOf('};', deliver.indexOf('const _release')) + 2;
  const seg = deliver.slice(relEnd2, deliver.indexOf('collection("mail")'));
  const tryPos = seg.indexOf('try {');
  // stripComments：說明這條規則的註解本身就含「await」一詞，不濾掉會自我誤報
  const awaits = [...stripComments(seg.slice(0, tryPos)).matchAll(/await /g)];
  return tryPos > 0 && awaits.length === 0;   // try 之前不得有任何 await
})());
chk("🚨 五審 #2：updateCampaign 的守門與寫入在同一交易", (function () {
  const b = slice(IDX, 'exports.updateCampaign', 'exports.deleteCampaign');
  return /runTransaction/.test(b) && /await tx\.get/.test(b) && /tx\.update\(doc\.ref, update\)/.test(b) &&
    /'sent'/.test(b) && /'sending'/.test(b);
})());
chk("🚨 六審 (a)：寄送內容快照取自認領交易內（camp: snap.data()），非交易前另讀", (function () {
  return /camp: snap\.data\(\)/.test(deliver) && /const camp = claim\.camp/.test(deliver) &&
    !/const camp = doc\.data\(\)/.test(deliver);
})());
chk("🚨 五審 #3：deleteCampaign 拒刪 'sending'", (function () {
  const b = slice(IDX, 'exports.deleteCampaign', '\n// Rewrite body links');
  return /status === 'sending'/.test(b) && /success: false/.test(b);
})());
chk("resetCampaignDelivery 有活動歸屬檢查", /creator !== request\.authUser\.username/.test(reset));
chk("sendCampaignTest 明寫 manage 能力，不依賴預設值", /exports\.sendCampaignTest = compAuthCallable\("manage"/.test(IDX));
chk("resetCampaignDelivery 明寫 manage 能力", /exports\.resetCampaignDelivery = compAuthCallable\("manage"/.test(IDX));

console.log("【前端 A：所有寫入點都要檢查 res.success（二審 N2）】");
chk("🚨 saveThen 輔助函式存在且會在失敗時 throw", /function saveThen\(payload, next\)[\s\S]{0,300}if \(!r \|\| !r\.success\) throw new Error/.test(HTML));
{
  // 語意斷言，不是逐字轉寫：抓出所有 saveThen 呼叫，檢查它們的「性質」。
  // 前一版把 `function () {` 的空白都寫死，結果把 cid 參數加進去（正確的修正）
  // 反而讓測試誤報紅燈 —— 那種寫法沒有偵測價值，只會懲罰等價重構。
  const calls = [...HTML.matchAll(/saveThen\(payload,\s*function\s*\(([^)]*)\)\s*\{([\s\S]*?)\}\s*\)/g)];
  chk("三個寫入點都走 saveThen", calls.length === 3, calls.length);
  chk("🚨 saveThen 的 callback 都接 campaignId 參數（不再從外部讀）", calls.every(m => m[1].trim().length > 0), calls.map(m => m[1]));
  chk("🚨 saveThen 的 callback 內不得再讀 SELECTED（否則存 A 寄 B）",
    calls.every(m => m[2].indexOf('SELECTED') < 0), calls.map(m => m[2].trim()));
  const eps = calls.map(m => (m[2].match(/runFn\('([a-zA-Z]+)'/) || [])[1]).sort();
  chk("三個端點分別是 scheduleCampaign / sendCampaignNow / sendCampaignTest",
    JSON.stringify(eps) === '["scheduleCampaign","sendCampaignNow","sendCampaignTest"]', eps);
}
chk("🚨 不得再有「updateCampaign 成功就往下走」的裸鏈",
  !/runFn\('updateCampaign'[^;]*\)\.then\(function \(\) \{ return runFn\(/.test(HTML));
{
  // 儲存草稿走的是 google.script.run 的 callback 形式，不是 runFn/Promise
  const saveH = slice(HTML, "getElementById('saveCampBtn').addEventListener", '\n  // 二審 N2：runFn');
  chk("儲存草稿處理器切得出來", saveH.length > 300, saveH.length);
  chk("🚨 withSuccessHandler 有接 res 參數（原本連參數都沒有）", /withSuccessHandler\(function \(res\) \{/.test(saveH));
  chk("🚨 儲存草稿會檢查 res.success 並在失敗時中止", /if \(!res \|\| !res\.success\) \{[\s\S]{0,120}return; \}/.test(saveH));
  chk("🚨 只有成功時才顯示「已儲存」並 refresh", saveH.indexOf("aeAnnSaved") > saveH.indexOf("!res.success"));
}

console.log("【前端 B：狀態與快照（一審 #1 #2 / 二審 N4 N5）】");
chk("🚨 locked 同時涵蓋 sent 與 sending", /var locked =[^;]*'sent'[^;]*'sending'/.test(HTML));
chk("🚨 statsBox 於 selectCamp 內拆掉 data-i18n（否則切語言會洗掉恢復按鈕）",
  /getElementById\('statsBox'\)\.removeAttribute\('data-i18n'\)/.test(HTML));
chk("🚨 lang-changed 走 AppState.on，不是 window.addEventListener（後者全站沒有人 dispatch）",
  /AppState\.on\('lang-changed'/.test(HTML) && !/window\.addEventListener\('lang-changed'/.test(stripComments(HTML)));
chk("🚨 未達活性門檻時不得出現退回鈕（三審 F1 的前端半邊）",
  /var stale = !c\.deliveryStartedMs \|\|[^;]*10 \* 60 \* 1000/.test(HTML) &&
  /stale[\s\S]{0,400}resetSendBtn/.test(HTML));
chk("🚨 「發送中」與「發送未完成」用不同文案（前者不得斷言前次未正常結束）",
  /aeAnnStatsStuckPre/.test(HTML) && /aeAnnStatsSendingPre/.test(HTML));
chk("🚨 sendNowBtn 與 scheduleBtn 都吃 locked",
  /sendNowBtn'\)\.disabled = locked/.test(HTML) && /scheduleBtn'\)\.disabled = locked/.test(HTML));
{
  // 必須錨在「定義處」——檔案前面就有 showEmptyEditor() 的呼叫點，錨錯會掃到別的地方
  const empty = slice(HTML, 'function showEmptyEditor()', '\n  function ');
  chk("showEmptyEditor 切得出來", empty.length > 200, empty.length);
  ['saveCampBtn', 'sendNowBtn', 'scheduleBtn', 'testSendBtn', 'previewBtn'].forEach(function (b) {
    chk("showEmptyEditor 有 disable " + b, new RegExp(b + "'\\)\\.disabled = true").test(empty));
  });
}
chk("🚨 清單標籤區分 'sending'，不落到「草稿」", /c\.status === 'sending' \? escapeHtml\(window\.L\('aeAnnStatusSending'\)\)/.test(HTML));
chk("🚨 .st.sending 有樣式（否則膠囊無底色）", /\.camp \.st\.sending \{/.test(HTML));
{
  const lang = slice(HTML, "addEventListener('lang-changed'", '  load();');
  chk("🚨 lang-changed 快照 recipFilter", /filter: document\.getElementById\('recipFilter'\)\.value/.test(lang));
  chk("🚨 lang-changed 快照 PICK_IDS / PICK_ROLES", /ids: PICK_IDS\.slice\(\), roles: PICK_ROLES/.test(lang));
  chk("🚨 lang-changed 快照主旨與內文（二審 N5）", /subject: document\.getElementById\('subjectInput'\)\.value/.test(lang) && /body: document\.getElementById\('bodyContent'\)\.value/.test(lang));
  chk("🚨 lang-changed 快照 CHANNELS", /channels: CHANNELS\.slice\(\)/.test(lang));
}
chk("🚨 custom option 存在於靜態 markup（設成不存在的值會讓 select.value 變空字串）",
  /<option value="custom"/.test(HTML));
chk("三個送出點共用 recipPayload()", (HTML.match(/\}, recipPayload\(\)\);/g) || []).length === 4,
  (HTML.match(/\}, recipPayload\(\)\);/g) || []).length);
chk("送出確認框不再讀 recipCount 的 textContent", !/aeAnnSendConfirmPre'\) \+ document\.getElementById\('recipCount'\)\.textContent/.test(HTML));
chk("送出前擋下「計算中」與「0 收件人」", /LAST_COUNT\.ready/.test(HTML) && /LAST_COUNT\.teams/.test(HTML));

console.log("【契約 C：bridge argMap】");
chk("🚨 getCampaignRecipients 為四參數", /getCampaignRecipients:\["compId","filter","recipientIds","recipientRoles"\]/.test(BRIDGE));
chk("sendCampaignTest 已登錄", /sendCampaignTest:\["campaignId"\]/.test(BRIDGE));
chk("resetCampaignDelivery 已登錄", /resetCampaignDelivery:\["campaignId"\]/.test(BRIDGE));
{
  // 前端呼叫的每個 campaign 端點都必須在 argMap 裡，否則參數傳不進去（前例教訓）
  const called = [...new Set([...HTML.matchAll(/(?:runFn\('|\.)([a-zA-Z]*Campaign[a-zA-Z]*)\(/g)].map(m => m[1]))];
  const missing = called.filter(n => !new RegExp('\\b' + n + ':\\[').test(BRIDGE));
  chk("前端呼叫的 campaign 端點全部在 argMap 中", missing.length === 0, missing);
}

console.log("【契約 D：i18n】");
{
  const zi = I18N.indexOf('var Z = {'), ei = I18N.indexOf('var E = {');
  const Z = new Set([...I18N.slice(zi, ei).matchAll(/^\s{4}(aeAnn\w+)\s*:/gm)].map(m => m[1]));
  const E = new Set([...I18N.slice(ei).matchAll(/^\s{4}(aeAnn\w+)\s*:/gm)].map(m => m[1]));
  const used = new Set([
    ...[...HTML.matchAll(/window\.L\('(aeAnn\w+)'\)/g)].map(m => m[1]),
    ...[...HTML.matchAll(/data-i18n(?:-html|-placeholder)?="(aeAnn\w+)"/g)].map(m => m[1])
  ]);
  chk("中英字典鍵數相同", Z.size === E.size, { zh: Z.size, en: E.size });
  chk("英文字典無缺鍵", [...Z].every(k => E.has(k)), [...Z].filter(k => !E.has(k)));
  chk("中文字典無缺鍵", [...E].every(k => Z.has(k)), [...E].filter(k => !Z.has(k)));
  chk("HTML 用到的鍵全部有定義", [...used].every(k => Z.has(k)), [...used].filter(k => !Z.has(k)));
}

console.log("【契約 E：DOM】");
{
  const ids = [...HTML.matchAll(/\sid="([A-Za-z0-9_-]+)"/g)].map(m => m[1]);
  const dup = [...new Set(ids)].filter(i => ids.filter(x => x === i).length > 1);
  chk("markup 無重複 id", dup.length === 0, dup);
  const js = HTML.slice(HTML.indexOf('<script>\n(function'));
  const tgt = [...new Set([...js.matchAll(/getElementById\('([A-Za-z0-9_-]+)'\)/g)].map(m => m[1]))];
  // resetSendBtn 由 statsBox 動態插入，不在靜態 markup
  const dynamic = ['resetSendBtn'];
  const miss = tgt.filter(t => !ids.includes(t) && !dynamic.includes(t));
  chk("getElementById 目標都存在於 markup（動態插入者除外）", miss.length === 0, miss);
}

console.log("\n" + (fail === 0 ? "ALL PASS" : "FAILURES: " + fail) + " (" + pass + "/" + (pass + fail) + ")");
process.exit(fail === 0 ? 0 : 1);
