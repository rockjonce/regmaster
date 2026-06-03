// =============================================================================
// RegMaster · I18N — Admin / My Activity Log page (shared/i18n-admin-my-logs.js)
// =============================================================================
// Page-scoped keys for /admin/my-logs.html (the organiser's own activity log).
// Prefix: adLog*. Loaded immediately after /shared/i18n.js.
// Log ENTRY content (action names, targets, timestamps) is DATA — not here.
// =============================================================================
(function () {
  if (!window.I18N) return;
  var Z = {
    adLogPageTitle: '操作紀錄 · 主辦後台 · RegMaster',
    adLogCrumbHome: '主辦後台',
    adLogCrumbHere: '操作紀錄',
    adLogH1: '操作紀錄',
    adLogLead: '這裡列出您帳號的重要操作紀錄 — 何時、做了什麼，方便日後查核。',
    adLogRoNote: '本頁僅供檢視，紀錄無法編輯或刪除，以確保稽核完整性。',
    adLogSearchPh: '搜尋操作 / 目標...',
    adLogFilterAll: '全部',
    adLogFilterCreate: '建立',
    adLogFilterUpdate: '修改',
    adLogFilterDelete: '刪除',
    adLogFilterPay: '付款',
    adLogLimit200: '最近 200 筆',
    adLogLimit500: '最近 500 筆',
    adLogLoading: '載入中⋯',
    adLogEmptyTitle: '尚無操作紀錄',
    adLogEmptyDesc: '當您建立活動、修改設定或完成付款時，紀錄會顯示在這裡。',
    adLogLoadFail: '無法載入紀錄',
    adLogIdLabel: 'ID：'
  };
  var E = {
    adLogPageTitle: 'Activity Log · Organizer Console · RegMaster',
    adLogCrumbHome: 'Organizer Console',
    adLogCrumbHere: 'Activity Log',
    adLogH1: 'Activity Log',
    adLogLead: 'This is the log of important actions on your account — when, and what you did, for easy review later.',
    adLogRoNote: 'This page is read-only; records cannot be edited or deleted, to preserve audit integrity.',
    adLogSearchPh: 'Search action / target...',
    adLogFilterAll: 'All',
    adLogFilterCreate: 'Created',
    adLogFilterUpdate: 'Updated',
    adLogFilterDelete: 'Deleted',
    adLogFilterPay: 'Payment',
    adLogLimit200: 'Latest 200',
    adLogLimit500: 'Latest 500',
    adLogLoading: 'Loading⋯',
    adLogEmptyTitle: 'No activity yet',
    adLogEmptyDesc: 'When you create an event, change settings or complete a payment, the records will appear here.',
    adLogLoadFail: 'Unable to load records',
    adLogIdLabel: 'ID: '
  };
  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
