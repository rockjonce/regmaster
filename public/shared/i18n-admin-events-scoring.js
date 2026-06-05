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
    aeScoreFailPre: '失敗：',

    // ===== Manager console (Phase A) =====
    // ----- console shell / tabs -----
    aeScoreConsoleTitle: '評分設定',
    aeScoreConsoleSub: '設定評分量表、評審分派與公平性規則',
    aeScoreTabRubric: '評分量表',
    aeScoreTabPanels: '評審組群 / 分派',
    aeScoreTabFairness: '公平性設定',
    aeScoreSaveBtn: '儲存設定',
    aeScoreSavingBtn: '儲存中⋯',
    aeScoreSavedToast: '評分設定已儲存',
    aeScoreSaveFail: '儲存失敗：',
    aeScoreWeightBlock: '有群組權重總和不等於 100%，請先修正再儲存。',

    // ----- rubric editor -----
    aeScoreRubricHint: '建立評分項目樹（最多三層：主項 → 細項 → 子細項）。同一層級的權重總和須為 100%。',
    aeScoreAddRoot: '＋ 新增主項目',
    aeScoreAddChild: '＋ 子項目',
    aeScoreNodeDelete: '刪除',
    aeScoreLabelPh: '項目名稱',
    aeScoreWeightLabel: '權重 %',
    aeScoreMaxLabel: '滿分',
    aeScoreRecordsLabel: '可量測次數',
    aeScoreAggRecLabel: '多次取值',
    aeScoreNormLabel: '正規化',
    aeScoreAggRecAvg: '平均',
    aeScoreAggRecMax: '最大',
    aeScoreAggRecMin: '最小',
    aeScoreAggRecLast: '最後一次',
    aeScoreNormNone: '無（原始÷滿分×100）',
    aeScoreNormLinear: '線性',
    aeScoreNormZscore: '標準分數 (z)',
    aeScoreNormTdist: 't 分布（預設）',
    aeScoreSumLabel: '本層合計',
    aeScoreRubricEmpty: '尚未建立任何評分項目。點「新增主項目」開始。',
    aeScoreLeafTag: '評分項',
    aeScoreBranchTag: '群組',

    // ----- panels -----
    aeScorePanelsHint: '未建立組群時，整個報名組別視為一個組群、所有被分派評審評全組；正規化與去極值以「組群內隊伍」為分布範圍。',
    aeScoreAddPanel: '＋ 新增組群',
    aeScorePanelLabelPh: '組群名稱',
    aeScorePanelGroupLabel: '報名組別',
    aeScorePanelGroupAny: '（不指定）',
    aeScorePanelJudgesLabel: '評審',
    aeScorePanelTeamsLabel: '負責隊伍',
    aeScorePanelDelete: '刪除組群',
    aeScorePanelNoJudges: '尚無可指派的評審成員。',
    aeScorePanelNoTeams: '此組別尚無隊伍。',
    aeScorePanelsEmpty: '尚未建立評審組群。',

    // ----- fairness -----
    aeScoreAggJudgesLabel: '跨評審合併方式',
    aeScoreAggJudgesAvg: '平均',
    aeScoreAggJudgesMax: '最大',
    aeScoreAggJudgesMin: '最小',
    aeScoreTrimLabel: '去極值（跨評審先去最高 + 最低再合併）',
    aeScoreSeeRegInfoLabel: '評審可看到報名者個資',
    aeScoreSeeRankingLabel: '評審可看到即時排名'
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
    aeScoreFailPre: 'Failed: ',

    // ===== Manager console (Phase A) =====
    // ----- console shell / tabs -----
    aeScoreConsoleTitle: 'Scoring Setup',
    aeScoreConsoleSub: 'Configure the rubric, judge assignments and fairness rules',
    aeScoreTabRubric: 'Rubric',
    aeScoreTabPanels: 'Panels / Assignment',
    aeScoreTabFairness: 'Fairness',
    aeScoreSaveBtn: 'Save Settings',
    aeScoreSavingBtn: 'Saving⋯',
    aeScoreSavedToast: 'Scoring settings saved',
    aeScoreSaveFail: 'Save failed: ',
    aeScoreWeightBlock: 'Some sibling group weights do not sum to 100%. Please fix before saving.',

    // ----- rubric editor -----
    aeScoreRubricHint: 'Build the scoring tree (up to 3 levels: section → item → sub-item). Sibling weights at each level must sum to 100%.',
    aeScoreAddRoot: '＋ Add Section',
    aeScoreAddChild: '＋ Sub-item',
    aeScoreNodeDelete: 'Delete',
    aeScoreLabelPh: 'Item name',
    aeScoreWeightLabel: 'Weight %',
    aeScoreMaxLabel: 'Max',
    aeScoreRecordsLabel: 'Measurable records',
    aeScoreAggRecLabel: 'Multi-record value',
    aeScoreNormLabel: 'Normalization',
    aeScoreAggRecAvg: 'Average',
    aeScoreAggRecMax: 'Maximum',
    aeScoreAggRecMin: 'Minimum',
    aeScoreAggRecLast: 'Last',
    aeScoreNormNone: 'None (raw ÷ max × 100)',
    aeScoreNormLinear: 'Linear',
    aeScoreNormZscore: 'Z-score',
    aeScoreNormTdist: 'T-distribution (default)',
    aeScoreSumLabel: 'Group total',
    aeScoreRubricEmpty: 'No scoring items yet. Click "Add Section" to start.',
    aeScoreLeafTag: 'Scored item',
    aeScoreBranchTag: 'Group',

    // ----- panels -----
    aeScorePanelsHint: 'With no panels, the entire registration group is treated as one panel; all assigned judges score the whole group. Normalization and trimming use the teams within the panel as the distribution range.',
    aeScoreAddPanel: '＋ Add Panel',
    aeScorePanelLabelPh: 'Panel name',
    aeScorePanelGroupLabel: 'Registration group',
    aeScorePanelGroupAny: '(unspecified)',
    aeScorePanelJudgesLabel: 'Judges',
    aeScorePanelTeamsLabel: 'Assigned teams',
    aeScorePanelDelete: 'Delete panel',
    aeScorePanelNoJudges: 'No assignable judge members yet.',
    aeScorePanelNoTeams: 'No teams in this group yet.',
    aeScorePanelsEmpty: 'No judging panels yet.',

    // ----- fairness -----
    aeScoreAggJudgesLabel: 'Cross-judge aggregation',
    aeScoreAggJudgesAvg: 'Average',
    aeScoreAggJudgesMax: 'Maximum',
    aeScoreAggJudgesMin: 'Minimum',
    aeScoreTrimLabel: 'Trim extremes (drop highest + lowest across judges before aggregating)',
    aeScoreSeeRegInfoLabel: 'Judges can see registrant personal info',
    aeScoreSeeRankingLabel: 'Judges can see the live ranking'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
