// =============================================================================
// RegMaster · Lightweight visitor tracking (shared/track-visit.js)
// =============================================================================
// Records a page visit via the logVisit callable. This feeds:
//   • 系統管理員「使用者分析」(traffic / device / country charts)
//   • 各活動 viewCount → 報名轉換率 (瀏覽→報名) 等統計
//
// Auto-detects compId from ?id= / ?comp= (or window.__TRACK_COMP_ID__).
// Safe to include on any public page: it no-ops if the callable bridge is
// absent, and guards with sessionStorage so it logs at most once per page
// per browser session per day (the server also dedups by IP+page+date).
//
// Load AFTER /shared/firebase-bridge.js.
// =============================================================================
(function () {
  if (!(window.google && google.script && google.script.run && google.script.run.logVisit)) return;

  // Once per page, per session, per day — avoids spamming records on reloads
  // (important when the IP lookup fails and server-side dedup can't engage).
  var dayKey = new Date().toISOString().slice(0, 10);
  var guardKey = 'rm_visit_' + location.pathname + '_' + dayKey;
  try { if (sessionStorage.getItem(guardKey)) return; sessionStorage.setItem(guardKey, '1'); } catch (e) {}

  function compIdFromUrl() {
    try {
      var qs = new URLSearchParams(location.search);
      var id = qs.get('id') || qs.get('comp') || (window.__TRACK_COMP_ID__ || '');
      return (id && /^[A-Za-z0-9_-]+$/.test(id)) ? id : '';
    } catch (e) { return ''; }
  }

  function send(ip, country, city) {
    try {
      google.script.run
        .withSuccessHandler(function () {})
        .withFailureHandler(function () {})
        .logVisit(
          ip || '', country || '', city || '',
          (navigator.userAgent || '').slice(0, 180),   // server stores the UA so 使用者分析 can classify device
          location.pathname,
          compIdFromUrl()
        );
    } catch (e) {}
  }

  // Best-effort geo/IP lookup; tracking still fires (with blanks) on failure.
  try {
    fetch('https://ipapi.co/json/')
      .then(function (r) { return r.json(); })
      .then(function (d) { send(d && d.ip, d && d.country_name, d && d.city); })
      .catch(function () { send('', '', ''); });
  } catch (e) { send('', '', ''); }
})();
