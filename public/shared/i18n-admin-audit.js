// =============================================================================
// RegMaster · I18N add-on for /admin/audit.html (Audit Log viewer)
// =============================================================================
// Page-scoped keys, prefixed `adAud`. Merged into the shared window.I18N dict.
// Inline-markup values are applied via [data-i18n-html]; plain text via others.
// IMPORTANT: only UI chrome (titles, filter labels, table/column headers,
// buttons, empty/loading/error states) is translated here. The audit log
// ENTRIES themselves (action values, user names, targets, timestamps) are
// stored data and are never translated.
// =============================================================================
(function () {
  if (!window.I18N) return;
  var Z = {
    adAudTitle: '操作日誌 / Audit Trail',
    adAudSub: '所有重要操作都會記錄於此 — 誰、何時、做了什麼。',
    adAudSearchPh: '搜尋使用者 / 操作 / 目標...',
    adAudFilterAll: '全部',
    adAudFilterCreate: '建立',
    adAudFilterUpdate: '修改',
    adAudFilterDelete: '刪除',
    adAudFilterLogin: '登入',
    adAudLimit100: '最近 100 筆',
    adAudLimit500: '最近 500 筆',
    adAudLimit1000: '最近 1000 筆',
    adAudLoading: '載入中⋯',
    adAudEmptyTitle: '沒有符合的紀錄',
    adAudEmptySub: '試試調整篩選條件',
    adAudLoadFail: '無法載入'
  };
  var E = {
    adAudTitle: 'Audit Log',
    adAudSub: 'Every important action is logged here — who, when, and what they did.',
    adAudSearchPh: 'Search user / action / target...',
    adAudFilterAll: 'All',
    adAudFilterCreate: 'Create',
    adAudFilterUpdate: 'Update',
    adAudFilterDelete: 'Delete',
    adAudFilterLogin: 'Login',
    adAudLimit100: 'Last 100',
    adAudLimit500: 'Last 500',
    adAudLimit1000: 'Last 1000',
    adAudLoading: 'Loading⋯',
    adAudEmptyTitle: 'No matching records',
    adAudEmptySub: 'Try adjusting your filters',
    adAudLoadFail: 'Unable to load'
  };
  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
