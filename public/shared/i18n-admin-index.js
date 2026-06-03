// =============================================================================
// RegMaster · I18N add-on for /admin/index.html (organiser dashboard)
// =============================================================================
// Adds adIdx* keys to the shared window.I18N dictionary. Loaded AFTER
// /shared/i18n.js. zh = exact current page text; en = fluent UI English.
// =============================================================================
(function () {
  if (!window.I18N) return;

  var Z = {
    // Page title / breadcrumb / header
    adIdxDocTitle: '儀表板 · 主辦後台 · RegMaster',
    adIdxCrumbRoot: '主辦後台',
    adIdxCrumbHere: '儀表板',
    adIdxSearchPh: '搜尋活動 / 報名者...',
    adIdxCreateEvent: '建立活動',

    // Greeting (dynamic, by time of day)
    adIdxGreetDawn: '凌晨好',
    adIdxGreetMorning: '早安',
    adIdxGreetAfternoon: '午安',
    adIdxGreetEvening: '晚安',
    adIdxGreetSep: '，',

    // Loading / error
    adIdxLoading: '載入儀表板資料⋯',
    adIdxLoadCompsFail: '<b>無法載入活動清單：</b> ',

    // KPI cards
    adIdxKpiTotalReg: '總報名',
    adIdxUnitPeople: '人',
    adIdxKpiTotalRegSub: '跨所有活動累計',
    adIdxKpiPaid: '已付款',
    adIdxKpiPaidSub: '完成繳費的隊伍數',
    adIdxKpiPending: '待處理',
    adIdxKpiPendingSub: '含待付款、待審核、即將截止',
    adIdxKpiEvents: '活動數',
    adIdxUnitEvents: '場',
    adIdxKpiEventsSub: '進行中 + 已截止 + 草稿',

    // Welcome blurb (dynamic)
    adIdxBlurbAllClosed: '所有活動報名已截止或進行中',
    adIdxBlurbNone: '尚未建立任何活動，點右上「建立活動」開始吧',
    adIdxLiveBadgeSuffix: ' 場活動進行中',
    adIdxBlurbDeadlinePre: '你的 ',
    adIdxBlurbDeadlineMid: '還有 ',
    adIdxBlurbDeadlineDays: ' 天',
    adIdxBlurbDeadlineSuffix: '截止報名',
    adIdxQuoteOpen: '「',
    adIdxQuoteClose: '」',

    // Trend chart
    adIdxTrendTitle: '報名趨勢',
    adIdxRange7: '7 天',
    adIdxRange30: '30 天',
    adIdxRange90: '90 天',
    adIdxLegNear: '近 ',
    adIdxLegDaysSuffix: ' 天',
    adIdxTrendNoData: '此期間尚無報名資料',
    adIdxTrendSubPre: '最近 ',
    adIdxTrendSubSuffix: ' 天 · 跨所有活動',
    adIdxUnitRecords: ' 筆',
    adIdxTrendCompare: ' 後半段 vs 前半段',
    adIdxTrendRecentSuffix: '於近期',

    // AI insights
    adIdxAiTitle: 'AI 洞察',
    adIdxAiAnalyzing: 'AI 洞察分析中⋯',
    adIdxAiNewSuffix: ' NEW',
    adIdxInsightUrgent: '緊急',
    adIdxInsightSuccess: '機會',
    adIdxInsightTip: '建議',
    adIdxInsightAgoNow: '剛剛',
    adIdxAiLocked: '🔒 AI 洞察為 <b>PRO</b> 以上方案功能<br><a href="/admin/license.html" style="color:#fcd34d; text-decoration:underline">升級方案解鎖 →</a>',
    adIdxAiEmpty: '目前沒有需要注意的洞察 👍<br>當報名出現異常（即將額滿 / 報名偏低 / 待付款累積）時，這裡會自動提醒。',

    // Active events
    adIdxEventsTitle: '進行中的活動',
    adIdxViewAll: '查看全部 →',
    adIdxEventsLoading: '載入活動清單⋯',
    adIdxNoActiveTitle: '沒有進行中的活動',
    adIdxNoActiveSub: '建立活動並開放報名後即可在這裡看到。',
    adIdxClosedTag: '已截止',
    adIdxRowDeadline: '截止',
    adIdxRowDaysLeftPre: '還有',

    // Todos
    adIdxTodoTitle: '待辦事項',
    adIdxUnitItems: ' 項',
    adIdxTodoLoading: '分析待辦⋯',
    adIdxNoTodoTitle: '沒有待辦事項',
    adIdxNoTodoSub: '所有事情都處理完了，好棒！',
    adIdxTodoView: '查看 →',
    adIdxPriHigh: '高',
    adIdxPriMed: '中',
    adIdxPriLow: '低',

    // Quick actions
    adIdxQaTitle: '快速操作',
    adIdxQaCreate: '建立活動',
    adIdxQaCreateSub: '從零或模板',
    adIdxQaAllEvents: '所有活動',
    adIdxQaAllEventsSub: '列表 / 編輯',
    adIdxQaLicense: '方案與授權',
    adIdxQaLicenseSub: '試用 / 升級',
    adIdxQaAccount: '帳戶設定',
    adIdxQaAccountSub: '個人 / 安全',
    adIdxQaSupport: '聯絡客服',
    adIdxQaSupportSub: '4 hr 回覆',
    adIdxQaManual: '說明文件',
    adIdxQaManualSub: '使用手冊'
  };

  var E = {
    adIdxDocTitle: 'Dashboard · Organiser Console · RegMaster',
    adIdxCrumbRoot: 'Organiser Console',
    adIdxCrumbHere: 'Dashboard',
    adIdxSearchPh: 'Search events / registrants...',
    adIdxCreateEvent: 'Create Event',

    adIdxGreetDawn: 'Good early morning',
    adIdxGreetMorning: 'Good morning',
    adIdxGreetAfternoon: 'Good afternoon',
    adIdxGreetEvening: 'Good evening',
    adIdxGreetSep: ', ',

    adIdxLoading: 'Loading dashboard data…',
    adIdxLoadCompsFail: '<b>Could not load event list:</b> ',

    adIdxKpiTotalReg: 'Total Registrations',
    adIdxUnitPeople: '',
    adIdxKpiTotalRegSub: 'Across all events',
    adIdxKpiPaid: 'Paid',
    adIdxKpiPaidSub: 'Teams that completed payment',
    adIdxKpiPending: 'Pending',
    adIdxKpiPendingSub: 'Awaiting payment, review or closing soon',
    adIdxKpiEvents: 'Events',
    adIdxUnitEvents: '',
    adIdxKpiEventsSub: 'Open + closed + draft',

    adIdxBlurbAllClosed: 'All events are closed or in progress',
    adIdxBlurbNone: 'No events yet — tap “Create Event” at the top right to start',
    adIdxLiveBadgeSuffix: ' events live',
    adIdxBlurbDeadlinePre: 'Your ',
    adIdxBlurbDeadlineMid: ' closes registration in ',
    adIdxBlurbDeadlineDays: ' days',
    adIdxBlurbDeadlineSuffix: '',
    adIdxQuoteOpen: '“',
    adIdxQuoteClose: '”',

    adIdxTrendTitle: 'Registration Trend',
    adIdxRange7: '7 days',
    adIdxRange30: '30 days',
    adIdxRange90: '90 days',
    adIdxLegNear: 'Last ',
    adIdxLegDaysSuffix: ' days',
    adIdxTrendNoData: 'No registration data for this period',
    adIdxTrendSubPre: 'Last ',
    adIdxTrendSubSuffix: ' days · across all events',
    adIdxUnitRecords: '',
    adIdxTrendCompare: ' second half vs first half',
    adIdxTrendRecentSuffix: ' recently',

    adIdxAiTitle: 'AI Insights',
    adIdxAiAnalyzing: 'Analysing AI insights…',
    adIdxAiNewSuffix: ' NEW',
    adIdxInsightUrgent: 'Urgent',
    adIdxInsightSuccess: 'Opportunity',
    adIdxInsightTip: 'Tip',
    adIdxInsightAgoNow: 'Just now',
    adIdxAiLocked: '🔒 AI Insights is a <b>PRO</b> (or higher) plan feature<br><a href="/admin/license.html" style="color:#fcd34d; text-decoration:underline">Upgrade to unlock →</a>',
    adIdxAiEmpty: 'No insights need your attention right now 👍<br>When registrations look unusual (filling up, running low, or payments piling up) you’ll be alerted here automatically.',

    adIdxEventsTitle: 'Active Events',
    adIdxViewAll: 'View all →',
    adIdxEventsLoading: 'Loading event list…',
    adIdxNoActiveTitle: 'No active events',
    adIdxNoActiveSub: 'Create an event and open registration to see it here.',
    adIdxClosedTag: 'Closed',
    adIdxRowDeadline: 'Closes',
    adIdxRowDaysLeftPre: 'in',

    adIdxTodoTitle: 'To-do',
    adIdxUnitItems: '',
    adIdxTodoLoading: 'Analysing to-dos…',
    adIdxNoTodoTitle: 'No to-dos',
    adIdxNoTodoSub: 'Everything is handled — nice work!',
    adIdxTodoView: 'View →',
    adIdxPriHigh: 'High',
    adIdxPriMed: 'Med',
    adIdxPriLow: 'Low',

    adIdxQaTitle: 'Quick Actions',
    adIdxQaCreate: 'Create Event',
    adIdxQaCreateSub: 'From scratch or template',
    adIdxQaAllEvents: 'All Events',
    adIdxQaAllEventsSub: 'List / edit',
    adIdxQaLicense: 'Plan & License',
    adIdxQaLicenseSub: 'Trial / upgrade',
    adIdxQaAccount: 'Account Settings',
    adIdxQaAccountSub: 'Profile / security',
    adIdxQaSupport: 'Contact Support',
    adIdxQaSupportSub: '4 hr response',
    adIdxQaManual: 'Documentation',
    adIdxQaManualSub: 'User manual'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
