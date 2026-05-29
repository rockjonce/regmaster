// =============================================================================
// RegMaster · Shared Admin Sidebar Normalizer (shared/admin-nav.js)
// =============================================================================
// Makes the admin sidebar role-aware and consistent across EVERY admin page:
//
//   • role = "competition" (主辦方)  → only organizer features are shown;
//        every system-only link is stripped out.
//   • role = "system"      (系統管理員) → organizer features PLUS one canonical
//        「系統管理」group (系統設定 / 操作日誌 / Super Admin), appended
//        consistently on every page.
//
// The organizer nav (儀表板 / 所有活動 / AI 助理 / 方案與授權 / 設定) is already
// hardcoded in each page's sidebar, so this script only normalizes the
// SYSTEM-ONLY portion. That gives the behavior the product needs without
// refactoring every page: a system admin sees the full feature set everywhere,
// an organizer never sees a system-only link.
//
// Load order: include AFTER /shared/app-state.js (it reads the session straight
// from localStorage so it does not depend on AppState.init() having run yet).
// Pages without a standard <aside class="side"> (e.g. the form-builder editor)
// are no-ops.
// =============================================================================
(function () {
  var me = null;
  try { me = JSON.parse(localStorage.getItem('regmaster_me') || 'null'); } catch (e) {}
  var isSystem = me && me.role === 'system';

  var side = document.querySelector('aside.side');
  if (!side) return; // page has no standard sidebar — nothing to normalize

  // Any link pointing at one of these is "system-only".
  var SYS_HREFS = ['/admin/system.html', '/admin/super.html', '/admin/audit.html', '/admin/system', '/admin/super'];
  // ...and the current-page (no-href) nav items on the system pages carry these labels.
  var SYS_LABELS = ['系統設定', '操作日誌', 'Super Admin'];
  function isSysHref(h) { h = h || ''; return SYS_HREFS.some(function (s) { return h.indexOf(s) >= 0; }); }

  // 1) Strip every existing system-only nav item (by href OR by label, so the
  //    "active" no-href entries on system pages are caught too) and any sys-only
  //    blocks. Runs for BOTH roles: organizers lose them; for system admins it
  //    de-dups before we re-inject one canonical group.
  side.querySelectorAll('.nav-it, a[href]').forEach(function (a) {
    var h = a.getAttribute('href');
    var label = (a.textContent || '').replace(/\s+/g, ' ').trim();
    if ((h && isSysHref(h)) || SYS_LABELS.indexOf(label) >= 0) a.remove();
  });
  side.querySelectorAll('.sys-only').forEach(function (el) { el.remove(); });

  // 2) Drop any nav group that became empty (its label would otherwise orphan).
  side.querySelectorAll('.nav-grp').forEach(function (g) {
    if (!g.querySelector('a')) g.remove();
  });

  // 3) Ensure the organizer "AI 助理" link is present + consistent on EVERY page
  //    (several pages hardcoded sidebars without it). Shown to both roles.
  if (!side.querySelector('a[href*="/admin/ai"]')) {
    var eventsLink = side.querySelector('a[href*="/admin/events"]');
    if (eventsLink) {
      var aiOn = location.pathname.indexOf('/admin/ai') >= 0 ? ' on' : '';
      var ai = document.createElement('a');
      ai.className = 'nav-it' + aiOn;
      ai.href = '/admin/ai.html';
      ai.innerHTML = '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg>AI 助理';
      eventsLink.insertAdjacentElement('afterend', ai);
    }
  }

  // Organizers: done — only their own features remain.
  if (!isSystem) return;

  // 3) System role: append ONE canonical 系統管理 group.
  var ICON = {
    gear: '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.13-1.3l2-1.5-2-3.4-2.3 1a7 7 0 00-2.27-1.3L13.6 2h-3.2l-.4 2.5a7 7 0 00-2.27 1.3l-2.3-1-2 3.4 2 1.5A7 7 0 005 12a7 7 0 00.13 1.3l-2 1.5 2 3.4 2.3-1a7 7 0 002.27 1.3l.4 2.5h3.2l.4-2.5a7 7 0 002.27-1.3l2.3 1 2-3.4-2-1.5A7 7 0 0019 12z"/></svg>',
    log: '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9 9 4 9 9z"/></svg>',
    sup: '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M12 2l4 4-4 4M16 6H4M12 22l4-4-4-4M16 18H4"/></svg>'
  };
  var path = location.pathname;
  function item(href, label, icon) {
    var on = (path === href || path === href.replace('.html', '')) ? ' on' : '';
    return '<a class="nav-it' + on + '" href="' + href + '">' + icon + label + '</a>';
  }
  // 平台總覽 (Super Admin) is now a tab inside 系統設定, so the nav only needs
  // two entries. We still strip any old standalone "Super Admin" links above.
  var grp = document.createElement('div');
  grp.className = 'nav-grp';
  grp.innerHTML =
    '<div class="l-grp">系統管理</div>' +
    item('/admin/system.html', '系統設定', ICON.gear) +
    item('/admin/audit.html', '操作日誌', ICON.log);

  // Insert before the sidebar footer (usage card / logout) when present,
  // otherwise append to the end of the sidebar.
  var foot = side.querySelector('.side-foot');
  if (foot) side.insertBefore(grp, foot);
  else side.appendChild(grp);
})();
