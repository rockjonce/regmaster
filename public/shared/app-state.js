// =============================================================================
// RegMaster · App State (shared/app-state.js)
// =============================================================================
// Centralized cross-page state coordinator. Persists to localStorage so each
// page reload restores the user's session, language, theme, font size.
//
// Backward compatibility:
//   - ME object lives in window.ME (read by firebase-bridge.js auto-auth)
//   - regmaster_session cookie still used (the legacy SPA expects it)
//   - LANG / I18N global names preserved
//
// Usage:
//   <script src="/shared/app-state.js"></script>
//   AppState.init();              // call once on every page load (before app code)
//   AppState.setMe({...});        // login
//   AppState.clearMe();           // logout
//   AppState.setLang('en');       // switch language
//   AppState.setTheme('dark');    // switch theme
//   AppState.setFontSize('lg');   // switch font size
//
// Pub/sub:
//   AppState.on('me-changed', cb)
//   AppState.on('lang-changed', cb)
//   AppState.on('theme-changed', cb)
// =============================================================================

(function () {
  var LS_KEY_ME    = 'regmaster_me';
  var LS_KEY_LANG  = 'regmaster_lang';
  var LS_KEY_THEME = 'regmaster_theme';
  var LS_KEY_FONT  = 'regmaster_font_size';
  var COOKIE_SESSION = 'regmaster_session';

  // -------- Cookie helpers (matches legacy SPA's helpers) --------
  function setCookie(name, val, hours) {
    var d = new Date(); d.setTime(d.getTime() + (hours || 24) * 3600000);
    // P1-1: SameSite=Lax (CSRF/leak hardening) + Secure on HTTPS. (Full HttpOnly not possible
    // here — the token must be read by JS to inject `_auth`; tracked as a separate refactor.)
    var secure = (location.protocol === 'https:') ? ';Secure' : '';
    document.cookie = name + '=' + encodeURIComponent(val || '') + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax' + secure;
  }
  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function delCookie(name) {
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
  }
  // Expose globally for firebase-bridge.js and legacy callers
  window.setCookie = window.setCookie || setCookie;
  window.getCookie = window.getCookie || getCookie;
  window.delCookie = window.delCookie || delCookie;

  // -------- Event bus (tiny pub/sub) --------
  var listeners = {};
  function on(event, cb) {
    listeners[event] = listeners[event] || [];
    listeners[event].push(cb);
  }
  function emit(event, payload) {
    (listeners[event] || []).forEach(function (cb) { try { cb(payload); } catch (e) { console.error(e); } });
  }

  // -------- ME (session) --------
  function loadMe() {
    try {
      var raw = localStorage.getItem(LS_KEY_ME);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function setMe(me) {
    window.ME = me;
    if (me) {
      try { localStorage.setItem(LS_KEY_ME, JSON.stringify(me)); } catch (e) {}
      if (me.sessionToken) setCookie(COOKIE_SESSION, me.sessionToken, 24 * 7);
    } else {
      try { localStorage.removeItem(LS_KEY_ME); } catch (e) {}
      delCookie(COOKIE_SESSION);
    }
    emit('me-changed', me);
  }
  function clearMe() { setMe(null); }

  // -------- LANG --------
  function loadLang() {
    var v = '';
    try { v = localStorage.getItem(LS_KEY_LANG) || ''; } catch (e) {}
    if (v !== 'zh' && v !== 'en') {
      // Detect from browser
      v = (navigator.language || 'zh').toLowerCase().indexOf('en') === 0 ? 'en' : 'zh';
    }
    return v;
  }
  function setLang(lang) {
    if (lang !== 'zh' && lang !== 'en') lang = 'zh';
    window.LANG = lang;
    document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'zh-Hant');
    try { localStorage.setItem(LS_KEY_LANG, lang); } catch (e) {}
    emit('lang-changed', lang);
  }

  // -------- THEME --------
  function loadTheme() {
    var v = '';
    try { v = localStorage.getItem(LS_KEY_THEME) || ''; } catch (e) {}
    if (v !== 'light' && v !== 'dark') v = 'light';
    return v;
  }
  function setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') theme = 'light';
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(LS_KEY_THEME, theme); } catch (e) {}
    emit('theme-changed', theme);
  }

  // -------- FONT SIZE (sm / md / lg) --------
  function loadFont() {
    var v = '';
    try { v = localStorage.getItem(LS_KEY_FONT) || ''; } catch (e) {}
    if (v !== 'sm' && v !== 'md' && v !== 'lg') v = 'md'; // default 16px
    return v;
  }
  function setFontSize(size) {
    if (size !== 'sm' && size !== 'md' && size !== 'lg') size = 'md';
    document.documentElement.setAttribute('data-font', size);
    try { localStorage.setItem(LS_KEY_FONT, size); } catch (e) {}
    emit('font-changed', size);
  }

  // -------- INIT (call on every page load before app code runs) --------
  function init() {
    var me = loadMe();
    if (me) window.ME = me;
    setLang(loadLang());
    setTheme(loadTheme());
    setFontSize(loadFont());
  }

  // Expose
  window.AppState = {
    init: init,
    on: on,
    setMe: setMe, clearMe: clearMe, getMe: function () { return window.ME || null; },
    setLang: setLang, getLang: function () { return window.LANG; },
    setTheme: setTheme, getTheme: loadTheme,
    setFontSize: setFontSize, getFontSize: loadFont
  };
})();
