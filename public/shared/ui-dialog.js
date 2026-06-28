// =============================================================================
// RegMaster · Shared styled dialogs (shared/ui-dialog.js)
// =============================================================================
// Replaces the browser's native alert / confirm / prompt with on-brand modals.
//
//   window.alert(msg)                         → styled, non-blocking (overridden)
//   window.uiAlert(msg, {title,okText})       → Promise<void>
//   window.uiConfirm(msg, {title,okText,cancelText,danger}) → Promise<boolean>
//   window.uiPrompt(msg, defaultValue, {...})  → Promise<string|null>
//   window.uiToast(msg, type)                  → transient toast ('ok'|'err')
//
// Self-contained: injects its own CSS (uses v3 tokens with fallbacks) and a
// lazily-created root, so it works on any page that includes this file.
// Load it once per page (e.g. in <head> after firebase-bridge.js).
// =============================================================================
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  function ensureRoot() {
    if (document.getElementById('uiDlgStyle')) return;
    var css =
      '#uiDlgRoot{position:fixed;inset:0;z-index:99990;display:none;pointer-events:none}' +
      '#uiDlgRoot.on{display:block}' +
      '.ui-dlg-bg{position:fixed;inset:0;background:rgba(10,20,40,.45);display:flex;align-items:center;justify-content:center;padding:20px;pointer-events:auto;animation:uiFade .15s ease}' +
      '@keyframes uiFade{from{opacity:0}}' +
      '@keyframes uiPop{from{opacity:0;transform:translateY(8px) scale(.98)}}' +
      '.ui-dlg{background:var(--surface,#fff);color:var(--ink,#0b1c3d);border:1px solid var(--line,#e2e8f0);border-radius:16px;width:100%;max-width:420px;box-shadow:0 18px 60px rgba(10,20,40,.28);overflow:hidden;animation:uiPop .18s ease}' +
      '.ui-dlg-h{padding:18px 22px 0;font:700 17px/1.3 var(--f-display,"Inter Tight",system-ui,sans-serif)}' +
      '.ui-dlg-b{padding:12px 22px 20px;font:400 14px/1.6 var(--f-tc,"Noto Sans TC",sans-serif);color:var(--ink-2,#33425f)}' +
      '.ui-dlg-input{width:100%;margin-top:14px;padding:10px 12px;background:var(--surface-2,#f1f5f9);border:1px solid var(--line,#e2e8f0);border-radius:9px;font:500 15px/1.3 var(--f-tc,sans-serif);color:var(--ink,#0b1c3d);box-sizing:border-box}' +
      '.ui-dlg-input:focus{outline:0;border-color:var(--acc,#3d6bff);box-shadow:0 0 0 3px rgba(61,107,255,.16)}' +
      '.ui-dlg-f{display:flex;gap:10px;justify-content:flex-end;padding:0 22px 18px}' +
      '.ui-dlg-btn{padding:9px 18px;border-radius:9px;font:600 13.5px/1 var(--f-tc,sans-serif);cursor:pointer;border:1px solid transparent}' +
      '.ui-dlg-btn.ghost{background:var(--surface,#fff);border-color:var(--line,#e2e8f0);color:var(--ink-2,#33425f)}' +
      '.ui-dlg-btn.ghost:hover{background:var(--surface-2,#f1f5f9)}' +
      '.ui-dlg-btn.primary{background:var(--ink,#0b1c3d);color:#fff}' +
      '.ui-dlg-btn.danger{background:var(--err-600,#dc2626);color:#fff}' +
      '#uiToastWrap{position:fixed;top:18px;right:18px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none}' +
      '.ui-toast{padding:11px 16px;border-radius:9px;font:600 13px/1.4 var(--f-tc,sans-serif);color:#fff;box-shadow:0 8px 24px rgba(10,20,40,.2);transition:opacity .3s;animation:uiPop .2s ease}' +
      '.ui-toast.ok{background:var(--ok-600,#059669)}.ui-toast.err{background:var(--err-600,#dc2626)}';
    var style = document.createElement('style'); style.id = 'uiDlgStyle'; style.textContent = css;
    document.head.appendChild(style);
    var root = document.createElement('div'); root.id = 'uiDlgRoot'; document.body.appendChild(root);
    var tw = document.createElement('div'); tw.id = 'uiToastWrap'; document.body.appendChild(tw);
  }

  function dialog(opts) {
    return new Promise(function (resolve) {
      ensureRoot();
      var root = document.getElementById('uiDlgRoot'); root.classList.add('on');
      var bg = document.createElement('div'); bg.className = 'ui-dlg-bg';
      var inputHtml = opts.prompt ? '<input class="ui-dlg-input" type="' + (opts.inputType || 'text') + '" placeholder="' + esc(opts.placeholder || '') + '" value="' + esc(opts.defaultValue || '') + '">' : '';
      bg.innerHTML = '<div class="ui-dlg" role="dialog" aria-modal="true">' +
        (opts.title ? '<div class="ui-dlg-h">' + esc(opts.title) + '</div>' : '') +
        '<div class="ui-dlg-b">' + esc(opts.message).replace(/\n/g, '<br>') + inputHtml + '</div>' +
        '<div class="ui-dlg-f">' +
          (opts.cancelText !== null ? '<button class="ui-dlg-btn ghost" data-act="cancel">' + esc(opts.cancelText || '取消') + '</button>' : '') +
          '<button class="ui-dlg-btn ' + (opts.danger ? 'danger' : 'primary') + '" data-act="ok">' + esc(opts.okText || '確定') + '</button>' +
        '</div></div>';
      root.appendChild(bg);
      var input = bg.querySelector('.ui-dlg-input');
      if (input) setTimeout(function () { input.focus(); input.select(); }, 30);
      function close(val) {
        bg.remove();
        if (!root.querySelector('.ui-dlg-bg')) root.classList.remove('on');
        resolve(val);
      }
      bg.addEventListener('click', function (e) {
        var act = e.target.getAttribute && e.target.getAttribute('data-act');
        if (e.target === bg && opts.cancelText !== null) return close(opts.prompt ? null : false);
        if (act === 'cancel') return close(opts.prompt ? null : false);
        if (act === 'ok') return close(opts.prompt ? (input ? input.value : '') : true);
      });
      if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); close(input.value); } });
    });
  }

  window.uiAlert = function (message, opts) {
    opts = opts || {};
    // R5 M-1: identical alert already on screen → don't stack a duplicate behind it
    var root = document.getElementById('uiDlgRoot');
    if (root) {
      var openMsgs = root.querySelectorAll('.ui-dlg-b');
      for (var i = 0; i < openMsgs.length; i++) {
        if (openMsgs[i].textContent === String(message == null ? '' : message)) return Promise.resolve();
      }
    }
    return dialog({ title: opts.title || '提示', message: message, okText: opts.okText || '知道了', cancelText: null, danger: opts.danger });
  };
  window.uiConfirm = function (message, opts) { opts = opts || {}; return dialog({ title: opts.title || '請確認', message: message, okText: opts.okText || '確定', cancelText: opts.cancelText || '取消', danger: opts.danger }); };
  window.uiPrompt = function (message, defaultValue, opts) { opts = opts || {}; return dialog({ title: opts.title || '輸入', message: message, prompt: true, defaultValue: defaultValue || '', placeholder: opts.placeholder || '', okText: opts.okText || '確定', cancelText: opts.cancelText || '取消', inputType: opts.inputType || 'text' }); };
  // uiToast(msg, type)                        → transient (2.6s auto-fade) — unchanged
  // uiToast(msg, type, { sticky: true })      → never auto-fades; caller dismisses via the handle
  // uiToast(msg, type, { id: 'apply-payout'}) → reuse/replace a toast with the same id in place
  // uiToast(msg, type, { duration: 5000 })    → custom lifetime in ms
  // Returns { dismiss(), update(newMsg, newType) }. Older 2-arg call sites ignore the handle safely.
  window.uiToast = function (message, type, opts) {
    ensureRoot();
    opts = opts || {};
    var wrap = document.getElementById('uiToastWrap');
    var id = opts.id ? String(opts.id).replace(/[^\w-]/g, '') : '';
    var t = id ? wrap.querySelector('[data-toast-id="' + id + '"]') : null;
    if (!t) {
      t = document.createElement('div');
      t.className = 'ui-toast ' + (type || 'ok');
      if (id) t.setAttribute('data-toast-id', id);
      wrap.appendChild(t);
    } else {
      t.className = 'ui-toast ' + (type || 'ok');
      if (t.__timer) { clearTimeout(t.__timer); t.__timer = null; }
      t.style.opacity = '1';
    }
    t.textContent = message;
    function fadeOut() { t.style.opacity = '0'; setTimeout(function () { if (t.parentNode) t.remove(); }, 300); }
    var dur = (opts.sticky === true) ? 0 : (typeof opts.duration === 'number' ? opts.duration : 2600);
    if (dur > 0) t.__timer = setTimeout(fadeOut, dur);
    return {
      dismiss: function () { if (t.__timer) { clearTimeout(t.__timer); t.__timer = null; } fadeOut(); },
      update: function (newMsg, newType) {
        if (typeof newMsg === 'string') t.textContent = newMsg;
        if (typeof newType === 'string') t.className = 'ui-toast ' + newType;
      }
    };
  };

  // Session-expired errors are already handled by firebase-bridge's proxy (it
  // hard-redirects to /login), so withLoadingUI must NOT also pop an alert for them.
  function _isSessionExpired(err) {
    var m = (err && (err.message || err.toString())) || '';
    return m.indexOf('登入已失效') !== -1 || m.indexOf('Session expired') !== -1 ||
           m.indexOf('Authentication required') !== -1 || m.indexOf('請先登入') !== -1;
  }

  // ---------------------------------------------------------------------------
  // withLoadingUI(btn, asyncFn, opts) — one canonical "click → call → respond"
  // wrapper. Disables the button (+ optional extra elements via disableSelector),
  // swaps in busy text and an optional sticky toast, awaits asyncFn(), then
  // restores everything in BOTH the success and failure paths. Pair with runFn:
  //   withLoadingUI(btn, function () { return runFn('applyPayout', id, a, b); }, { ... })
  //
  // opts: busyText, toast(bool), toastMsg, toastType, toastId, successMsg,
  //       errorTitle, blockUnload, unloadMsg, disableSelector, skipIfBusy(default true)
  // Returns the asyncFn promise (rethrows on error → chain .catch(function(){}) ).
  // ---------------------------------------------------------------------------
  window.withLoadingUI = function (btn, asyncFn, opts) {
    opts = opts || {};
    var L = window.L || function (k) { return k; };
    var busyText = opts.busyText || L('uiBusyDefault');
    var wantToast = (opts.toast === false) ? false : !!(opts.toastMsg || busyText);
    // Reentry guard — same button still running → no-op (covers fast double-click).
    if (btn && opts.skipIfBusy !== false && btn.dataset && btn.dataset.uiBusy === '1') {
      return Promise.resolve(undefined);
    }
    var origText = null, origDisabled = null;
    if (btn) {
      origText = btn.textContent; origDisabled = btn.disabled;
      if (btn.dataset) btn.dataset.uiBusy = '1';
      btn.disabled = true;
      if (busyText) btn.textContent = busyText;
    }
    var extras = [];
    if (opts.disableSelector) {
      try {
        document.querySelectorAll(opts.disableSelector).forEach(function (el) {
          if (el === btn || el.disabled) return;
          el.disabled = true; extras.push(el);
        });
      } catch (e) { /* bad selector — ignore */ }
    }
    var toastHandle = wantToast
      ? window.uiToast(opts.toastMsg || busyText, opts.toastType || 'ok', { sticky: true, id: opts.toastId })
      : null;
    var prevUnload = null, unloadAttached = false;
    if (opts.blockUnload) {
      prevUnload = window.onbeforeunload;
      var um = opts.unloadMsg || L('uiUnloadWarning');
      window.onbeforeunload = function (e) { e.preventDefault(); e.returnValue = um; return um; };
      unloadAttached = true;
    }
    function cleanup() {
      if (btn) {
        try { btn.disabled = origDisabled === true; } catch (e) {}
        try { if (origText !== null) btn.textContent = origText; } catch (e) {}
        try { if (btn.dataset) delete btn.dataset.uiBusy; } catch (e) {}
      }
      extras.forEach(function (el) { try { el.disabled = false; } catch (e) {} });
      if (unloadAttached) { try { window.onbeforeunload = prevUnload; } catch (e) {} }
    }
    return Promise.resolve().then(asyncFn).then(function (result) {
      cleanup();
      if (toastHandle) {
        if (opts.successMsg) { toastHandle.update(opts.successMsg, 'ok'); setTimeout(toastHandle.dismiss, 1800); }
        else { toastHandle.dismiss(); }
      }
      return result;
    }).catch(function (err) {
      cleanup();
      if (toastHandle) toastHandle.dismiss();
      if (!_isSessionExpired(err)) {
        window.uiAlert((err && (err.message || err.toString())) || L('uiErrorDefault'), { title: opts.errorTitle || L('uiErrorDefault') });
      }
      throw err;
    });
  };

  // Transparently style native alert() — it's fire-and-forget feedback, so a
  // non-blocking styled modal is a safe drop-in (no call-site changes needed).
  window.alert = function (message) { window.uiAlert(message); };
})();
