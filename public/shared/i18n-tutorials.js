// =============================================================================
// RegMaster · i18n pack — Video Tutorials page (/tutorials/)
// Page-chrome strings only. Per-episode titles/descriptions live as bilingual
// data inside tutorials/index.html and render via AppState.getLang().
// =============================================================================
(function () {
  if (!window.I18N) return;

  var Z = {
    dtTutorials: '教學影片 · RegMaster',
    tuHeroEyebrow: 'VIDEO TUTORIALS',
    tuHeroTitle: '25 部影片，帶你玩轉 RegMaster',
    tuHeroLead: '從建立活動到報到結算 —— 主辦方 20 部、報名者 5 部完整教學，隨選即看、自動接續下一部。',
    tuFilterAll: '全部 25 部',
    tuFilterHost: '主辦方（01–20）',
    tuFilterReg: '報名者（21–25）',
    tuRoleHost: '主辦方',
    tuRoleReg: '報名者',
    tuListHeader: '教學清單',
    tuSelectPrompt: '點左側（手機在下方）任一部開始觀看',
    tuSelectKicker: '尚未選擇影片',
    tuPrev: '上一部',
    tuNext: '下一部',
    tuWatch: '立即播放',
    tuBackToList: '回到清單',
    tuComingSoon: '英文版教學影片即將推出',
    tuComingSoonSub: '切換到「中文」即可立即觀看本部影片',
    tuEnBanner: '英文版影片陸續上架中；目前可切換中文觀看。',
    tuDownload: '下載本部影片'
  };

  var E = {
    dtTutorials: 'Video Tutorials · RegMaster',
    tuHeroEyebrow: 'VIDEO TUTORIALS',
    tuHeroTitle: 'Master RegMaster in 25 short videos',
    tuHeroLead: 'From creating an event to check-in and results — 20 organiser + 5 registrant tutorials. Watch any time; each one auto-continues to the next.',
    tuFilterAll: 'All 25',
    tuFilterHost: 'Organiser (01–20)',
    tuFilterReg: 'Registrant (21–25)',
    tuRoleHost: 'ORGANISER',
    tuRoleReg: 'REGISTRANT',
    tuListHeader: 'Tutorial list',
    tuSelectPrompt: 'Pick any video on the left (below on mobile) to start',
    tuSelectKicker: 'No video selected',
    tuPrev: 'Previous',
    tuNext: 'Next',
    tuWatch: 'Play now',
    tuBackToList: 'Back to list',
    tuComingSoon: 'English tutorial coming soon',
    tuComingSoonSub: 'Switch to 中文 to watch this video now',
    tuEnBanner: 'English videos are being added; switch to 中文 to watch now.',
    tuDownload: 'Download this video'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
