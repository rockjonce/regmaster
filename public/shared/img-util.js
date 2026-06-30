// =============================================================================
// RegMaster · Shared client-side image helper (shared/img-util.js)
// =============================================================================
// compressImage(file, opts) → Promise<{
//   ok, b64, dataUrl, mime, compressed, origKB, newKB, width, height
// }>
//   opts: { maxKB (default 500), maxDim (default 1200) }
//
// Behaviour:
//   - file already within BOTH maxKB and maxDim  → returned unchanged (compressed:false)
//   - otherwise → resized to fit maxDim and JPEG-recompressed until ≤ maxKB (compressed:true)
//   - cannot get under maxKB even at the lowest quality → { ok:false }
//
// Images in RegMaster are stored as base64 inside Firestore docs (1MB doc limit),
// so callers should keep maxKB well under ~650KB. base64 length ≈ binary × 1.37.
// =============================================================================
(function () {
  window.compressImage = function (file, opts) {
    opts = opts || {};
    var maxKB = opts.maxKB || 500;
    var maxDim = opts.maxDim || 1200;
    var maxLen = maxKB * 1024 * 1.37;   // target base64 string length for maxKB binary
    return new Promise(function (resolve) {
      if (!file) { resolve({ ok: false }); return; }
      var r = new FileReader();
      r.onerror = function () { resolve({ ok: false }); };
      r.onload = function (e) {
        var dataUrl = e.target.result;
        var origKB = Math.round((file.size || 0) / 1024);
        var img = new Image();
        img.onerror = function () { resolve({ ok: false }); };
        img.onload = function () {
          var biggest = Math.max(img.width, img.height);
          // Already small enough on both axes → keep the original bytes untouched.
          if ((file.size || 0) <= maxKB * 1024 && biggest <= maxDim) {
            resolve({ ok: true, b64: String(dataUrl).split(',')[1], dataUrl: dataUrl,
              mime: file.type || 'image/png', compressed: false, origKB: origKB, newKB: origKB,
              width: img.width, height: img.height });
            return;
          }
          var scale = Math.min(1, maxDim / biggest);
          var cw = Math.max(1, Math.round(img.width * scale));
          var ch = Math.max(1, Math.round(img.height * scale));
          var canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
          canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
          var q = 0.85, out = canvas.toDataURL('image/jpeg', q);
          while (out.length > maxLen && q > 0.35) { q = Math.round((q - 0.1) * 100) / 100; out = canvas.toDataURL('image/jpeg', q); }
          if (out.length > maxLen) { resolve({ ok: false }); return; }   // still too big at min quality
          resolve({ ok: true, b64: out.split(',')[1], dataUrl: out, mime: 'image/jpeg',
            compressed: true, origKB: origKB, newKB: Math.round(out.length * 0.73 / 1024),
            width: cw, height: ch });
        };
        img.src = dataUrl;
      };
      r.readAsDataURL(file);
    });
  };
})();
