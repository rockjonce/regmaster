// =============================================================================
// RegMaster · Shared Admin Sidebar Shell (shared/admin-nav.js)
// =============================================================================
// Renders the ENTIRE admin sidebar consistently on every admin page, driven by
// the logged-in account's role. This replaces the per-page hardcoded sidebars
// so the nav never "flickers" between pages.
//
//   • One role label only: 系統管理員 (system) or 主辦方 (competition).
//   • Always present: 儀表板 / 所有活動 / AI 助理, 方案與授權 / 設定,
//     方案用量卡, 登出.
//   • system role additionally gets: 系統設定 / 操作日誌.
//   • Collapsible (desktop, persisted) + off-canvas drawer (mobile).
//
// Load AFTER /shared/app-state.js. Pages without <aside class="side">
// (e.g. the form-builder editor) are a no-op.
//
// Preserves the element IDs that page scripts read/write:
//   orgAv, orgName, orgPlan, navCompCount, planBadge, usageBar, usageText,
//   usagePct, logoutBtn.
// =============================================================================
(function () {
  var side = document.querySelector('aside.side');
  if (!side) return;

  var me = null;
  try { me = JSON.parse(localStorage.getItem('regmaster_me') || 'null'); } catch (e) {}
  // Make the session available to the callable bridge now (AppState.init() in the
  // page's own script runs later); needed so getLicenseStatus below sends _auth.
  if (me && !window.ME) window.ME = me;
  var isSystem = me && me.role === 'system';
  var roleLabel = isSystem ? '系統管理員' : '主辦方';
  var name = (me && (me.displayName || me.username)) || '—';
  var initial = String(name).charAt(0).toUpperCase();

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  var p = location.pathname.replace(/index\.html$/, '');
  function active(href) {
    if (href === '/admin/') return (p === '/admin/' || p === '/admin');
    if (href === '/admin/events/') return p.indexOf('/admin/events') === 0;
    return p.indexOf(href.replace(/\.html$/, '')) === 0;
  }

  var IC = {
    home: '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M3 12l9-9 9 9M5 10v10h14V10"/></svg>',
    cal: '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3M3 11h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"/></svg>',
    ai: '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg>',
    lic: '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9 9 4 9 9z"/></svg>',
    gear: '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.13-1.3l2-1.5-2-3.4-2.3 1a7 7 0 00-2.27-1.3L13.6 2h-3.2l-.4 2.5a7 7 0 00-2.27 1.3l-2.3-1-2 3.4 2 1.5A7 7 0 005 12a7 7 0 00.13 1.3l-2 1.5 2 3.4 2.3-1a7 7 0 002.27 1.3l.4 2.5h3.2l.4-2.5a7 7 0 002.27-1.3l2.3 1 2-3.4-2-1.5A7 7 0 0019 12z"/></svg>',
    sys: '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    log: '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9 9 4 9 9z"/></svg>',
    out: '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    chev: '<svg fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>'
  };

  function item(href, key, label, icon, extra) {
    return '<a class="nav-it' + (active(href) ? ' on' : '') + '" href="' + href + '">' + icon +
      '<span data-i18n="' + key + '">' + esc(label) + '</span>' + (extra || '') + '</a>';
  }

  // Event-context sub-navigation ("本活動") — shown when inside a single event.
  // The per-page sidebars used to carry this; the unified shell now provides it
  // so navigating between an event's sub-pages keeps working.
  var evtNavHtml = '';
  var em = location.pathname.match(/^\/admin\/events\/([^/]+)(?:\/(edit|form-builder|registrations|announcements|payments|scoring|checkin|certificates))?\/?$/);
  if (em && em[1] && em[1] !== 'index.html') {
    var cid = em[1], sub = em[2] || 'hub';
    // roles = which member roles may see this item (owner/system always see all).
    var eitem = function (suffix, i18nKey, label, key, icon, roles, extra, feat) {
      return '<a class="nav-it' + (key === sub ? ' on' : '') + '" href="/admin/events/' + cid + suffix + '" data-evt-roles="' + roles + '"' + (feat ? ' data-feat="' + feat + '"' : '') + '>' +
        icon + '<span data-i18n="' + i18nKey + '">' + esc(label) + '</span>' + (extra || '') + '</a>';
    };
    evtNavHtml =
      '<div class="nav-grp"><div class="l-grp" data-i18n="anGrpThisEvent">本活動</div>' +
        eitem('', 'anEvtOverview', '總覽', 'hub', IC.home, 'manager staff judge', '<span class="ct" id="navRegCt"></span>') +
        eitem('/edit', 'anEvtSettings', '設定', 'edit', IC.gear, 'manager') +
        eitem('/form-builder', 'anEvtForm', '表單設計', 'form-builder', IC.cal, 'manager') +
        eitem('/registrations', 'anEvtReg', '報名管理', 'registrations', '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21a8 8 0 0116 0"/></svg>', 'manager') +
        eitem('/announcements', 'anEvtNotice', '通知', 'announcements', IC.log, 'manager', '', 'campaigns') +
        eitem('/payments', 'anEvtBilling', '帳務', 'payments', IC.lic, '') +
        eitem('/scoring', 'anEvtScoring', '評分', 'scoring', IC.sys, 'manager judge', '', 'scoring') +
        eitem('/checkin', 'anEvtCheckin', '報到', 'checkin', IC.ai, 'manager staff', '', 'checkin') +
        eitem('/certificates', 'anEvtCert', '證書 / 名牌', 'certificates', '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><circle cx="12" cy="9" r="5"/><path d="M9 13l-1.5 7L12 18l4.5 2L15 13"/></svg>', 'manager', '', 'certificate') +
      '</div>';
  }

  var html =
    '<a class="brand" href="/admin/"><div class="logo"><img src="/favicon.png" alt="RegMaster" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block"></div>' +
      '<div class="nm">RegMaster<small data-i18n="' + (isSystem ? 'anBrandSubSystem' : 'anBrandSubOrg') + '">' + (isSystem ? '系統管理員' : '主辦後台') + '</small></div>' +
    '</a>' +
    '<div class="org-switcher"><div class="av" id="orgAv">' + esc(initial) + '</div>' +
      '<div class="body"><h6 id="orgName">' + esc(name) + '</h6><p id="orgPlan" data-i18n="' + (isSystem ? 'anRoleSystem' : 'anRoleOrg') + '">' + roleLabel + '</p></div></div>' +
    '<div class="nav-grp"><div class="l-grp" data-i18n="anGrpOverview">概覽</div>' +
      item('/admin/', 'anDashboard', '儀表板', IC.home) +
      item('/admin/events/', 'anAllEvents', '所有活動', IC.cal, '<span class="ct" id="navCompCount"></span>') +
      item('/admin/ai.html', 'anAi', 'AI 助理', IC.ai) +
    '</div>' +
    evtNavHtml +
    '<div class="nav-grp"><div class="l-grp" data-i18n="anGrpManage">管理</div>' +
      item('/admin/license.html', 'anLicense', '方案與授權', IC.lic) +
      item('/admin/my-logs.html', 'anLogs', '操作紀錄', IC.log) +
      item('/admin/settings.html', 'anSettings', '設定', IC.gear) +
    '</div>' +
    (isSystem ?
      '<div class="nav-grp"><div class="l-grp" data-i18n="anGrpSysadmin">系統管理</div>' +
        item('/admin/system.html', 'anSysSettings', '系統設定', IC.sys) +
        item('/admin/audit.html', 'anAudit', '操作日誌', IC.log) +
      '</div>' : '') +
    '<div class="side-foot">' +
      // UX-15: SYSTEM accounts have no plan/license concept → never show the
      // upsell card. Non-system: start the badge as a neutral "⋯" skeleton (not
      // "FREE") so a paid org never flashes FREE before getLicenseStatus resolves.
      (isSystem ? '' :
      '<div class="usage-card"><h6 data-i18n="anUsageCur">目前方案</h6><div class="nm-p" id="planBadge">⋯</div>' +
        '<div class="bar"><div id="usageBar" style="width:0%"></div></div>' +
        '<div class="meta-u"><span id="usageText">　</span><span id="usagePct"></span></div>' +
        '<a class="upgrade-link" href="/admin/license.html" data-i18n="anUpgrade">升級方案 →</a></div>') +
      '<a class="nav-it" id="logoutBtn" href="/login.html">' + IC.out + '<span data-i18n="anLogout">登出</span></a>' +
    '</div>';

  side.innerHTML = html;

  // --- #3 RBAC: hide event sub-nav items the member's role can't use ---
  // Owner/system see everything; a member's role determines visible event tabs.
  // UI only — the backend (compAuthCallable capabilities) enforces access regardless.
  var inEvent = !!(em && em[1] && em[1] !== 'index.html');
  // navState coordinates two async calls (event role + plan features). Plan-based feature
  // locks must reflect the EVENT OWNER's entitlements: a member viewing another org's event
  // inherits the owner's paid features (enforced server-side by requireCompFeature), so we
  // only show 🔒 locks to the OWNER of this event — never to members on their personal plan.
  var navState = { role: inEvent ? undefined : 'owner', feats: undefined, applied: false };
  function applyFeatLock() {
    if (navState.applied || navState.feats === undefined || navState.role === undefined) return;
    navState.applied = true;
    if (navState.role !== 'owner') return;   // members inherit owner entitlements — no plan lock
    var feats = navState.feats || {};
    side.querySelectorAll('a.nav-it[data-feat]').forEach(function (a) {
      if (feats[a.getAttribute('data-feat')] === false) {
        a.classList.add('feat-locked');
        if (!a.querySelector('.lock-i')) { var lk = document.createElement('span'); lk.className = 'lock-i'; lk.textContent = '🔒'; a.appendChild(lk); }
        a.addEventListener('click', function (e) {
          e.preventDefault();
          var msg = window.L ? window.L('anFeatLocked') : '此功能需升級方案才能使用';
          if (window.uiAlert) { uiAlert(msg).then(function () { location.href = '/admin/license.html'; }); }
          else { alert(msg); location.href = '/admin/license.html'; }
        });
      }
    });
  }
  if (inEvent && window.google && window.google.script && window.google.script.run && window.google.script.run.getMyEventRole) {
    try {
      window.google.script.run.withSuccessHandler(function (res) {
        var role = (res && res.role) || 'owner'; // null → treat as full (own/unknown context)
        navState.role = role;
        if (role !== 'owner') {
          side.querySelectorAll('a.nav-it[data-evt-roles]').forEach(function (a) {
            var allowed = (a.getAttribute('data-evt-roles') || '').split(/\s+/);
            if (allowed.indexOf(role) < 0) a.style.display = 'none';
          });
        }
        applyFeatLock();
      }).withFailureHandler(function () { navState.role = 'owner'; applyFeatLock(); }).getMyEventRole(em[1]);
    } catch (e) { navState.role = 'owner'; applyFeatLock(); }
  }

  // --- Logout ---
  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      try { if (window.AppState) AppState.setMe(null); else localStorage.removeItem('regmaster_me'); } catch (x) {}
      location.href = '/login.html';
    });
  }

  // --- Plan badge: FREE unless the account holds a valid (paid) license ---
  if (me && me.sessionToken && !isSystem && window.google && window.google.script && window.google.script.run) {
    try {
      google.script.run.withSuccessHandler(function (res) {
        var badge = document.getElementById('planBadge');
        var ut = document.getElementById('usageText');
        if (!badge) return;
        var LL = function (k, fb) { return window.L ? window.L(k) : fb; };
        // These are now dynamic; drop data-i18n so the applier won't clobber them on lang switch.
        if (ut) ut.removeAttribute('data-i18n');
        if (res && res.hasValid) {
          badge.textContent = res.planLabel || LL('anUsageFreeText', '付費方案');
          if (ut) ut.textContent = res.expiresAt ? (LL('anUntil', '至 ') + res.expiresAt) : (res.message || '');
        } else {
          badge.textContent = 'FREE';
          if (ut) ut.textContent = LL('anUsageFreeHint', '免費方案 — 升級解鎖更多');
        }
        // UX-002: lock (not hide) the sub-nav items whose feature the plan excludes,
        // and turn the click into an upsell. Applied via applyFeatLock(), which only locks
        // when the viewer is the OWNER of this event (members inherit owner entitlements).
        navState.feats = (res && res.features) || {};
        applyFeatLock();
      }).withFailureHandler(function () {}).getLicenseStatus();
    } catch (x) {}
  }

  // --- Restore persisted desktop-collapsed state ---
  var LS_COLLAPSE = 'regmaster_side_collapsed';
  try { if (localStorage.getItem(LS_COLLAPSE) === '1') document.body.classList.add('side-collapsed'); } catch (x) {}

  function isMobile() { return window.matchMedia('(max-width: 768px)').matches; }
  function closeDrawer() { document.body.classList.remove('side-open'); }

  // Backdrop for the mobile drawer
  var backdrop = document.createElement('div');
  backdrop.className = 'side-backdrop';
  backdrop.addEventListener('click', closeDrawer);
  document.body.appendChild(backdrop);

  // ONE always-visible toggle in the topbar:
  //   • mobile  → open / close the off-canvas drawer
  //   • desktop → collapse / expand the sidebar (persisted)
  // This is also how a collapsed desktop sidebar gets re-opened.
  var head = document.querySelector('.head');
  if (head && !head.querySelector('.side-hamburger')) {
    var burger = document.createElement('button');
    burger.type = 'button';
    burger.className = 'side-hamburger';
    burger.setAttribute('aria-label', '展開 / 收合選單');
    burger.title = '展開 / 收合選單';
    burger.innerHTML = '<svg fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
    burger.addEventListener('click', function () {
      if (isMobile()) {
        document.body.classList.toggle('side-open');
      } else {
        var c = document.body.classList.toggle('side-collapsed');
        try { localStorage.setItem(LS_COLLAPSE, c ? '1' : '0'); } catch (x) {}
      }
    });
    head.insertBefore(burger, head.firstChild);
  }
  // Language toggle in the admin topbar (中/EN) — lets organisers switch inside the console.
  if (head && window.AppState && typeof window.AppState.setLang === 'function' && !head.querySelector('.admin-lang-toggle')) {
    var lang = document.createElement('button');
    lang.type = 'button';
    lang.className = 'admin-lang-toggle';
    lang.title = window.L ? window.L('anLangTitle') : '切換語言 / Switch language';
    lang.textContent = '中/EN';
    lang.style.cssText = 'margin-left:auto;background:var(--surface-2,#f1f5f9);border:1px solid var(--line,#e2e8f0);color:var(--ink-2,#334155);font:600 12px/1 var(--f-tc,system-ui);padding:7px 11px;border-radius:8px;cursor:pointer;flex-shrink:0';
    lang.addEventListener('click', function () {
      var cur = window.AppState.getLang();
      window.AppState.setLang(cur === 'en' ? 'zh' : 'en');
    });
    head.appendChild(lang);
  }
  // Close the drawer after tapping a link on mobile.
  side.addEventListener('click', function (e) {
    if (e.target.closest('a.nav-it') && isMobile()) closeDrawer();
  });
})();
