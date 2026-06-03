// =============================================================================
// RegMaster · I18N · Admin Events Scoring (judging / score entry / leaderboard)
// Page-scoped dictionary for /admin/events/scoring.html. Keys prefixed `aeScore`.
// Loaded immediately after /shared/i18n.js.
// =============================================================================
(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- document / breadcrumbs / header -----
    aeScoreDocTitle: '評分 · 主辦後台 · RegMaster',
    aeScoreCrumbHome: '主辦後台',
    aeScoreCrumbEvents: '活動',
    aeScoreCrumbThis: '評分',

    // ----- loading / errors -----
    aeScoreLoading: '載入評分資料⋯',
    aeScoreNoCompId: '未指定活動編號',

    // ----- leaderboard (left column) -----
    aeScoreLeaderboardTitle: '🏆 即時排行榜',
    aeScoreJudgePrefix: '您為評審：',
    aeScoreLeaderboardEmpty: '尚無報名隊伍',
    aeScoreJudgeUnit: ' 評審',
    aeScoreNoTeamName: '(無)',

    // ----- center column: empty state -----
    aeScoreSelectPrompt: '👈 從左側選擇隊伍開始評分',

    // ----- score entry -----
    aeScoreCriterionMaxPre: '最高 ',
    aeScoreTotalLabel: '總分',
    aeScoreSubmitBtn: '提交評分',
    aeScoreSubmittingBtn: '提交中⋯',
    aeScoreSubmittedBtn: '✓ 已提交',
    aeScoreCommentLabel: '評審評語（選填）',
    aeScoreCommentPlaceholder: '可寫給選手的建議⋯',

    // ----- submit feedback -----
    aeScoreFailPre: '失敗：'
  };

  var E = {
    // ----- document / breadcrumbs / header -----
    aeScoreDocTitle: 'Scoring · Organizer Console · RegMaster',
    aeScoreCrumbHome: 'Organizer Console',
    aeScoreCrumbEvents: 'Events',
    aeScoreCrumbThis: 'Scoring',

    // ----- loading / errors -----
    aeScoreLoading: 'Loading scoring data⋯',
    aeScoreNoCompId: 'No event ID specified',

    // ----- leaderboard (left column) -----
    aeScoreLeaderboardTitle: '🏆 Live Leaderboard',
    aeScoreJudgePrefix: 'You are judging as: ',
    aeScoreLeaderboardEmpty: 'No registered teams yet',
    aeScoreJudgeUnit: ' judges',
    aeScoreNoTeamName: '(none)',

    // ----- center column: empty state -----
    aeScoreSelectPrompt: '👈 Select a team on the left to start scoring',

    // ----- score entry -----
    aeScoreCriterionMaxPre: 'Max ',
    aeScoreTotalLabel: 'Total Score',
    aeScoreSubmitBtn: 'Submit Score',
    aeScoreSubmittingBtn: 'Submitting⋯',
    aeScoreSubmittedBtn: '✓ Submitted',
    aeScoreCommentLabel: 'Judge Comment (optional)',
    aeScoreCommentPlaceholder: 'Write feedback for the contestants⋯',

    // ----- submit feedback -----
    aeScoreFailPre: 'Failed: '
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
