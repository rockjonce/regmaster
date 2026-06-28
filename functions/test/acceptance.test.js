/* =============================================================================
 * RegMaster · 正取自訂（custom acceptance / acceptanceMode）回歸測試
 * -----------------------------------------------------------------------------
 * 新增於第十輪驗證（2026-06-14）。涵蓋 user 2026-06-12「自訂正取」決策的核心
 * 狀態機，鎖定行為避免日後回歸。
 *
 * 純函式測試（零相依）：把 functions/index.js 內與 Firestore 交易耦合的判斷邏輯
 * 忠實移植為可測純函式，逐分支斷言。對應原始碼位置：
 *   - resolveAcceptanceMode   → index.js ~L1356 / L1907（雙向同步舊欄位 allowWaitlist）
 *   - assignRegistrationStatus → index.js L1904-1933（報名當下狀態指派）
 *   - canAcceptTeam           → index.js L3435-3454（acceptTeam 守門鏈）
 *   - bulkRefundTargets        → index.js L2950-2959（一鍵退款鎖定範圍）
 *
 * 執行：node functions/test/acceptance.test.js
 * ===========================================================================*/
'use strict';

/* ---- 受測純函式（忠實移植自 functions/index.js）------------------------- */

// 模式解析：未送 acceptanceMode 的舊呼叫依 allowWaitlist 映射（index.js L1356/L1907）
function resolveAcceptanceMode(cfg) {
  cfg = cfg || {};
  const am = cfg.acceptanceMode;
  if (am === 'auto' || am === 'manual' || am === 'none') return am;
  return (cfg.allowWaitlist === false) ? 'none' : 'auto';
}

// 報名當下狀態指派（單梯次、非 perSession 路徑；index.js L1904-1933）
// 回傳 { status, wn } 或於 none 模式額滿時 throw 'QUOTA:...'
function assignRegistrationStatus(cfg, ctx) {
  const mode = resolveAcceptanceMode(cfg);
  const accepted = ctx.accepted || 0;   // 既有正取數
  const waitlist = ctx.waitlist || 0;   // 既有備取數
  const maxT = ctx.maxTeams || 0;
  if (mode === 'manual') {
    return { status: '審核中', wn: 0 };       // 一律進審核中池，無人自動正取
  }
  if (maxT > 0 && accepted >= maxT) {
    if (mode === 'none') throw new Error('QUOTA:報名已額滿，不接受新報名');
    const wn = waitlist + 1;
    return { status: '備取' + wn, wn };
  }
  return { status: '正取', wn: 0 };
}

// acceptTeam 守門鏈（index.js L3439-3454）。回傳 { ok, already?, message? }
function canAcceptTeam(team, ctx) {
  team = team || {};
  const status = team.status || '';
  const pay = team.paymentStatus || '';
  if (status === '正取') return { ok: true, already: true };
  if (status === '已取消') return { ok: false, message: '此報名已取消' };
  if (!(status === '審核中' || status.startsWith('備取'))) {
    return { ok: false, message: '此報名狀態不可勾選正取（' + status + '）' };
  }
  if (!pay.includes('已確認')) return { ok: false, message: '此隊伍尚未完成付款，不可勾選正取' };
  if (pay.includes('已退費')) return { ok: false, message: '此隊伍已退費，不可勾選正取' };
  const maxT = ctx.maxTeams || 0;
  const acc = ctx.acceptedCount || 0;
  if (maxT > 0 && acc >= maxT) {
    return { ok: false, message: '正取名額已滿（' + acc + '/' + maxT + '），如需增加請先調整報名上限' };
  }
  return { ok: true };
}

// 一鍵退款鎖定範圍（index.js L2956-2959）：已付款且未退費的 備取* 或 審核中
function bulkRefundTargets(teams) {
  return (teams || []).filter(function (t) {
    const status = t.status || '';
    const pay = t.paymentStatus || '';
    return (status.startsWith('備取') || status === '審核中') &&
      pay.includes('已確認') && !pay.includes('已退費');
  });
}

/* ---- 迷你測試框架 --------------------------------------------------------- */
let pass = 0, fail = 0; const fails = [];
function eq(actual, expected, name) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fail++; fails.push(name + '\n    期望 ' + e + '\n    實得 ' + a); }
}
function ok(cond, name) { eq(!!cond, true, name); }
function throws(fn, frag, name) {
  try { fn(); fail++; fails.push(name + ' — 未如預期拋錯'); }
  catch (e) { if (String(e.message).indexOf(frag) !== -1) pass++; else { fail++; fails.push(name + ' — 錯誤訊息不符：' + e.message); } }
}

/* =================== 1) 模式解析（含舊欄位映射）======================== */
eq(resolveAcceptanceMode({ acceptanceMode: 'manual' }), 'manual', 'mode: manual 顯式');
eq(resolveAcceptanceMode({ acceptanceMode: 'auto' }), 'auto', 'mode: auto 顯式');
eq(resolveAcceptanceMode({ acceptanceMode: 'none' }), 'none', 'mode: none 顯式');
eq(resolveAcceptanceMode({ allowWaitlist: false }), 'none', 'mode: 舊 allowWaitlist=false → none');
eq(resolveAcceptanceMode({ allowWaitlist: true }), 'auto', 'mode: 舊 allowWaitlist=true → auto');
eq(resolveAcceptanceMode({}), 'auto', 'mode: 空 config 預設 auto');
eq(resolveAcceptanceMode({ acceptanceMode: 'bogus' }), 'auto', 'mode: 非法值回退 auto');

/* =================== 2) 報名當下狀態指派 ============================== */
// manual：一律審核中，無論名額（額滿前後皆同）
eq(assignRegistrationStatus({ acceptanceMode: 'manual' }, { accepted: 0, maxTeams: 2 }),
  { status: '審核中', wn: 0 }, 'manual: 空場報名 → 審核中');
eq(assignRegistrationStatus({ acceptanceMode: 'manual' }, { accepted: 2, maxTeams: 2 }),
  { status: '審核中', wn: 0 }, 'manual: 名額已滿報名仍 → 審核中（不擋報名）');
// auto：未滿正取、滿則備取遞增
eq(assignRegistrationStatus({ acceptanceMode: 'auto' }, { accepted: 1, maxTeams: 2 }),
  { status: '正取', wn: 0 }, 'auto: 未滿 → 正取');
eq(assignRegistrationStatus({ acceptanceMode: 'auto' }, { accepted: 2, waitlist: 0, maxTeams: 2 }),
  { status: '備取1', wn: 1 }, 'auto: 滿額 → 備取1');
eq(assignRegistrationStatus({ acceptanceMode: 'auto' }, { accepted: 2, waitlist: 3, maxTeams: 2 }),
  { status: '備取4', wn: 4 }, 'auto: 滿額且已 3 備取 → 備取4');
eq(assignRegistrationStatus({ acceptanceMode: 'auto' }, { accepted: 5, maxTeams: 0 }),
  { status: '正取', wn: 0 }, 'auto: 無上限(maxTeams=0) → 一律正取');
// none：未滿正取、滿則拒收
eq(assignRegistrationStatus({ acceptanceMode: 'none' }, { accepted: 1, maxTeams: 2 }),
  { status: '正取', wn: 0 }, 'none: 未滿 → 正取');
throws(function () { assignRegistrationStatus({ acceptanceMode: 'none' }, { accepted: 2, maxTeams: 2 }); },
  'QUOTA:', 'none: 滿額 → 拋 QUOTA 拒收');

/* =================== 3) acceptTeam 守門鏈 ============================ */
const base = { maxTeams: 2, acceptedCount: 0 };
// 付款前置
ok(!canAcceptTeam({ status: '審核中', paymentStatus: '待確認' }, base).ok, 'accept: 未付款不可勾正取');
eq(canAcceptTeam({ status: '審核中', paymentStatus: '待確認' }, base).message,
  '此隊伍尚未完成付款，不可勾選正取', 'accept: 未付款訊息正確');
// 已付款 → 可勾
ok(canAcceptTeam({ status: '審核中', paymentStatus: '已確認 2026/06/14' }, base).ok,
  'accept: 審核中＋已確認 → 可勾');
// 備取也可勾（auto 模式主辦方手動拉正取）
ok(canAcceptTeam({ status: '備取1', paymentStatus: '已確認' }, base).ok, 'accept: 備取＋已確認 → 可勾');
// 已退費不可勾
ok(!canAcceptTeam({ status: '審核中', paymentStatus: '已確認 已退費' }, base).ok, 'accept: 已退費不可勾');
eq(canAcceptTeam({ status: '審核中', paymentStatus: '已確認 已退費' }, base).message,
  '此隊伍已退費，不可勾選正取', 'accept: 已退費訊息正確');
// 冪等：已正取 → already
eq(canAcceptTeam({ status: '正取', paymentStatus: '已確認' }, base), { ok: true, already: true },
  'accept: 已正取 → 冪等 already');
// 已取消不可勾
ok(!canAcceptTeam({ status: '已取消', paymentStatus: '已確認' }, base).ok, 'accept: 已取消不可勾');
// 名額於勾選當下檢查（2/2 滿）
ok(!canAcceptTeam({ status: '審核中', paymentStatus: '已確認' }, { maxTeams: 2, acceptedCount: 2 }).ok,
  'accept: 名額已滿(2/2) → 擋');
eq(canAcceptTeam({ status: '審核中', paymentStatus: '已確認' }, { maxTeams: 2, acceptedCount: 2 }).message,
  '正取名額已滿（2/2），如需增加請先調整報名上限', 'accept: 名額滿訊息正確');
// 名額釋放：刪一隊後 1/2 → 可再勾
ok(canAcceptTeam({ status: '審核中', paymentStatus: '已確認' }, { maxTeams: 2, acceptedCount: 1 }).ok,
  'accept: 釋放後 1/2 → 可再勾');
// 無上限 → 永遠可勾
ok(canAcceptTeam({ status: '審核中', paymentStatus: '已確認' }, { maxTeams: 0, acceptedCount: 99 }).ok,
  'accept: 無上限 → 不受名額限制');

/* =================== 4) 一鍵退款鎖定範圍 ============================= */
const pool = [
  { teamId: 'A', status: '正取', paymentStatus: '已確認' },              // 正取不退
  { teamId: 'B', status: '審核中', paymentStatus: '已確認' },            // 命中
  { teamId: 'C', status: '備取1', paymentStatus: '已確認' },             // 命中
  { teamId: 'D', status: '審核中', paymentStatus: '待確認' },            // 未付款不退
  { teamId: 'E', status: '審核中', paymentStatus: '已確認 已退費' },     // 已退費不重複退
  { teamId: 'F', status: '已取消', paymentStatus: '已確認' },            // 已取消不退
];
const targets = bulkRefundTargets(pool).map(function (t) { return t.teamId; });
eq(targets, ['B', 'C'], 'bulkRefund: 僅鎖定已付款未退費的 審核中／備取（B,C）');
eq(bulkRefundTargets([]).length, 0, 'bulkRefund: 空清單 → 0 筆（冪等：退完按鈕消失）');

/* =================== 5) createPayuniOrder 訂單去重 / 過期（T4）============ */
// 純函式忠實移植自 index.js createPayuniOrder 去重判斷 + dailyJobs 過期判斷。
function buildItemSig(items) {
  return JSON.stringify((items || []).map(function (i) { return { t: i.type, tier: String(i.tier || '').toLowerCase(), qty: i.qty || 1 }; }));
}
function matchesPendingOrder(o, ctx) {
  return o.status === 'pending' && o.total === ctx.total &&
    (o.couponCode || '') === (ctx.couponCode || '') &&
    o._itemSig === ctx.itemSig &&
    typeof o.createdTs === 'number' && (ctx.nowMs - o.createdTs) < ctx.windowMs;
}
function isStalePendingOrder(o, nowMs, ttlMs) {
  return o.status === 'pending' && typeof o.createdTs === 'number' && o.createdTs < (nowMs - ttlMs);
}
var NOW = 1000000000000;            // 固定假時間，不依賴真實時鐘
var WIN = 10 * 60 * 1000;            // 去重視窗 10 分鐘
var TTL = 24 * 60 * 60 * 1000;      // 過期門檻 24 小時
var sigA = buildItemSig([{ type: 'tier', tier: 'PRO' }]);
var sigB = buildItemSig([{ type: 'tier', tier: 'team' }]);
eq(buildItemSig([{ type: 'tier', tier: 'pro' }]), sigA, 'itemSig: tier 大小寫正規化一致');
ok(sigA !== sigB, 'itemSig: 不同 tier → 不同簽章');
var ctxA = { total: 3000, couponCode: '', itemSig: sigA, nowMs: NOW, windowMs: WIN };
ok(matchesPendingOrder({ status: 'pending', total: 3000, couponCode: '', _itemSig: sigA, createdTs: NOW - 60000 }, ctxA), 'dedup: 完全相同近期 pending → 命中');
ok(!matchesPendingOrder({ status: 'pending', total: 2999, couponCode: '', _itemSig: sigA, createdTs: NOW - 60000 }, ctxA), 'dedup: 金額不同 → 不命中(嚴防重用錯金額)');
ok(!matchesPendingOrder({ status: 'pending', total: 3000, couponCode: 'X', _itemSig: sigA, createdTs: NOW - 60000 }, ctxA), 'dedup: coupon 不同 → 不命中');
ok(!matchesPendingOrder({ status: 'pending', total: 3000, couponCode: '', _itemSig: sigB, createdTs: NOW - 60000 }, ctxA), 'dedup: items 不同 → 不命中');
ok(!matchesPendingOrder({ status: 'pending', total: 3000, couponCode: '', _itemSig: sigA, createdTs: NOW - 11 * 60000 }, ctxA), 'dedup: 超過 10 分鐘視窗 → 不命中');
ok(!matchesPendingOrder({ status: 'paid', total: 3000, couponCode: '', _itemSig: sigA, createdTs: NOW - 60000 }, ctxA), 'dedup: 已付款 → 不命中');
ok(!matchesPendingOrder({ status: 'pending', total: 3000, couponCode: '', _itemSig: sigA }, ctxA), 'dedup: 無 createdTs 舊單 → 不命中(fail-safe)');
ok(isStalePendingOrder({ status: 'pending', createdTs: NOW - 25 * 60 * 60 * 1000 }, NOW, TTL), 'expire: pending 25h 前 → 過期');
ok(!isStalePendingOrder({ status: 'pending', createdTs: NOW - 60 * 60 * 1000 }, NOW, TTL), 'expire: pending 1h 前 → 不過期');
ok(!isStalePendingOrder({ status: 'paid', createdTs: NOW - 25 * 60 * 60 * 1000 }, NOW, TTL), 'expire: 已付款(即使很舊) → 不動');
ok(!isStalePendingOrder({ status: 'pending' }, NOW, TTL), 'expire: 無 createdTs 舊單 → 不動(fail-safe)');

/* ---- 結果輸出 ------------------------------------------------------------- */
console.log('正取自訂（acceptanceMode）回歸測試');
console.log('  通過 ' + pass + ' / 失敗 ' + fail);
if (fail) { console.log('\n失敗項：'); fails.forEach(function (f) { console.log('  ✗ ' + f); }); process.exit(1); }
console.log('  ✓ 全數通過');
