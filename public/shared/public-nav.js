/* public-nav.js — shared mobile hamburger for the public marketing/nav bar.
   Self-contained: injects its own CSS + builds a drawer by cloning the
   existing .links and .actions anchors. No per-page markup changes needed.
   Fixes: C-5 (no mobile menu) and C-6 (nav .actions row overflowing on mobile). */
(function () {
  var BP = 780; // breakpoint (px)

  function injectCss() {
    if (document.getElementById('rmNavMobileCss')) return;
    var css =
      '.nav-burger{display:none;margin-left:auto;background:none;border:0;font:400 22px/1 system-ui;cursor:pointer;color:var(--ink);padding:6px 10px;border-radius:8px}' +
      '.nav-burger:hover{background:var(--surface-2)}' +
      '.nav-drawer{position:fixed;top:64px;left:0;right:0;background:var(--bg);border-bottom:1px solid var(--hairline);' +
        'padding:14px 20px 22px;display:flex;flex-direction:column;gap:4px;z-index:49;' +
        'box-shadow:0 16px 30px rgba(0,0,0,.14);transform:translateY(-14px);opacity:0;pointer-events:none;transition:transform .18s ease,opacity .18s ease}' +
      '.nav-drawer.open{transform:translateY(0);opacity:1;pointer-events:auto}' +
      '.nav-drawer a{padding:11px 12px;border-radius:8px;font:500 15px/1.2 var(--f-tc);color:var(--ink-2);text-decoration:none}' +
      '.nav-drawer a:hover{background:var(--surface-2);color:var(--ink)}' +
      '.nav-drawer .dr-actions{display:flex;flex-direction:column;gap:8px;margin-top:10px;padding-top:12px;border-top:1px solid var(--hairline)}' +
      '.nav-drawer .dr-actions .btn{width:100%;justify-content:center}' +
      '@media (max-width:' + BP + 'px){.nav .links,.nav .actions{display:none!important}.nav-burger{display:inline-flex!important}}' +
      '@media (min-width:' + (BP + 1) + 'px){.nav-burger,.nav-drawer{display:none!important}.nav-drawer.open{display:none!important}}';
    var s = document.createElement('style');
    s.id = 'rmNavMobileCss';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function init() {
    var nav = document.querySelector('nav.nav');
    if (!nav || nav.querySelector('.nav-burger')) return;
    injectCss();

    var links = nav.querySelector('.links');
    var actions = nav.querySelector('.actions');

    var burger = document.createElement('button');
    burger.className = 'nav-burger';
    burger.type = 'button';
    burger.setAttribute('aria-label', '選單');
    burger.setAttribute('aria-expanded', 'false');
    burger.textContent = '☰'; // ☰
    nav.appendChild(burger);

    var drawer = document.createElement('div');
    drawer.className = 'nav-drawer';

    if (links) {
      links.querySelectorAll('a').forEach(function (a) {
        drawer.appendChild(a.cloneNode(true));
      });
    }
    if (actions) {
      var wrap = document.createElement('div');
      wrap.className = 'dr-actions';
      // Clone only navigational anchors (skip theme/lang toggle <button>s,
      // whose JS listeners wouldn't survive a clone).
      actions.querySelectorAll('a').forEach(function (a) {
        wrap.appendChild(a.cloneNode(true));
      });
      if (wrap.children.length) drawer.appendChild(wrap);
    }
    document.body.appendChild(drawer);

    function close() {
      drawer.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      burger.textContent = '☰';
    }
    function toggle() {
      var open = drawer.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.textContent = open ? '✕' : '☰'; // ✕ / ☰
    }
    burger.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    drawer.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
    document.addEventListener('click', function (e) {
      if (drawer.classList.contains('open') && !drawer.contains(e.target) && e.target !== burger) close();
    });
    window.addEventListener('resize', function () { if (window.innerWidth > BP) close(); });
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
