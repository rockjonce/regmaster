// =============================================================================
// RegMaster · I18N · Admin Events Hub (single-event overview hub)
// Page-scoped dictionary for /admin/events/hub.html. Keys prefixed `aeHub`.
// Loaded immediately after /shared/i18n.js.
// =============================================================================
(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- document / breadcrumbs / header -----
    aeHubDocTitle: '活動詳情 · 主辦後台 · RegMaster',
    aeHubCrumbHome: '主辦後台',
    aeHubCrumbEvents: '所有活動',
    aeHubCrumbLoading: '載入中⋯',
    aeHubPublicBtnTitle: '活動公開頁',

    // ----- loading / error states -----
    aeHubLoading: '載入活動資料⋯',
    aeHubErrTitle: '無法載入活動',
    aeHubBackToEvents: '回到所有活動',
    aeHubErrNoId: '網址未指定活動編號。',
    aeHubErrNotFound: '找不到活動',

    // ----- KPI labels + sublabels -----
    aeHubKpiTotal: '總報名',
    aeHubKpiTotalNone: '尚無報名',
    aeHubKpiAccepted: '正取',
    aeHubKpiAcceptedSub: '含已確認與待付款',
    aeHubKpiWaitlist: '備取',
    aeHubKpiWaitlistSub: '等候名額釋出',
    aeHubKpiPayWait: '待付款',
    aeHubKpiPayWaitSub: '需主辦方追蹤',
    aeHubKpiCheckin: '已報到',
    aeHubKpiCheckinSub: '活動當天統計',

    // ----- section: event info -----
    aeHubSecInfo: '活動資訊',
    aeHubEditSettings: '編輯設定',
    aeHubSecRecent: '最近報名',
    aeHubViewAll: '查看全部 →',
    aeHubRecentEmpty: '尚無報名資料。',

    // ----- side: tools -----
    aeHubSecTools: '活動工具',
    aeHubToolSettings: '活動設定',
    aeHubToolSettingsP: '名稱、欄位、收費',
    aeHubToolPay: '報名與付款',
    aeHubToolPayP: '確認 / 退費 / 匯出',
    aeHubToolAnn: '發布通知',
    aeHubToolAnnP: '群發 Email / 訊息',
    aeHubToolCheckin: 'QR 報到',
    aeHubToolCheckinP: '活動當天掃碼',

    // ----- side: status -----
    aeHubSecStatus: '活動狀態',
    aeHubCloseReg: '⏸ 關閉報名',
    aeHubOpenReg: '▶ 開放報名',
    aeHubPublicPage: '公開頁 ↗',
    aeHubCopyLink: '複製公開連結',
    aeHubCopied: '✓ 已複製',

    // ----- tab stubs -----
    aeHubStubSettingsH: '活動設定（v3）',
    aeHubStubSettingsP: '6 個分頁：基本 / 組別場次 / 報名表單 / 收費 / 通知 / 進階。<br>表單欄位請於專屬「表單設計器」拖放編輯，享受 v3 體驗。',
    aeHubStubSettingsBtn: '開啟 v3 設定頁 →',
    aeHubFormBuilder: '表單設計器',
    aeHubStubRegH: '報名與付款管理',
    aeHubStubRegP: '查看所有報名清單、確認 / 退費付款、快速銀行對帳，以及匯出名單。',
    aeHubStubRegBtn: '開啟付款管理 →',
    aeHubStubAnnH: '通知管理',
    aeHubStubAnnP: '新增 / 編輯 / 刪除活動公告，並可同步寄 Email 給已報名者。（SMS / LINE 通道將於後續版本提供）',
    aeHubStubAnnBtn: '開啟通知管理 →',
    aeHubStubScoreH: '評分系統',
    aeHubStubScoreP: '多評審、權重、即時排行榜（ACM 風格）、評分匯出。',
    aeHubStubScoreBtn: '開啟評分頁 →',
    aeHubStubCheckinH: 'QR Code 報到',
    aeHubStubCheckinP: '全螢幕 QR 掃描器 + 即時報到統計 + 物資配發。',
    aeHubStubCheckinBtn: '開啟報到頁 →',

    // ----- dynamic JS strings -----
    aeHubUnnamed: '(未命名活動)',
    aeHubPillLive: 'LIVE · 報名中',
    aeHubPillClosed: '已關閉',
    aeHubMetaEventDate: '活動日',
    aeHubMetaDeadline: '截止',
    aeHubMetaDaysLeftPre: '（還有 ',
    aeHubMetaDaysLeftSuf: ' 天）',
    aeHubMetaRegPre: '已報名 ',
    aeHubMetaRegSuf: ' 人',
    aeHubHeroPublic: '公開頁',
    aeHubHeroShare: '分享連結',
    aeHubShareCopied: '✓ 已複製連結',
    aeHubSharePromptMsg: '請複製以下連結：',
    aeHubSharePromptTitle: '分享活動連結',
    aeHubCapLimitPre: '上限 ',
    aeHubCapUsedPre: ' · 已用 ',
    aeHubCapUsedSuf: '%',
    aeHubCapUnlimited: '無人數上限',
    // info table keys
    aeHubInfoId: '活動編號',
    aeHubInfoCategory: '類別',
    aeHubInfoEventType: '參賽形式',
    aeHubInfoEventDate: '活動日期',
    aeHubInfoOpenDate: '開放日期',
    aeHubInfoDeadline: '截止日期',
    aeHubInfoFee: '報名費',
    aeHubInfoFeeFree: '免費',
    aeHubInfoGroups: '組別',
    aeHubInfoSessions: '場次',
    aeHubInfoSessionsUnit: ' 個場次',
    aeHubInfoRegStatus: '報名狀態',
    aeHubInfoOpenNow: '✓ 開放中',
    aeHubInfoClosedNow: '⏸ 已關閉',
    aeHubEvtTypeSingleNoCoach: '個人賽（無指導老師）',
    aeHubEvtTypeSingleCoach: '個人賽（含指導老師）',
    aeHubEvtTypeTeamNoCoach: '團體賽（無指導老師）',
    aeHubEvtTypeTeamCoach: '團體賽（含指導老師）',
    // recent regs
    aeHubNoTeamName: '(無隊名)',
    // status sidebar (inline <b>)
    aeHubStatusOpen: '✓ 報名<b>開放中</b>',
    aeHubStatusClosed: '⏸ 報名<b>已關閉</b>',
    aeHubStatusDaysPre: '還有 <b>',
    aeHubStatusDaysSuf: ' 天</b>截止',
    aeHubStatusOverdue: '已超過截止日',
    aeHubStatusCapPre: '已用名額 <b>',
    aeHubStatusCapSuf: '%</b>',
    // toggle confirm
    aeHubToggleClose: '關閉',
    aeHubToggleOpen: '開放',
    aeHubToggleConfirmSuf: '此活動報名？',
    aeHubToggleTitle: '報名狀態',
    aeHubFailPre: '失敗：'
  };

  var E = {
    // ----- document / breadcrumbs / header -----
    aeHubDocTitle: 'Event Details · Organizer Console · RegMaster',
    aeHubCrumbHome: 'Organizer Console',
    aeHubCrumbEvents: 'All Events',
    aeHubCrumbLoading: 'Loading⋯',
    aeHubPublicBtnTitle: 'Public event page',

    // ----- loading / error states -----
    aeHubLoading: 'Loading event data⋯',
    aeHubErrTitle: 'Unable to load event',
    aeHubBackToEvents: 'Back to all events',
    aeHubErrNoId: 'No event ID specified in the URL.',
    aeHubErrNotFound: 'Event not found',

    // ----- KPI labels + sublabels -----
    aeHubKpiTotal: 'Total Registrations',
    aeHubKpiTotalNone: 'No registrations yet',
    aeHubKpiAccepted: 'Accepted',
    aeHubKpiAcceptedSub: 'Includes confirmed & pending payment',
    aeHubKpiWaitlist: 'Waitlist',
    aeHubKpiWaitlistSub: 'Waiting for a spot to open',
    aeHubKpiPayWait: 'Pending Payment',
    aeHubKpiPayWaitSub: 'Needs organizer follow-up',
    aeHubKpiCheckin: 'Checked In',
    aeHubKpiCheckinSub: 'Event-day count',

    // ----- section: event info -----
    aeHubSecInfo: 'Event Info',
    aeHubEditSettings: 'Edit settings',
    aeHubSecRecent: 'Recent Registrations',
    aeHubViewAll: 'View all →',
    aeHubRecentEmpty: 'No registration data yet.',

    // ----- side: tools -----
    aeHubSecTools: 'Event Tools',
    aeHubToolSettings: 'Event Settings',
    aeHubToolSettingsP: 'Name, fields, fees',
    aeHubToolPay: 'Registration & Payment',
    aeHubToolPayP: 'Confirm / refund / export',
    aeHubToolAnn: 'Post Notice',
    aeHubToolAnnP: 'Bulk email / message',
    aeHubToolCheckin: 'QR Check-in',
    aeHubToolCheckinP: 'Scan on event day',

    // ----- side: status -----
    aeHubSecStatus: 'Event Status',
    aeHubCloseReg: '⏸ Close registration',
    aeHubOpenReg: '▶ Open registration',
    aeHubPublicPage: 'Public page ↗',
    aeHubCopyLink: 'Copy public link',
    aeHubCopied: '✓ Copied',

    // ----- tab stubs -----
    aeHubStubSettingsH: 'Event Settings (v3)',
    aeHubStubSettingsP: '6 tabs: Basics / Groups & Sessions / Form / Fees / Notices / Advanced.<br>Edit form fields with the dedicated drag-and-drop Form Builder for the full v3 experience.',
    aeHubStubSettingsBtn: 'Open v3 settings →',
    aeHubFormBuilder: 'Form Builder',
    aeHubStubRegH: 'Registration & Payment Management',
    aeHubStubRegP: 'View the full registration list, confirm / refund payments, reconcile bank transfers, and export rosters.',
    aeHubStubRegBtn: 'Open payment management →',
    aeHubStubAnnH: 'Notice Management',
    aeHubStubAnnP: 'Add / edit / delete event notices, with the option to email registrants at the same time. (SMS / LINE channels coming in a future release.)',
    aeHubStubAnnBtn: 'Open notice management →',
    aeHubStubScoreH: 'Scoring System',
    aeHubStubScoreP: 'Multi-judge, weighting, live leaderboard (ACM style), and score export.',
    aeHubStubScoreBtn: 'Open scoring page →',
    aeHubStubCheckinH: 'QR Code Check-in',
    aeHubStubCheckinP: 'Full-screen QR scanner + live check-in stats + supply distribution.',
    aeHubStubCheckinBtn: 'Open check-in page →',

    // ----- dynamic JS strings -----
    aeHubUnnamed: '(Untitled event)',
    aeHubPillLive: 'LIVE · Open',
    aeHubPillClosed: 'Closed',
    aeHubMetaEventDate: 'Event day',
    aeHubMetaDeadline: 'Deadline',
    aeHubMetaDaysLeftPre: ' (',
    aeHubMetaDaysLeftSuf: ' days left)',
    aeHubMetaRegPre: 'Registered ',
    aeHubMetaRegSuf: '',
    aeHubHeroPublic: 'Public page',
    aeHubHeroShare: 'Share link',
    aeHubShareCopied: '✓ Link copied',
    aeHubSharePromptMsg: 'Copy the link below:',
    aeHubSharePromptTitle: 'Share event link',
    aeHubCapLimitPre: 'Cap ',
    aeHubCapUsedPre: ' · used ',
    aeHubCapUsedSuf: '%',
    aeHubCapUnlimited: 'No capacity limit',
    // info table keys
    aeHubInfoId: 'Event ID',
    aeHubInfoCategory: 'Category',
    aeHubInfoEventType: 'Format',
    aeHubInfoEventDate: 'Event Date',
    aeHubInfoOpenDate: 'Open Date',
    aeHubInfoDeadline: 'Deadline',
    aeHubInfoFee: 'Registration Fee',
    aeHubInfoFeeFree: 'Free',
    aeHubInfoGroups: 'Groups',
    aeHubInfoSessions: 'Sessions',
    aeHubInfoSessionsUnit: ' sessions',
    aeHubInfoRegStatus: 'Registration Status',
    aeHubInfoOpenNow: '✓ Open',
    aeHubInfoClosedNow: '⏸ Closed',
    aeHubEvtTypeSingleNoCoach: 'Individual (no instructor)',
    aeHubEvtTypeSingleCoach: 'Individual (with instructor)',
    aeHubEvtTypeTeamNoCoach: 'Team (no instructor)',
    aeHubEvtTypeTeamCoach: 'Team (with instructor)',
    // recent regs
    aeHubNoTeamName: '(No team name)',
    // status sidebar (inline <b>)
    aeHubStatusOpen: '✓ Registration <b>open</b>',
    aeHubStatusClosed: '⏸ Registration <b>closed</b>',
    aeHubStatusDaysPre: '<b>',
    aeHubStatusDaysSuf: ' days</b> until deadline',
    aeHubStatusOverdue: 'Past the deadline',
    aeHubStatusCapPre: 'Capacity used <b>',
    aeHubStatusCapSuf: '%</b>',
    // toggle confirm
    aeHubToggleClose: 'Close',
    aeHubToggleOpen: 'Open',
    aeHubToggleConfirmSuf: ' registration for this event?',
    aeHubToggleTitle: 'Registration Status',
    aeHubFailPre: 'Failed: '
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
