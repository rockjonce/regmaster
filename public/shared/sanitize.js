/* RegMaster shared HTML sanitizer (P0-1).
 * DOM-based whitelist: parses with an INERT DOMParser document (images/scripts do NOT
 * load or execute during parsing), then strips disallowed tags/attributes, event handlers,
 * and unsafe url schemes before returning innerHTML. Use for any organiser-authored rich
 * text that ends up in innerHTML (event description, rules, announcement previews, etc.).
 */
(function () {
  var ALLOWED_TAGS = ['A', 'B', 'STRONG', 'EM', 'I', 'U', 'BR', 'SPAN', 'P', 'DIV',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'HR', 'IMG',
    'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'PRE', 'CODE', 'FIGURE', 'FIGCAPTION', 'SMALL'];
  var ALLOWED_ATTR = {
    A: ['href', 'target', 'rel'],
    IMG: ['src', 'alt', 'width', 'height'],
    TD: ['colspan', 'rowspan'], TH: ['colspan', 'rowspan'],
    '*': ['style', 'class']
  };
  // style values carrying these are dropped (defang legacy/edge CSS vectors)
  var BAD_STYLE = /expression\s*\(|javascript:|vbscript:|url\s*\(\s*['"]?\s*(javascript|vbscript|data:text)/i;

  window.sanitizeRichHtml = function (html) {
    var doc;
    try { doc = new DOMParser().parseFromString(String(html == null ? '' : html), 'text/html'); }
    catch (e) { return ''; }
    if (!doc || !doc.body) return '';
    (function walk(node) {
      // copy list first — we mutate during iteration
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) return;                  // text node — keep
        if (n.nodeType !== 1) { n.remove(); return; }  // comments / others — drop
        var tag = n.tagName;
        if (ALLOWED_TAGS.indexOf(tag) === -1) {        // disallowed tag → unwrap, keep children/text
          while (n.firstChild) node.insertBefore(n.firstChild, n);
          n.remove();
          return;
        }
        var allow = (ALLOWED_ATTR[tag] || []).concat(ALLOWED_ATTR['*'] || []);
        Array.prototype.slice.call(n.attributes).forEach(function (a) {
          var name = a.name.toLowerCase();
          if (name.indexOf('on') === 0 || allow.indexOf(name) === -1) { n.removeAttribute(a.name); return; }
          if (name === 'style' && BAD_STYLE.test(a.value || '')) { n.removeAttribute(a.name); }
        });
        if (tag === 'A') {
          var href = n.getAttribute('href') || '';
          if (!/^(https?:|mailto:|tel:|\/)/i.test(href)) n.removeAttribute('href');
          n.setAttribute('rel', 'noopener noreferrer');
          n.setAttribute('target', '_blank');
        }
        if (tag === 'IMG') {
          var src = n.getAttribute('src') || '';
          if (!/^(https?:|data:image\/)/i.test(src)) { n.remove(); return; }
        }
        walk(n);
      });
    })(doc.body);
    return doc.body.innerHTML;
  };

  // Convenience: safe plain-text extraction from possibly-HTML input (inert, no loads).
  window.richToPlainText = function (html) {
    var doc;
    try { doc = new DOMParser().parseFromString(String(html == null ? '' : html), 'text/html'); }
    catch (e) { return ''; }
    return ((doc && doc.body && doc.body.textContent) || '').trim().replace(/\s+/g, ' ');
  };
})();
