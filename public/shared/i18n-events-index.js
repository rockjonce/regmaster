(function(){ if(!window.I18N) return;
  var Z={
    // ----- nav (page-specific; navTrial差異) -----
    evNavTrial: '免費試用',
    // ----- hero -----
    evHeroEyebrow: 'DISCOVER · 探索活動',
    evHeroTitle: '找一場<em>值得參加</em>的活動。',
    evHeroLoading: '載入活動中⋯⋯',
    // ----- search bar -----
    evSearchPlaceholder: '🔍 試試「黑客松」「研討會」「工作坊」⋯⋯',
    evCatAllOption: '📂 所有類別',
    evSearchBtn: '搜尋',
    evChipAll: '🌟 全部',
    // ----- sort row -----
    evSortPopular: '🔥 熱門',
    evSortRecent: '⏰ 最近開賣',
    evSortUpcoming: '📅 即將舉辦',
    // ----- filters -----
    evFilterStatus: '狀態',
    evFilterCategory: '類別',
    evFilterScale: '規模',
    evStatusOpen: '報名中',
    evStatusUpcoming: '即將開放',
    evStatusClosed: '已截止',
    evScaleSmall: '50 人以下',
    evScaleMid: '50–500 人',
    evScaleLarge: '500+ 人',
    // ----- list state -----
    evLoadingList: '正在從伺服器載入活動清單⋯⋯',
    // ----- dynamic card / meta strings -----
    evPillOpen: '🎟 報名中',
    evPillUpcoming: '⏰ 即將開放',
    evPillClosed: '已截止',
    evRegistered: '已報名',
    evDeadlinePrefix: '截止：',
    evViewDetail: '查看詳情 →',
    evUntitled: '(未命名活動)',
    evEmptyTitle: '找不到符合的活動',
    evEmptyDesc: '試試清除篩選條件，或瀏覽其他類別。',
    evLoadFailTitle: '載入失敗',
    evLoadFailDesc: '請稍後再試',
    // ----- assembled meta strings (number injected in JS) -----
    evResultsInit: '為您找到 <strong>—</strong> 場活動',
    evResultsPrefix: '為您找到 ',
    evResultsSuffix: ' 場活動',
    evHeroSubPrefix: 'RegMaster 上有 ',
    evHeroSubMid: ' 場進行中的活動，總計 ',
    evHeroSubMidOne: ' 場進行中的活動，總計 ',
    evHeroSubSuffix: ' 場。'
  };
  var E={
    evNavTrial: 'Free trial',
    evHeroEyebrow: 'DISCOVER · Explore events',
    evHeroTitle: 'Find an event <em>worth attending</em>.',
    evHeroLoading: 'Loading events…',
    evSearchPlaceholder: '🔍 Try “hackathon”, “seminar”, “workshop”…',
    evCatAllOption: '📂 All categories',
    evSearchBtn: 'Search',
    evChipAll: '🌟 All',
    evSortPopular: '🔥 Popular',
    evSortRecent: '⏰ Recently opened',
    evSortUpcoming: '📅 Upcoming',
    evFilterStatus: 'Status',
    evFilterCategory: 'Category',
    evFilterScale: 'Scale',
    evStatusOpen: 'Open',
    evStatusUpcoming: 'Opening soon',
    evStatusClosed: 'Closed',
    evScaleSmall: 'Under 50',
    evScaleMid: '50–500',
    evScaleLarge: '500+',
    evLoadingList: 'Loading events from the server…',
    evPillOpen: '🎟 Open',
    evPillUpcoming: '⏰ Opening soon',
    evPillClosed: 'Closed',
    evRegistered: 'Registered',
    evDeadlinePrefix: 'Deadline: ',
    evViewDetail: 'View details →',
    evUntitled: '(Untitled event)',
    evEmptyTitle: 'No matching events',
    evEmptyDesc: 'Try clearing your filters or browsing other categories.',
    evLoadFailTitle: 'Failed to load',
    evLoadFailDesc: 'Please try again later',
    evResultsInit: 'Found <strong>—</strong> events for you',
    evResultsPrefix: 'Found ',
    evResultsSuffix: ' events for you',
    evHeroSubPrefix: 'RegMaster has ',
    evHeroSubMid: ' events open for registration, ',
    evHeroSubMidOne: ' event open for registration, ',
    evHeroSubSuffix: ' in total.'
  };
  Object.keys(Z).forEach(function(k){window.I18N.zh[k]=Z[k];});
  Object.keys(E).forEach(function(k){window.I18N.en[k]=E[k];});
})();
