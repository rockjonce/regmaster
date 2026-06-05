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

    // ----- Phase B: rubric-driven judge UI -----
    aeScoreNoScorePerm: '無評分權限',
    aeScoreTeamListTitle: '評分隊伍',
    aeScoreDone: '已評分',
    aeScorePending: '未評分',
    aeScoreRecordNth: '第{n}次',
    aeScoreRegInfoLabel: '報名資料',
    aeScoreNoRubric: '尚未設定評分量表，請聯絡主辦方。',
    aeScoreSubmitHint: '提交後主辦方會跨隊正規化計分',

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
    aeScoreSeeRankingLabel: '評審可看到即時排名',

    // ===== Phase C: results / ranking tab =====
    aeScoreTabResults: '結果排名',
    aeScoreResGroupFilter: '組別檢視',
    aeScoreResOverall: '總排名',
    aeScoreResReload: '重新整理',
    aeScoreResRank: '名次',
    aeScoreResTeam: '隊伍',
    aeScoreResGroup: '組別',
    aeScoreResJudges: '評審數',
    aeScoreResTotal: '總分',
    aeScoreResUnjudged: '尚未評分',
    aeScoreResEmpty: '尚無評分結果。',
    aeScoreResNoBreakdown: '無細項',
    aeScoreLoadFail: '載入失敗',

    // ===== Phase D: statistics + box plot + export =====
    aeScoreTabStats: '統計分布',
    aeScoreStatsTableTitle: '各組別分數摘要',
    aeScoreStatN: 'n',
    aeScoreStatMean: '平均',
    aeScoreStatStd: '標準差',
    aeScoreStatMax: '最高',
    aeScoreStatMin: '最低',
    aeScoreStatMedian: '中位數',
    aeScoreBoxTitle: '盒鬚圖（各組別總分分布）',
    aeScoreBoxLegendBox: '盒：Q1–Q3',
    aeScoreBoxLegendMedian: '中位數',
    aeScoreBoxLegendWhisker: '鬚：最小–最大',
    aeScoreBoxLegendDot: '隊伍',
    aeScoreNoGroup: '（未分組）',
    aeScoreExportCsv: '匯出 CSV',
    aeScoreExportXlsx: '匯出 Excel',
    aeScoreExportSheetRaw: '原始分(各評審)',
    aeScoreExportSheetResults: '彙整結果',
    aeScoreExportDone: '已開始下載',
    aeScoreExportFail: '匯出失敗，請稍後再試。',
    aeScoreXlsxFallback: 'Excel 套件載入失敗，已改用 CSV。'
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

    // ----- Phase B: rubric-driven judge UI -----
    aeScoreNoScorePerm: 'No scoring permission',
    aeScoreTeamListTitle: 'Teams to score',
    aeScoreDone: 'Scored',
    aeScorePending: 'Pending',
    aeScoreRecordNth: 'Record {n}',
    aeScoreRegInfoLabel: 'Registration info',
    aeScoreNoRubric: 'No rubric has been configured. Please contact the organizer.',
    aeScoreSubmitHint: 'After you submit, the organizer normalizes scores across teams',

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
    aeScoreSeeRankingLabel: 'Judges can see the live ranking',

    // ===== Phase C: results / ranking tab =====
    aeScoreTabResults: 'Results',
    aeScoreResGroupFilter: 'Group view',
    aeScoreResOverall: 'Overall ranking',
    aeScoreResReload: 'Refresh',
    aeScoreResRank: 'Rank',
    aeScoreResTeam: 'Team',
    aeScoreResGroup: 'Group',
    aeScoreResJudges: 'Judges',
    aeScoreResTotal: 'Total',
    aeScoreResUnjudged: 'Not yet scored',
    aeScoreResEmpty: 'No results yet.',
    aeScoreResNoBreakdown: 'No breakdown',
    aeScoreLoadFail: 'Failed to load',

    // ===== Phase D: statistics + box plot + export =====
    aeScoreTabStats: 'Distribution',
    aeScoreStatsTableTitle: 'Per-group score summary',
    aeScoreStatN: 'n',
    aeScoreStatMean: 'Mean',
    aeScoreStatStd: 'Std. dev.',
    aeScoreStatMax: 'Max',
    aeScoreStatMin: 'Min',
    aeScoreStatMedian: 'Median',
    aeScoreBoxTitle: 'Box-and-whisker plot (total distribution per group)',
    aeScoreBoxLegendBox: 'Box: Q1–Q3',
    aeScoreBoxLegendMedian: 'Median',
    aeScoreBoxLegendWhisker: 'Whisker: min–max',
    aeScoreBoxLegendDot: 'Team',
    aeScoreNoGroup: '(ungrouped)',
    aeScoreExportCsv: 'Export CSV',
    aeScoreExportXlsx: 'Export Excel',
    aeScoreExportSheetRaw: 'Raw scores (per judge)',
    aeScoreExportSheetResults: 'Final results',
    aeScoreExportDone: 'Download started',
    aeScoreExportFail: 'Export failed, please try again.',
    aeScoreXlsxFallback: 'Excel library failed to load; exported CSV instead.'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
