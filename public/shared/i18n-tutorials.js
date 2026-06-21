// =============================================================================
// RegMaster · i18n pack — Learning Center / Video Tutorials (/tutorials/)
// Page-chrome strings only. Per-video & per-category bilingual data lives in
// tutorials/index.html and renders via AppState.getLang().
// =============================================================================
(function () {
  if (!window.I18N) return;

  var Z = {
    dtTutorials: '教學中心 · RegMaster',
    // hero
    tuHeroEyebrow: 'LEARNING CENTER · 教學中心',
    tuHeroTitle: '從零到<em>辦好第一場活動</em>',
    tuHeroLead: '影片教學、step-by-step 指南、最佳實踐 —— 25 部完整教學，把你需要知道的都整理在這裡。',
    tuSearchPh: '搜尋教學：怎麼設定金流、如何匯出名單…',
    tuSearchGo: '搜尋',
    tuTagsLabel: '熱門：',
    // section heads
    tuSecTopics: '瀏覽主題',
    tuSecFeatured: '精選教學',
    tuSecMore: '查看全部',
    tuSecPath: '新手學習路徑',
    tuSecPathLead: '跟著這 5 個步驟，第一次用 RegMaster 也能辦出專業活動。',
    tuSecAll: '全部教學影片',
    tuSecAllReg: '報名者專區',
    // featured
    tuFeatTag: '★ 最推薦 · 從這裡開始',
    tuFeatLead: '第一次使用？這支帶你快速看懂主辦後台，30 秒就能上手。',
    // labels
    tuLvlBeginner: '初級',
    tuLvlInter: '中級',
    tuLvlAdv: '進階',
    tuRoleHost: '主辦方',
    tuRoleReg: '報名者',
    tuVideoUnit: '部教學',
    tuWatchedTag: '已看',
    tuFilterClear: '清除篩選',
    tuNoResults: '找不到符合的教學，換個關鍵字試試。',
    tuFilteredBy: '主題：',
    // player modal
    tuPrev: '上一部',
    tuNext: '下一部',
    tuWatch: '立即播放',
    tuBackToList: '關閉',
    tuDownload: '下載本部影片',
    tuComingSoon: '英文版教學影片即將推出',
    tuComingSoonSub: '切換到「中文」即可立即觀看本部影片',
    tuEnBanner: '英文版影片陸續上架中；目前可切換中文觀看。',
    tuUpNext: '下一部',
    // CTA
    tuCtaTitle: '找不到你要的答案？',
    tuCtaLead: '看完整本操作手冊，或直接聯絡我們的客服團隊，平日 4 小時內回覆。',
    tuCtaManual: '開啟操作手冊',
    tuCtaContact: '聯絡客服'
  };

  var E = {
    dtTutorials: 'Learning Center · RegMaster',
    tuHeroEyebrow: 'LEARNING CENTER',
    tuHeroTitle: 'From zero to <em>your first great event</em>',
    tuHeroLead: 'Video tutorials, step-by-step guides and best practices — 25 complete lessons, everything you need in one place.',
    tuSearchPh: 'Search tutorials: set up payments, export the roster…',
    tuSearchGo: 'Search',
    tuTagsLabel: 'Popular:',
    tuSecTopics: 'Browse by topic',
    tuSecFeatured: 'Featured',
    tuSecMore: 'View all',
    tuSecPath: 'Getting-started path',
    tuSecPathLead: 'Follow these 5 steps to run a professional event on your first try.',
    tuSecAll: 'All tutorials',
    tuSecAllReg: 'For registrants',
    tuFeatTag: '★ Recommended · Start here',
    tuFeatLead: 'New here? This one gives you a quick tour of the organiser console — up to speed in 30 seconds.',
    tuLvlBeginner: 'Beginner',
    tuLvlInter: 'Intermediate',
    tuLvlAdv: 'Advanced',
    tuRoleHost: 'Organiser',
    tuRoleReg: 'Registrant',
    tuVideoUnit: 'videos',
    tuWatchedTag: 'Watched',
    tuFilterClear: 'Clear filter',
    tuNoResults: 'No matching tutorials — try another keyword.',
    tuFilteredBy: 'Topic:',
    tuPrev: 'Previous',
    tuNext: 'Next',
    tuWatch: 'Play now',
    tuBackToList: 'Close',
    tuDownload: 'Download this video',
    tuComingSoon: 'English tutorial coming soon',
    tuComingSoonSub: 'Switch to 中文 to watch this video now',
    tuEnBanner: 'English videos are being added; switch to 中文 to watch now.',
    tuUpNext: 'UP NEXT',
    tuCtaTitle: "Can't find what you need?",
    tuCtaLead: 'Read the full manual, or contact our support team — we reply within 4 hours on weekdays.',
    tuCtaManual: 'Open the manual',
    tuCtaContact: 'Contact support'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
