// =============================================================================
// RegMaster · I18N · Admin Events Announcements (Notices / EDM composer)
// Page-scoped dictionary for /admin/events/announcements.html. Keys prefixed `aeAnn`.
// Loaded immediately after /shared/i18n.js.
// NOTE: merge-variable tokens like {{競賽名稱}} are NOT translated here — they
// remain verbatim in organiser-typed content and are substituted by the backend.
// =============================================================================
(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- document / breadcrumbs / header -----
    aeAnnDocTitle: '通知 / EDM · 主辦後台 · RegMaster',
    aeAnnSideSub: '主辦方',
    aeAnnCrumbHome: '主辦後台',
    aeAnnCrumbEvents: '活動',
    aeAnnCrumbHere: '通知 / EDM',

    // ----- nav: this event -----
    aeAnnNavHub: '總覽',
    aeAnnNavSettings: '設定',
    aeAnnNavAnn: '通知 / EDM',
    aeAnnNavPayments: '付款',
    aeAnnNavScoring: '評分',
    aeAnnNavCheckin: '報到',
    aeAnnNavGrpOverview: '概覽',
    aeAnnNavGrpThisEvent: '本活動',
    aeAnnNavDashboard: '儀表板',
    aeAnnNavAllEvents: '所有活動',

    // ----- loading -----
    aeAnnLoading: '載入通知⋯',
    aeAnnErrNoId: '未指定活動編號',

    // ----- left column: steps hint + list -----
    aeAnnStepsTitle: '📋 使用步驟',
    aeAnnStep1: '點下方「＋ 新增範本」建立公告',
    aeAnnStep2: '編輯主旨／內容、選擇收件對象',
    aeAnnStep3: '點「🔍 預覽」確認排版',
    aeAnnStep4: '點「立即發送」寄給報名者',
    aeAnnAllTemplates: '所有範本',
    aeAnnNewTemplate: '＋ 新增範本',

    // ----- center: editor header -----
    aeAnnTitlePlaceholder: '範本標題',
    aeAnnPreviewBtn: '🔍 預覽',
    aeAnnSaveBtn: '儲存草稿',
    aeAnnSendBtn: '立即發送 →',
    aeAnnScheduleBtn: '排程發送',
    aeAnnScheduling: '排程中…',
    aeAnnSchedNeedTime: '請先選擇排程時間',
    aeAnnSchedFuture: '排程時間需為未來',
    aeAnnSchedOk: '已排程，屆時系統會自動寄送',
    aeAnnSchedFail: '排程失敗',
    aeAnnStatsOpened: '開信 ',
    aeAnnStatsClicked: '點擊 ',
    aeAnnStatsScheduledPre: '已排程於 ',

    // ----- center: compose meta -----
    aeAnnLblChannel: '通道',
    aeAnnLblRecipients: '收件對象',
    aeAnnLblSubject: '主旨',
    aeAnnChSoon: '即將',
    aeAnnRecipAll: '所有報名者',
    aeAnnRecipPaid: '已付款',
    aeAnnRecipUnpaid: '未付款',
    aeAnnRecipWaitlist: '候補',
    aeAnnSubjectPlaceholder: '例：場地調整通知',

    // ----- center: email canvas -----
    aeAnnBodyTitlePlaceholder: '信件標題（讀者第一眼看到）',
    aeAnnBodyPlaceholder: '開始寫信⋯\n\n可用純文字（換行會保留），或基本內聯 HTML（如 <b> <a> <table> 等）。\n系統會自動套上 RegMaster 模板（含 logo、頁尾），並於儲存／發送前檢查 Outlook 相容性。',

    aeAnnVars: '可用變數（寄送時自動帶入每位收件人）：{{競賽名稱}}　{{報名編號}}　{{組別}}　{{中文隊名}}　{{英文隊名}}',

    // ----- right column: recipients / stats / tip -----
    aeAnnRightRecipients: '預計收件人',
    aeAnnRecipCountLabel: '符合條件的 Email 數',
    aeAnnRightStats: '傳送統計',
    aeAnnStatsNone: '尚未發送',
    aeAnnHelpTip: '💡 Email 範本含 RegMaster 標題列、頁尾與 footer。<br><br>SMS / LINE 通道將於後續整合上線。',

    // ----- dynamic JS: HTML validation -----
    aeAnnHtmlScriptMsg: '含有 <script> 程式碼',
    aeAnnHtmlScriptFix: 'Email 不支援 JavaScript，請移除所有 <script>。',
    aeAnnHtmlStyleMsg: '含有 <style> 區塊',
    aeAnnHtmlStyleFix: 'Outlook 對 <style> 支援不完整，請改用「行內樣式」style="..." 寫在各標籤上。',
    aeAnnHtmlLinkMsg: '含有外部 <link> 樣式表',
    aeAnnHtmlLinkFix: 'Email 無法載入外部 CSS，請改用行內樣式。',
    aeAnnHtmlBadElMsg: '含有不支援的元素（iframe / video / form / svg 等）',
    aeAnnHtmlBadElFix: '請移除這些元素，Email 用戶端（尤其 Outlook）不會顯示。',
    aeAnnHtmlFlexMsg: '使用了 flex / grid 版面',
    aeAnnHtmlFlexFix: 'Outlook 不支援 flex/grid，請改用 <table> 排版。',
    aeAnnHtmlPosMsg: '使用了 position 定位',
    aeAnnHtmlPosFix: 'Outlook 會忽略 position，請改用 <table> 與內距（padding）排版。',
    aeAnnHtmlFloatMsg: '使用了 float',
    aeAnnHtmlFloatFix: '部分 Outlook 版本對 float 支援不佳，建議改用 <table>。',
    aeAnnHtmlBgMsg: '使用了背景圖 background-image',
    aeAnnHtmlBgFix: 'Outlook 對背景圖支援有限，建議改用實心背景色或 <img>。',
    aeAnnHtmlUnitMsg: '使用了 rem / vw 等相對單位',
    aeAnnHtmlUnitFix: 'Email 建議使用 px 固定單位或百分比 (%)。',
    aeAnnHtmlErrLead: '信件內容的 HTML 不符合 Email（含 Outlook）顯示規格，請修正後再儲存／發送：',
    aeAnnHtmlErrSuggest: '　建議：',
    aeAnnHtmlErrTitle: 'HTML 需要修正',
    aeAnnHtmlWarnLead: '提醒：',
    aeAnnHtmlWarnSuffix: '（仍可寄送，建議優化）',
    aeAnnHtmlWarnSep: '、',

    // ----- dynamic JS: send gate -----
    aeAnnGateBtnTitle: '公告群發為 Pro 以上方案功能',
    aeAnnGateMsg: '公告群發（EDM）為 Pro 以上方案功能。\n升級至 Pro 後，即可一次將公告 Email 寄送給符合條件的所有報名者（可依已付款 / 未付款 / 候補篩選）。\n\n請至「方案與授權」頁升級方案，或聯繫客服洽詢。',
    aeAnnGateTitle: '需要升級方案',
    aeAnnGateOk: '前往升級',

    // ----- dynamic JS: empty editor -----
    aeAnnEmptyTitlePlaceholder: '尚未選擇範本 — 請點左側「＋ 新增範本」',
    aeAnnEmptyStats: '請先建立或選擇範本',

    // ----- dynamic JS: list -----
    aeAnnListEmpty: '尚無範本',
    aeAnnStatusSent: '已發送',
    aeAnnStatusScheduled: '已排程',
    aeAnnStatusDraft: '草稿',
    aeAnnDelTitle: '刪除範本',
    aeAnnNoSubject: '(無標題)',
    aeAnnMetaRecipPre: ' · 收件 ',
    aeAnnDelConfirmPre: '確定刪除範本「',
    aeAnnDelConfirmSuf: '」？此操作無法復原。',
    aeAnnDelOk: '刪除',
    aeAnnDelFail: '刪除失敗',

    // ----- dynamic JS: selectCamp stats -----
    aeAnnStatsSentPre: '✓ 已發送於 <b>',
    aeAnnStatsSentMid: '</b><br>收件數：<b>',
    aeAnnStatsSentSuf: '</b>',

    // ----- dynamic JS: create draft -----
    aeAnnCreating: '建立中⋯',
    aeAnnCreateFail: '建立失敗',
    aeAnnNewDraftSubjectPre: '新公告 ',

    // ----- dynamic JS: recipient count -----
    aeAnnRecipCalc: '計算收件人中⋯',
    aeAnnRecipUnit: ' 封',
    aeAnnRecipNone: '此條件下沒有可寄送的 Email。',
    aeAnnEmailSep: '、',

    // ----- dynamic JS: save -----
    aeAnnSelectFirst: '請先選一個範本',
    aeAnnSaving: '儲存中⋯',
    aeAnnSaved: '✓ 已儲存',

    // ----- dynamic JS: send -----
    aeAnnSendConfirmPre: '立即發送給 ',
    aeAnnSendConfirmSuf: ' 位收件人？',
    aeAnnSendTitle: '發送公告',
    aeAnnSendOk: '立即發送',
    aeAnnSending: '發送中⋯',
    aeAnnSentOkPre: '✓ 已發送 ',
    aeAnnSentOkMid: ' 封 Email',
    aeAnnSentOkMulti: '（SMS/LINE 已記錄為排程，待後續整合）',
    aeAnnSendFailPre: '發送失敗：',
    aeAnnSaveFailPre: '儲存失敗：',
    aeAnnFailPre: '失敗：',

    // ----- dynamic JS: preview -----
    aeAnnPvDefaultSubject: '活動公告',
    aeAnnPvBandPre: '活動：',
    aeAnnPvFallbackSubject: '活動公告',
    aeAnnPvFooterCopyright: 'Copyright © RegMaster Pro',
    aeAnnPvFooterNote: '此為系統自動發送之信件，請勿直接回覆。',
    aeAnnPvHeaderTagline: '線上活動報名平台',
    aeAnnPvTitle: '📧 信件預覽（套用 RegMaster 範本）',
    aeAnnPvClose: '關閉'
  };

  var E = {
    // ----- document / breadcrumbs / header -----
    aeAnnDocTitle: 'Notices / EDM · Organizer Console · RegMaster',
    aeAnnSideSub: 'Organizer',
    aeAnnCrumbHome: 'Organizer Console',
    aeAnnCrumbEvents: 'Events',
    aeAnnCrumbHere: 'Notices / EDM',

    // ----- nav: this event -----
    aeAnnNavHub: 'Overview',
    aeAnnNavSettings: 'Settings',
    aeAnnNavAnn: 'Notices / EDM',
    aeAnnNavPayments: 'Payments',
    aeAnnNavScoring: 'Scoring',
    aeAnnNavCheckin: 'Check-in',
    aeAnnNavGrpOverview: 'Overview',
    aeAnnNavGrpThisEvent: 'This Event',
    aeAnnNavDashboard: 'Dashboard',
    aeAnnNavAllEvents: 'All Events',

    // ----- loading -----
    aeAnnLoading: 'Loading notices⋯',
    aeAnnErrNoId: 'No event ID specified',

    // ----- left column: steps hint + list -----
    aeAnnStepsTitle: '📋 How to use',
    aeAnnStep1: 'Click “＋ New Template” below to create a notice',
    aeAnnStep2: 'Edit the subject / content and choose recipients',
    aeAnnStep3: 'Click “🔍 Preview” to check the layout',
    aeAnnStep4: 'Click “Send Now” to email registrants',
    aeAnnAllTemplates: 'All Templates',
    aeAnnNewTemplate: '＋ New Template',

    // ----- center: editor header -----
    aeAnnTitlePlaceholder: 'Template title',
    aeAnnPreviewBtn: '🔍 Preview',
    aeAnnSaveBtn: 'Save Draft',
    aeAnnSendBtn: 'Send Now →',
    aeAnnScheduleBtn: 'Schedule',
    aeAnnScheduling: 'Scheduling…',
    aeAnnSchedNeedTime: 'Please choose a schedule time first',
    aeAnnSchedFuture: 'Schedule time must be in the future',
    aeAnnSchedOk: 'Scheduled — the system will send it automatically',
    aeAnnSchedFail: 'Scheduling failed',
    aeAnnStatsOpened: 'Opens ',
    aeAnnStatsClicked: 'Clicks ',
    aeAnnStatsScheduledPre: 'Scheduled for ',

    // ----- center: compose meta -----
    aeAnnLblChannel: 'Channel',
    aeAnnLblRecipients: 'Recipients',
    aeAnnLblSubject: 'Subject',
    aeAnnChSoon: 'Soon',
    aeAnnRecipAll: 'All registrants',
    aeAnnRecipPaid: 'Paid',
    aeAnnRecipUnpaid: 'Unpaid',
    aeAnnRecipWaitlist: 'Waitlist',
    aeAnnSubjectPlaceholder: 'e.g. Venue change notice',

    // ----- center: email canvas -----
    aeAnnBodyTitlePlaceholder: 'Email heading (the first thing readers see)',
    aeAnnBodyPlaceholder: 'Start writing⋯\n\nUse plain text (line breaks are preserved) or basic inline HTML (such as <b> <a> <table>).\nThe RegMaster template (logo, footer) is applied automatically, and Outlook compatibility is checked before saving / sending.',

    aeAnnVars: 'Variables (auto-filled per recipient when sent): {{競賽名稱}}　{{報名編號}}　{{組別}}　{{中文隊名}}　{{英文隊名}}',

    // ----- right column: recipients / stats / tip -----
    aeAnnRightRecipients: 'Estimated Recipients',
    aeAnnRecipCountLabel: 'Matching email count',
    aeAnnRightStats: 'Delivery Stats',
    aeAnnStatsNone: 'Not sent yet',
    aeAnnHelpTip: '💡 The email template includes the RegMaster header bar and footer.<br><br>SMS / LINE channels will be integrated in a future release.',

    // ----- dynamic JS: HTML validation -----
    aeAnnHtmlScriptMsg: 'Contains <script> code',
    aeAnnHtmlScriptFix: 'Email does not support JavaScript; please remove all <script> tags.',
    aeAnnHtmlStyleMsg: 'Contains a <style> block',
    aeAnnHtmlStyleFix: 'Outlook has incomplete <style> support; use inline styles (style="...") on each tag instead.',
    aeAnnHtmlLinkMsg: 'Contains an external <link> stylesheet',
    aeAnnHtmlLinkFix: 'Email cannot load external CSS; please use inline styles instead.',
    aeAnnHtmlBadElMsg: 'Contains unsupported elements (iframe / video / form / svg, etc.)',
    aeAnnHtmlBadElFix: 'Please remove these elements; email clients (especially Outlook) will not display them.',
    aeAnnHtmlFlexMsg: 'Uses a flex / grid layout',
    aeAnnHtmlFlexFix: 'Outlook does not support flex/grid; please use <table> layout instead.',
    aeAnnHtmlPosMsg: 'Uses position-based layout',
    aeAnnHtmlPosFix: 'Outlook ignores position; please use <table> and padding for layout.',
    aeAnnHtmlFloatMsg: 'Uses float',
    aeAnnHtmlFloatFix: 'Some Outlook versions handle float poorly; using <table> is recommended.',
    aeAnnHtmlBgMsg: 'Uses a background-image',
    aeAnnHtmlBgFix: 'Outlook has limited background-image support; use a solid background color or an <img> instead.',
    aeAnnHtmlUnitMsg: 'Uses relative units such as rem / vw',
    aeAnnHtmlUnitFix: 'For email, use fixed px units or percentages (%).',
    aeAnnHtmlErrLead: 'The email HTML does not meet email (including Outlook) display requirements. Please fix the following before saving / sending:',
    aeAnnHtmlErrSuggest: '　Suggestion: ',
    aeAnnHtmlErrTitle: 'HTML needs fixing',
    aeAnnHtmlWarnLead: 'Note: ',
    aeAnnHtmlWarnSuffix: ' (can still be sent, but optimization is recommended)',
    aeAnnHtmlWarnSep: ', ',

    // ----- dynamic JS: send gate -----
    aeAnnGateBtnTitle: 'Bulk notices require a Pro or higher plan',
    aeAnnGateMsg: 'Bulk notices (EDM) require a Pro or higher plan.\nAfter upgrading to Pro, you can email a notice to all matching registrants at once (filtered by paid / unpaid / waitlist).\n\nPlease upgrade on the “Plan & License” page, or contact support for details.',
    aeAnnGateTitle: 'Upgrade Required',
    aeAnnGateOk: 'Go to upgrade',

    // ----- dynamic JS: empty editor -----
    aeAnnEmptyTitlePlaceholder: 'No template selected — click “＋ New Template” on the left',
    aeAnnEmptyStats: 'Please create or select a template first',

    // ----- dynamic JS: list -----
    aeAnnListEmpty: 'No templates yet',
    aeAnnStatusSent: 'Sent',
    aeAnnStatusScheduled: 'Scheduled',
    aeAnnStatusDraft: 'Draft',
    aeAnnDelTitle: 'Delete template',
    aeAnnNoSubject: '(No subject)',
    aeAnnMetaRecipPre: ' · Sent ',
    aeAnnDelConfirmPre: 'Delete the template “',
    aeAnnDelConfirmSuf: '”? This action cannot be undone.',
    aeAnnDelOk: 'Delete',
    aeAnnDelFail: 'Delete failed',

    // ----- dynamic JS: selectCamp stats -----
    aeAnnStatsSentPre: '✓ Sent on <b>',
    aeAnnStatsSentMid: '</b><br>Recipients: <b>',
    aeAnnStatsSentSuf: '</b>',

    // ----- dynamic JS: create draft -----
    aeAnnCreating: 'Creating⋯',
    aeAnnCreateFail: 'Creation failed',
    aeAnnNewDraftSubjectPre: 'New notice ',

    // ----- dynamic JS: recipient count -----
    aeAnnRecipCalc: 'Calculating recipients⋯',
    aeAnnRecipUnit: ' emails',
    aeAnnRecipNone: 'No emails available to send under this filter.',
    aeAnnEmailSep: ', ',

    // ----- dynamic JS: save -----
    aeAnnSelectFirst: 'Please select a template first',
    aeAnnSaving: 'Saving⋯',
    aeAnnSaved: '✓ Saved',

    // ----- dynamic JS: send -----
    aeAnnSendConfirmPre: 'Send now to ',
    aeAnnSendConfirmSuf: ' recipients?',
    aeAnnSendTitle: 'Send Notice',
    aeAnnSendOk: 'Send Now',
    aeAnnSending: 'Sending⋯',
    aeAnnSentOkPre: '✓ Sent ',
    aeAnnSentOkMid: ' emails',
    aeAnnSentOkMulti: ' (SMS/LINE recorded as scheduled, pending future integration)',
    aeAnnSendFailPre: 'Send failed: ',
    aeAnnSaveFailPre: 'Save failed: ',
    aeAnnFailPre: 'Failed: ',

    // ----- dynamic JS: preview -----
    aeAnnPvDefaultSubject: 'Event Notice',
    aeAnnPvBandPre: 'Event: ',
    aeAnnPvFallbackSubject: 'Event Notice',
    aeAnnPvFooterCopyright: 'Copyright © RegMaster Pro',
    aeAnnPvFooterNote: 'This is an automated message; please do not reply directly.',
    aeAnnPvHeaderTagline: 'Online event registration platform',
    aeAnnPvTitle: '📧 Email Preview (RegMaster template applied)',
    aeAnnPvClose: 'Close'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
