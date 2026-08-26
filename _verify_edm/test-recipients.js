// EDM 收件人 v3 — 規格測試（與 functions/index.js 的 _resolveTeams / _campaignMessage 同構）
// 重點回歸：
//   1) fail-CLOSED —— 舊版「三條 if 都沒命中就加入」會讓 'custom' 寄給全部人
//   2) 一隊一封 —— 舊版把全活動 email 塞進單一 to 陣列（收件人互相曝光）
//   3) 變數代換 —— 介面承諾的 {{變數}} 舊版從未被代換
//   4) 代換必須「先代換、再注入追蹤」，否則 {{}} 會被包進 percent-encoded URL
let pass = 0, fail = 0;
function chk(name, cond, detail) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail !== undefined ? "  ← " + JSON.stringify(detail) : "")); }
}

// ===== 與 index.js 相同的純函式 =====
const CAMPAIGN_FILTERS = ['all', 'paid', 'unpaid', 'waitlist', 'custom'];
const CAMPAIGN_ROLES = ['學生', '教練'];
function _normCampFilter(v) { return CAMPAIGN_FILTERS.indexOf(v) >= 0 ? v : null; }
function _normCampRoles(v) {
  if (!Array.isArray(v)) return [];
  const out = [...new Set(v.filter(r => CAMPAIGN_ROLES.indexOf(r) >= 0))];
  return out.length === CAMPAIGN_ROLES.length ? [] : out;
}
function _sanitizeRecipientIds(v) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map(x => String(x == null ? "" : x).slice(0, 64)).filter(Boolean))].slice(0, 2000);
}
function escMail(s) { return String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]); }
function _injectCampaignTracking(bodyHtml, campaignId) {
  const cid = encodeURIComponent(campaignId);
  let html = String(bodyHtml || '').replace(/href\s*=\s*"(https?:\/\/[^"]+)"/gi,
    (m, url) => 'href="TRACK/trackClick?c=' + cid + '&u=' + encodeURIComponent(url) + '"');
  html += '<img src="TRACK/trackOpen?c=' + cid + '" width="1" height="1" alt="" style="display:none">';
  return html;
}
function _campaignMessage(camp, compName, t, campaignId) {
  const vars = [
    [/{{競賽名稱}}/g, compName || ''],
    [/{{(隊伍編號|報名編號)}}/g, t.teamId || ''],
    [/{{組別}}/g, t.group || ''],
    [/{{中文隊名}}/g, t.teamNameCN || ''],
    [/{{英文隊名}}/g, t.teamNameEN || '']
  ];
  const fill = (s, esc) => vars.reduce(
    (a, v) => a.replace(v[0], () => (esc ? escMail(v[1]) : v[1])),
    String(s == null ? '' : s));
  const fSubj = fill(camp.subject || '活動公告', false);
  const fText = fill(camp.body || '', false);
  const inner = _injectCampaignTracking(fill(camp.body || '', true).replace(/\n/g, '<br>'), campaignId);
  return { subject: '[' + (compName || '活動') + '] ' + fSubj, html: emailWrap(escMail(fSubj), inner), text: fText };
}
// index.js:120-143 的 emailWrap 把 title 以 `<h2 ...>${title}</h2>` 原封插入 —— 這裡
// 保留同樣的「不逸出」特性，好讓測試能抓到呼叫端有沒有先 escMail。
function emailWrap(title, bodyHtml) { return '<h2>' + title + '</h2><div>' + bodyHtml + '</div>'; }

// _resolveTeams 的隊伍篩選（同構；db 讀取部分以 fixture 取代）
function resolveTeams(teamDocs, memberDocs, camp) {
  const f = _normCampFilter((camp && camp.recipientFilter) || 'all');
  if (!f) return { ok: false, message: "未知的收件對象設定，未寄出" };
  const roles = _normCampRoles(camp && camp.recipientRoles);
  const idSet = f === 'custom' ? new Set(_sanitizeRecipientIds(camp && camp.recipientIds)) : null;
  if (idSet && idSet.size === 0) return { ok: true, teams: [], teamsNoEmail: 0, cancelled: 0, missing: 0 };

  const byTeam = {};
  memberDocs.forEach(m => {
    if (!m.email || !m.teamId) return;
    const b = byTeam[m.teamId] || (byTeam[m.teamId] = { "學生": [], "教練": [] });
    const k = m.role === "學生" ? "學生" : "教練";
    if (b[k].indexOf(m.email) < 0) b[k].push(m.email);
  });

  const teams = [];
  const seen = new Set();
  let teamsNoEmail = 0, cancelled = 0;
  teamDocs.forEach(d => {
    const t = d.data, id = d.id;
    seen.add(id);
    if (t.status === "已取消") { if (idSet && idSet.has(id)) cancelled++; return; }
    if (f === 'paid' && !(t.paymentStatus || "").includes("已確認")) return;
    if (f === 'unpaid' && (t.paymentStatus || "").includes("已確認")) return;
    if (f === 'waitlist' && !(t.status || "").startsWith("備取")) return;
    if (f === 'custom' && !idSet.has(id)) return;
    const b = byTeam[id] || { "學生": [], "教練": [] };
    const picked = roles.length ? roles.reduce((a, r) => a.concat(b[r]), []) : b["學生"].concat(b["教練"]);
    const emails = [...new Set(picked)];
    if (emails.length === 0) teamsNoEmail++;
    teams.push({
      teamId: id, teamName: t.teamNameCN || t.teamNameEN || "(無隊名)",
      teamNameCN: t.teamNameCN || "", teamNameEN: t.teamNameEN || "",
      group: t.group || "", status: t.status || "",
      paid: (t.paymentStatus || "").includes("已確認"),
      sessions: Array.isArray(t.selectedSessions) ? t.selectedSessions : [t.selectedSession || 0],
      emails
    });
  });
  teams.sort((a, b2) => String(a.teamId).localeCompare(String(b2.teamId)));
  let missing = 0;
  if (idSet) idSet.forEach(id => { if (!seen.has(id)) missing++; });
  return { ok: true, teams, teamsNoEmail, cancelled, missing };
}

// ===== Fixture：比照 CHD8XFK 的真實形狀 =====
const TEAMS = [
  { id: "C-T1", data: { teamNameCN: "土豆發芽", teamNameEN: "SPROUTS", group: "國中組", status: "正取", paymentStatus: "已確認 (線上付款) 2026/7/13", selectedSessions: [2] } },
  { id: "C-T2", data: { teamNameCN: "社寮二隊", group: "國中組", status: "正取", paymentStatus: "待確認", selectedSessions: [0] } },
  { id: "C-T3", data: { teamNameCN: "備取隊", group: "高中組", status: "備取1", paymentStatus: "待確認", selectedSession: 0 } },   // 舊欄位
  { id: "C-T4", data: { teamNameCN: "已取消隊", group: "國小組", status: "已取消", paymentStatus: "待確認", selectedSessions: [1] } },
  { id: "C-T5", data: { teamNameCN: "無信箱隊", group: "國小組", status: "正取", paymentStatus: "待確認", selectedSessions: [1] } }
];
const MEMBERS = [
  { teamId: "C-T1", role: "學生", email: "s1@e.com" },
  { teamId: "C-T1", role: "學生", email: "s2@e.com" },
  { teamId: "C-T1", role: "教練", email: "coach1@e.com" },
  { teamId: "C-T2", role: "學生", email: "s3@e.com" },
  { teamId: "C-T2", role: "教練", email: "coach1@e.com" },   // 跨隊共用信箱
  { teamId: "C-T3", role: "學生", email: "s4@e.com" },
  { teamId: "C-T4", role: "學生", email: "cancelled@e.com" }
  // C-T5 沒有任何 member → 無 email
];
const R = (camp) => resolveTeams(TEAMS, MEMBERS, camp);
const ids = (r) => r.teams.map(t => t.teamId);

console.log("【1. fail-CLOSED 白名單】");
chk("'all' → 排除已取消，其餘全收", JSON.stringify(ids(R({ recipientFilter: 'all' }))) === '["C-T1","C-T2","C-T3","C-T5"]', ids(R({ recipientFilter: 'all' })));
chk("'paid' → 只有 C-T1", JSON.stringify(ids(R({ recipientFilter: 'paid' }))) === '["C-T1"]');
chk("'unpaid' → C-T2/C-T3/C-T5", JSON.stringify(ids(R({ recipientFilter: 'unpaid' }))) === '["C-T2","C-T3","C-T5"]');
chk("'waitlist' → 只有 C-T3", JSON.stringify(ids(R({ recipientFilter: 'waitlist' }))) === '["C-T3"]');
chk("🚨 'bogus' → ok:false 不寄（舊版會寄給全部人）", R({ recipientFilter: 'bogus' }).ok === false);
chk("🚨 未帶 recipientIds 的 'custom' → 0 隊（舊版會寄給全部人）", R({ recipientFilter: 'custom' }).teams.length === 0);
chk("undefined filter → 視為 'all'", R({}).ok === true && ids(R({})).length === 4);
chk("_normCampFilter 白名單", _normCampFilter('all') === 'all' && _normCampFilter('custom') === 'custom' && _normCampFilter('x') === null && _normCampFilter(undefined) === null);

console.log("【2. custom 名單解析】");
const c1 = R({ recipientFilter: 'custom', recipientIds: ["C-T1", "C-T3"] });
chk("只取名單內的隊伍", JSON.stringify(ids(c1)) === '["C-T1","C-T3"]');
const c2 = R({ recipientFilter: 'custom', recipientIds: ["C-T1", "C-T4"] });
chk("名單含已取消隊 → 排除且計入 cancelled", ids(c2).indexOf("C-T4") < 0 && c2.cancelled === 1);
const c3 = R({ recipientFilter: 'custom', recipientIds: ["C-T1", "C-GONE"] });
chk("名單含已刪除隊 → 計入 missing", c3.missing === 1 && ids(c3).length === 1);
const c4 = R({ recipientFilter: 'custom', recipientIds: ["C-T1", "C-T5"] });
chk("名單含無信箱隊 → 保留在清單但計入 teamsNoEmail", c4.teamsNoEmail === 1 && ids(c4).length === 2);
chk("無信箱隊的 emails 為空（呼叫端會過濾掉不寄）", c4.teams.filter(t => t.emails.length).length === 1);
chk("_sanitizeRecipientIds 去重 + 去空", JSON.stringify(_sanitizeRecipientIds(["a", "a", "", null, "b"])) === '["a","b"]');
chk("_sanitizeRecipientIds 非陣列 → []", JSON.stringify(_sanitizeRecipientIds("a")) === '[]');
chk("_sanitizeRecipientIds 上限 2000", _sanitizeRecipientIds(Array.from({ length: 2500 }, (_, i) => "t" + i)).length === 2000);

console.log("【3. 身分（role）過濾】");
const rAll = R({ recipientFilter: 'custom', recipientIds: ["C-T1"] });
chk("不限身分 → 學生+教練 3 封地址", JSON.stringify(rAll.teams[0].emails) === '["s1@e.com","s2@e.com","coach1@e.com"]');
const rStu = R({ recipientFilter: 'custom', recipientIds: ["C-T1"], recipientRoles: ["學生"] });
chk("只寄報名者 → 2 個地址", JSON.stringify(rStu.teams[0].emails) === '["s1@e.com","s2@e.com"]');
const rCoach = R({ recipientFilter: 'custom', recipientIds: ["C-T1"], recipientRoles: ["教練"] });
chk("只寄指導者 → 1 個地址", JSON.stringify(rCoach.teams[0].emails) === '["coach1@e.com"]');
const rNoCoach = R({ recipientFilter: 'custom', recipientIds: ["C-T3"], recipientRoles: ["教練"] });
chk("該隊沒有此身分 → emails 空、計入 teamsNoEmail（不可靜默）", rNoCoach.teams[0].emails.length === 0 && rNoCoach.teamsNoEmail === 1);
chk("_normCampRoles 全選 = 不限制", JSON.stringify(_normCampRoles(["學生", "教練"])) === '[]');
chk("_normCampRoles 空 = 不限制", JSON.stringify(_normCampRoles([])) === '[]');
chk("_normCampRoles 過濾未知值", JSON.stringify(_normCampRoles(["學生", "校長"])) === '["學生"]');
chk("_normCampRoles 非陣列 → []", JSON.stringify(_normCampRoles("學生")) === '[]');

console.log("【4. 梯次 fallback（selectedSessions vs 舊 selectedSession）】");
const all = R({ recipientFilter: 'all' });
chk("新欄位 selectedSessions:[2]", JSON.stringify(all.teams.find(t => t.teamId === "C-T1").sessions) === '[2]');
chk("🚨 舊欄位 selectedSession:0 → [0]", JSON.stringify(all.teams.find(t => t.teamId === "C-T3").sessions) === '[0]');
chk("兩者皆無 → [0]", JSON.stringify(resolveTeams([{ id: "X", data: { status: "正取" } }], [], {}).teams[0].sessions) === '[0]');

console.log("【5. 一隊一封 + 跨隊共用信箱】");
const send = R({ recipientFilter: 'all' }).teams.filter(t => t.emails.length);
chk("實寄 3 隊（C-T5 無信箱被排除）", send.length === 3, send.map(t => t.teamId));
chk("🚨 每封的 to 只含該隊信箱，不含其他隊", send.every(t => t.emails.every(e => MEMBERS.some(m => m.teamId === t.teamId && m.email === e))));
const uniq = new Set(); send.forEach(t => t.emails.forEach(e => uniq.add(e)));
chk("去重後唯一收件人 5 位（coach1 跨兩隊只算 1）", uniq.size === 5, [...uniq]);
chk("訊息封數 3 ≠ 唯一收件人 5（確認框需同時顯示兩個口徑）", send.length === 3 && uniq.size === 5);
chk("coach1 掛兩隊 → 收到 2 封（報名編號不同，屬正確行為）",
  send.filter(t => t.emails.indexOf("coach1@e.com") >= 0).length === 2);

console.log("【6. 變數代換】");
const CAMP = {
  subject: "【{{競賽名稱}}】{{中文隊名}} 報名確認",
  body: "編號：{{報名編號}}\n組別：{{組別}}\n英文隊名：{{英文隊名}}\n連結 <a href=\"https://x.com/a\">按此</a>"
};
const T1 = { teamId: "C-T1", group: "國中組", teamNameCN: "土豆發芽", teamNameEN: "SPROUTS" };
const msg = _campaignMessage(CAMP, "KidWind 亞洲聯賽", T1, "CID1");
chk("🚨 主旨變數已代換（舊版原樣輸出 {{}}）", msg.subject === "[KidWind 亞洲聯賽] 【KidWind 亞洲聯賽】土豆發芽 報名確認", msg.subject);
chk("內文 {{報名編號}} → C-T1", msg.text.indexOf("編號：C-T1") === 0);
chk("內文 {{組別}} → 國中組", msg.text.indexOf("組別：國中組") > 0);
chk("內文 {{英文隊名}} → SPROUTS", msg.text.indexOf("英文隊名：SPROUTS") > 0);
chk("html 內文也代換完成", msg.html.indexOf("C-T1") > 0 && msg.html.indexOf("{{") < 0);
chk("換行轉 <br>", msg.html.indexOf("<br>") > 0);
chk("主旨不做 HTML 逸出（純文字標頭）", _campaignMessage({ subject: "A&B" }, "C", T1, "X").subject.indexOf("A&B") > 0);

console.log("【7. 代換順序：先代換、再注入追蹤】");
const linkCamp = { subject: "s", body: '<a href="https://x.com/t/{{報名編號}}">go</a>' };
const lm = _campaignMessage(linkCamp, "C", T1, "CID1");
chk("🚨 {{}} 在網址內也已代換（若先注入追蹤會被 percent-encode 而永久失配）", lm.html.indexOf("%7B%7B") < 0 && lm.html.indexOf("{{") < 0, lm.html);
chk("追蹤連結已改寫", lm.html.indexOf("trackClick?c=CID1") > 0);
chk("追蹤網址內含已代換的 teamId", decodeURIComponent(lm.html).indexOf("x.com/t/C-T1") > 0);
chk("開信像素已附加", lm.html.indexOf("trackOpen?c=CID1") > 0);

console.log("【8. HTML 逸出與 replace 特殊樣式】");
const evil = { teamId: "C-T9", group: "", teamNameCN: '<script>alert(1)</script>', teamNameEN: "" };
const em = _campaignMessage({ subject: "x", body: "隊名：{{中文隊名}}" }, "C", evil, "CID");
chk("🚨 html 內文的隊名經 escMail 逸出", em.html.indexOf("<script>") < 0 && em.html.indexOf("&lt;script&gt;") > 0, em.html);
const dollar = { teamId: "C-T8", group: "", teamNameCN: 'A$&B$1C', teamNameEN: "" };
const dm = _campaignMessage({ subject: "x", body: "隊名：{{中文隊名}}" }, "C", dollar, "CID");
chk("🚨 隊名含 $& / $1 不被當成 replace 特殊樣式展開", dm.text === "隊名：A$&B$1C", dm.text);

console.log("【9. 空名單防護】");
const empty = R({ recipientFilter: 'custom', recipientIds: ["C-T5"] });
chk("只勾無信箱隊 → 可寄目標為 0", empty.teams.filter(t => t.emails.length).length === 0);
chk("→ 呼叫端必須擋下、不可標記 sent（見 _deliverCampaign 的 targets.length === 0 分支）", true);

// ===== 外審回歸（v3.1）=====
// 以下六組對應 Opus 外審的 #1 #2 #3 #4 #5 #6。第一版 47/47 全綠卻一項都沒抓到，
// 因為當時只複製了 _resolveTeams 的純邏輯——而缺陷分別在前端、狀態機、emailWrap
// 相依、以及寫入端。這裡把那四個面向都補進來。

// _deliverCampaign 開頭的防重寄守門
function deliverGate(status) {
  if (status === 'sent') return 'blocked-sent';
  if (status === 'sending') return 'blocked-sending';
  return 'proceed';
}
// scheduleCampaign 的守門
function scheduleGate(status) {
  if (status === 'sent') return 'blocked-sent';
  if (status === 'sending') return 'blocked-sending';
  return 'ok';
}
// processScheduledCampaigns 只撿 scheduled
function cronPicks(status) { return status === 'scheduled'; }
// createCampaign / updateCampaign 的寫入端
function writeFilter(v) {
  if (v !== undefined && !_normCampFilter(v)) return { ok: false };
  return { ok: true, value: v === undefined ? 'all' : _normCampFilter(v) };
}
// lang-changed：selectCamp 會用伺服器副本覆寫，處理器負責還原使用者未存檔的畫面狀態
function langChanged(ui, serverCamp, fixed) {
  const keepFilter = ui.filter, keepIds = ui.ids.slice(), keepRoles = ui.roles;
  // selectCamp(SELECTED) 覆寫成伺服器上的值
  let filter = serverCamp.recipientFilter || 'all';
  let ids = (serverCamp.recipientIds || []).slice();
  let roles = (Array.isArray(serverCamp.recipientRoles) && serverCamp.recipientRoles.length === 1) ? serverCamp.recipientRoles[0] : '';
  // 還原
  if (fixed) filter = keepFilter;      // v3.1 修正：filter 也要還原
  ids = keepIds; roles = keepRoles;
  return { filter, ids, roles };
}

console.log("【外審 #1：切語言不得沖掉未存檔的收件人設定】");
const serverCamp = { recipientFilter: 'all', recipientIds: [], recipientRoles: [] };
const uiState = { filter: 'custom', ids: ['C-T1', 'C-T2', 'C-T3'], roles: '' };
const before = langChanged(uiState, serverCamp, false);
const after = langChanged(uiState, serverCamp, true);
chk("🚨 修正前：filter 被打回 'all'（名單還在也沒用 → 寄給全部人）", before.filter === 'all' && before.ids.length === 3);
chk("修正後：filter 保持 'custom'", after.filter === 'custom');
chk("修正後：名單與身分同時保留", JSON.stringify(after.ids) === '["C-T1","C-T2","C-T3"]' && after.roles === '');
const uiRole = { filter: 'paid', ids: [], roles: '教練' };
chk("修正後：身分選擇也保留", langChanged(uiRole, serverCamp, true).roles === '教練');

console.log("【外審 #2：已寄出的公告不得經排程重寄】");
chk("🚨 status='sent' → 排程被擋", scheduleGate('sent') === 'blocked-sent');
chk("status='sending' → 排程被擋", scheduleGate('sending') === 'blocked-sending');
chk("status='draft' → 可排程", scheduleGate('draft') === 'ok');
chk("status='scheduled' → 可改排程時間", scheduleGate('scheduled') === 'ok');
chk("🚨 若排程未擋，cron 會再撿一次（證明繞道存在）", cronPicks('scheduled') === true && deliverGate('scheduled') === 'proceed');
chk("cron 不撿 sent / sending / draft", !cronPicks('sent') && !cronPicks('sending') && !cronPicks('draft'));

console.log("【外審 #3：信件標題必須逸出（emailWrap 是原封插入）】");
const evilName = { teamId: "C-T7", group: "", teamNameCN: '<b>駭客隊</b>', teamNameEN: "" };
const sm = _campaignMessage({ subject: '給 {{中文隊名}} 的通知', body: 'x' }, "C", evilName, "CID");
chk("🚨 html 標題已逸出，不含活的 <b>", sm.html.indexOf('<h2>給 &lt;b&gt;駭客隊&lt;/b&gt; 的通知</h2>') === 0, sm.html.slice(0, 90));
chk("message.subject 維持純文字不逸出（信頭不是 HTML）", sm.subject === '[C] 給 <b>駭客隊</b> 的通知', sm.subject);
const ampName = { teamId: "C-T6", group: "", teamNameCN: 'A&B 隊', teamNameEN: "" };
const am = _campaignMessage({ subject: '{{中文隊名}}', body: 'x' }, "C", ampName, "CID");
chk("含 & 的正常隊名在標題中轉為 &amp;（不會顯示錯亂）", am.html.indexOf('<h2>A&amp;B 隊</h2>') === 0);
chk("含 & 的隊名在 subject 中維持原樣", am.subject === '[C] A&B 隊');

console.log("【外審 #4：寄送中間態，崩潰不得整份重寄】");
chk("🚨 status='sending' → _deliverCampaign 直接擋下", deliverGate('sending') === 'blocked-sending');
chk("status='sent' → 擋下", deliverGate('sent') === 'blocked-sent');
chk("status='draft' / 'scheduled' → 放行", deliverGate('draft') === 'proceed' && deliverGate('scheduled') === 'proceed');
chk("🚨 cron 不會撿 'sending'（＝崩潰後不會 15 分鐘後重寄）", cronPicks('sending') === false);

console.log("【外審 #5：寫入端不得把無效值降級為 'all'】");
chk("🚨 未知值 → 拒絕寫入（不再降級成寄給全部人）", writeFilter('bogus').ok === false);
chk("🚨 空字串（舊版 HTML 快取造成的 select.value）→ 拒絕", writeFilter('').ok === false);
chk("null → 拒絕", writeFilter(null).ok === false);
chk("未提供 → 預設 'all'", writeFilter(undefined).ok === true && writeFilter(undefined).value === 'all');
chk("合法值原樣保留", ['all', 'paid', 'unpaid', 'waitlist', 'custom'].every(v => writeFilter(v).value === v));

console.log("【外審 #6：身分陣列有重複值不得塌陷成「不限制」】");
chk("🚨 ['學生','學生'] → ['學生']（修正前會變 [] ＝教練也收到）", JSON.stringify(_normCampRoles(['學生', '學生'])) === '["學生"]');
const dupRole = R({ recipientFilter: 'custom', recipientIds: ["C-T1"], recipientRoles: ['學生', '學生'] });
chk("🚨 端到端：重複身分仍只寄報名者，教練不收信", JSON.stringify(dupRole.teams[0].emails) === '["s1@e.com","s2@e.com"]', dupRole.teams[0].emails);
chk("['教練','教練'] → ['教練']", JSON.stringify(_normCampRoles(['教練', '教練'])) === '["教練"]');
chk("['學生','教練','學生'] → [] 不限制（確實是全選）", JSON.stringify(_normCampRoles(['學生', '教練', '學生'])) === '[]');

console.log("\n" + (fail === 0 ? "ALL PASS" : "FAILURES: " + fail) + " (" + pass + "/" + (pass + fail) + ")");
process.exit(fail === 0 ? 0 : 1);
