// =============================================================================
// RegMaster · I18N page pack — Admin / All Events (admin/events/index.html)
// =============================================================================
// Page-scoped zh/en strings for the organiser all-events list + create flow.
// Loaded immediately after /shared/i18n.js. All new keys are prefixed `aeIdx`.
// =============================================================================

(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- document / header -----
    aeIdxDocTitle: '所有活動 · 主辦後台 · RegMaster',
    aeIdxCrumbHome: '主辦後台',
    aeIdxCrumbHere: '所有活動',
    aeIdxSearchPh: '搜尋活動名稱、類別⋯',
    aeIdxCreateBtn: '建立活動',

    // ----- page head -----
    aeIdxPageTitle: '所有活動',
    aeIdxSubline: '管理你舉辦過的所有活動 · 點選即可進入活動詳情',

    // ----- stat strip -----
    aeIdxStatAll: '全部',
    aeIdxStatLive: '進行中',
    aeIdxStatUpcoming: '即將開放',
    aeIdxStatDraft: '草稿',
    aeIdxStatEnded: '已結束',

    // ----- toolbar -----
    aeIdxFilterPh: '篩選名稱、類別、主辦方帳號⋯',

    // ----- content states -----
    aeIdxLoading: '載入活動清單⋯',

    // ----- create modal (static) -----
    aeIdxModalTitle: '建立新活動',
    aeIdxModalSub: '先填基本資料，建立完成後再進入詳細設定。',
    aeIdxLblName: '活動名稱 *',
    aeIdxNamePh: '例：2026 春季活動',
    aeIdxLblCategory: '類別',
    aeIdxCatSeminar: '研討會',
    aeIdxCatCompetition: '競賽',
    aeIdxCatWorkshop: '工作坊',
    aeIdxCatCamp: '夏令營',
    aeIdxCatForum: '學術論壇',
    aeIdxCatAlumni: '校友活動',
    aeIdxCatOther: '其他',
    aeIdxLblEventType: '活動形式',
    aeIdxTypeSingleNoCoach: '個人報名',
    aeIdxTypeSingleCoach: '個人報名（含指導者）',
    aeIdxTypeTeamNoCoach: '團體報名',
    aeIdxTypeTeamCoach: '團體報名（含指導者）',
    aeIdxCancel: '取消',
    aeIdxConfirmCreate: '建立 →',

    // ----- units / counts -----
    aeIdxUnitEvents: '場',
    aeIdxTotalCount: '共 {n} 場',

    // ----- dynamic subline -----
    aeIdxSublinePrefix: '管理你舉辦過的所有活動',
    aeIdxSublineLive: '進行中',
    aeIdxSublineDraft: '草稿',
    aeIdxSublineEnded: '歷史',

    // ----- new card -----
    aeIdxNewCardTitle: '建立新活動',
    aeIdxNewCardDesc: '從零開始，或使用模板快速上線',
    aeIdxNewCardFirstDesc: '看起來這是你的第一場活動',
    aeIdxNewCardStart: '開始 →',

    // ----- card status pills -----
    aeIdxStatusLive: 'LIVE · 報名中',
    aeIdxStatusUpcoming: '即將開放',
    aeIdxStatusEnded: '已結束',
    aeIdxStatusDraft: '草稿',

    // ----- card labels -----
    aeIdxCountdown: '⏰ 還有 {n} 天',
    aeIdxNoDeadline: '尚未設定截止日',
    aeIdxRegSuffix: '報名',
    aeIdxWlSuffix: '＋{n} 候補',
    aeIdxProgressLabel: '報名進度',
    aeIdxNoLimit: '無上限',

    // ----- quick actions -----
    aeIdxToggleOpen: '開放',
    aeIdxToggleClose: '關閉',
    aeIdxConfirmToggle: '{action}此活動報名？',
    aeIdxRegStatusTitle: '報名狀態',
    aeIdxDupPrompt: '請輸入新活動名稱',
    aeIdxDupSuffix: ' (複製)',
    aeIdxDupTitle: '複製活動',
    aeIdxDupDone: '已建立複本',
    aeIdxFailPrefix: '失敗：',

    // ----- create flow -----
    aeIdxNeedName: '請填寫活動名稱',
    aeIdxCreating: '建立中⋯',
    aeIdxCreateFail: '建立失敗',
    aeIdxNetworkErr: '網路錯誤',

    // ----- load error -----
    aeIdxLoadFail: '<b>無法載入活動：</b>'
  };

  var E = {
    // ----- document / header -----
    aeIdxDocTitle: 'All Events · Organizer Console · RegMaster',
    aeIdxCrumbHome: 'Organizer Console',
    aeIdxCrumbHere: 'All Events',
    aeIdxSearchPh: 'Search event name, category…',
    aeIdxCreateBtn: 'Create Event',

    // ----- page head -----
    aeIdxPageTitle: 'All Events',
    aeIdxSubline: 'Manage every event you\'ve run · click to open its details',

    // ----- stat strip -----
    aeIdxStatAll: 'All',
    aeIdxStatLive: 'Live',
    aeIdxStatUpcoming: 'Upcoming',
    aeIdxStatDraft: 'Draft',
    aeIdxStatEnded: 'Ended',

    // ----- toolbar -----
    aeIdxFilterPh: 'Filter by name, category, organizer account…',

    // ----- content states -----
    aeIdxLoading: 'Loading events…',

    // ----- create modal (static) -----
    aeIdxModalTitle: 'Create New Event',
    aeIdxModalSub: 'Fill in the basics first; you can configure the details after it\'s created.',
    aeIdxLblName: 'Event Name *',
    aeIdxNamePh: 'e.g. 2026 Spring Event',
    aeIdxLblCategory: 'Category',
    aeIdxCatSeminar: 'Seminar',
    aeIdxCatCompetition: 'Competition',
    aeIdxCatWorkshop: 'Workshop',
    aeIdxCatCamp: 'Summer Camp',
    aeIdxCatForum: 'Academic Forum',
    aeIdxCatAlumni: 'Alumni Event',
    aeIdxCatOther: 'Other',
    aeIdxLblEventType: 'Event Format',
    aeIdxTypeSingleNoCoach: 'Individual',
    aeIdxTypeSingleCoach: 'Individual (with instructor)',
    aeIdxTypeTeamNoCoach: 'Team',
    aeIdxTypeTeamCoach: 'Team (with instructor)',
    aeIdxCancel: 'Cancel',
    aeIdxConfirmCreate: 'Create →',

    // ----- units / counts -----
    aeIdxUnitEvents: '',
    aeIdxTotalCount: '{n} total',

    // ----- dynamic subline -----
    aeIdxSublinePrefix: 'Manage every event you\'ve run',
    aeIdxSublineLive: 'Live',
    aeIdxSublineDraft: 'Draft',
    aeIdxSublineEnded: 'History',

    // ----- new card -----
    aeIdxNewCardTitle: 'Create New Event',
    aeIdxNewCardDesc: 'Start from scratch, or use a template to launch fast',
    aeIdxNewCardFirstDesc: 'Looks like this is your first event',
    aeIdxNewCardStart: 'Start →',

    // ----- card status pills -----
    aeIdxStatusLive: 'LIVE · Open',
    aeIdxStatusUpcoming: 'Upcoming',
    aeIdxStatusEnded: 'Ended',
    aeIdxStatusDraft: 'Draft',

    // ----- card labels -----
    aeIdxCountdown: '⏰ {n} days left',
    aeIdxNoDeadline: 'No deadline set',
    aeIdxRegSuffix: 'registered',
    aeIdxWlSuffix: '+{n} waitlist',
    aeIdxProgressLabel: 'Registrations',
    aeIdxNoLimit: 'No limit',

    // ----- quick actions -----
    aeIdxToggleOpen: 'Open',
    aeIdxToggleClose: 'Close',
    aeIdxConfirmToggle: '{action} registration for this event?',
    aeIdxRegStatusTitle: 'Registration Status',
    aeIdxDupPrompt: 'Enter a name for the new event',
    aeIdxDupSuffix: ' (Copy)',
    aeIdxDupTitle: 'Duplicate Event',
    aeIdxDupDone: 'Copy created',
    aeIdxFailPrefix: 'Failed: ',

    // ----- create flow -----
    aeIdxNeedName: 'Please enter an event name',
    aeIdxCreating: 'Creating…',
    aeIdxCreateFail: 'Creation failed',
    aeIdxNetworkErr: 'Network error',

    // ----- load error -----
    aeIdxLoadFail: '<b>Unable to load events:</b> '
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
