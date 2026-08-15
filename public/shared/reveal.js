// =============================================================================
// RegMaster · Landing page motion (shared/reveal.js)
// =============================================================================
// 兩件事：
//   1) 捲動進場 —— 每個 [data-reveal] 區塊捲入視窗時加上 .in，由 styles.css 讓其
//      直接子元素淡入上移。搭配 <head> 內的 html.js-reveal class（沒有 JS 就完全不隱藏）。
//   2) 固定導覽列 —— 捲離頁首後加上 .scrolled，讓導覽列與內容分層（見檔案末段）。
//
// 設計取捨：
//   - 只加 class、不寫 inline style，動效參數全留在 CSS，方便統一調整與覆寫。
//   - 進場後即 unobserve：本站是行銷頁，不需要往回捲時重播（重播會讓人分心）。
//   - 尊重 prefers-reduced-motion：直接把所有區塊標成已進場，不跑 observer。
//   - rootMargin 0px 0px -10%：元素露出約一成才觸發，避免邊緣就搶跑。
// =============================================================================
(function () {
  function all() { return Array.prototype.slice.call(document.querySelectorAll('[data-reveal]')); }

  function showAll() { all().forEach(function (el) { el.classList.add('in'); }); }

  function init() {
    // 使用者要求減少動態，或瀏覽器不支援 IntersectionObserver → 直接全部顯示
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) { showAll(); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);   // 一次性：不往回重播
      });
    }, { rootMargin: '0px 0px -10% 0px' });

    var els = all();
    if (!els.length) return;

    // 首屏的區塊立即顯示，不等 observer 首次回呼 —— 首屏內容不該有進場延遲，
    // 也避免在不合成畫面的環境（背景分頁／嵌入式檢視）中 observer 不觸發而整頁空白。
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.9) el.classList.add('in'); else io.observe(el);
    });
  }

  // 固定導覽列：捲離頁首後加上 .scrolled（樣式在 shared/styles.css）。
  // 用 passive 監聽 + rAF 節流，避免捲動時每一幀都讀寫版面造成卡頓。
  function initNav() {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    var ticking = false, on = false;
    function apply() {
      ticking = false;
      var should = (window.scrollY || document.documentElement.scrollTop) > 8;
      if (should === on) return;      // 狀態沒變就不碰 DOM
      on = should;
      nav.classList.toggle('scrolled', should);
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }, { passive: true });
    apply();   // 重新整理時可能已在頁面中段，先套一次
  }

  function boot() { init(); initNav(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
